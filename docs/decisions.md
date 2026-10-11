# Decisões de arquitetura — Wi-Fi Insights

Resumo das escolhas não-óbvias do projeto. Cada item responde "por que
assim e não de outro jeito" para o próximo dev que abrir o repo. Decisões
menores ficam implícitas no código; o que está aqui é o que custaria
tempo pra reverter se mudasse de ideia depois.

> Convenção: decisões de arquitetura de granularidade maior (que mudariam
> contrato público ou impactariam várias features) viram ADR em
> `docs/adr/NNNN-titulo.md`. Este arquivo é o resumo executivo.

---

## 1. Monorepo pnpm workspace (`apps/*` + `packages/*`)

**Decisão**: `apps/api` (NestJS) e `apps/web` (Next.js) coabitam o mesmo
repo, com `packages/shared` publicando schemas Zod consumidos pelos dois.

**Por quê**: o contrato request/response (login, metrics, connections)
tem que casar — se o backend muda a shape e o frontend não acompanha,
quebra em runtime. Compartilhar os schemas via workspace garante que um
rename em `shared/schemas/metrics.ts` dispara erro de typecheck em quem
não migrou. Sem monorepo isso exige publicar pacote NPM a cada mudança
ou copiar tipos manualmente.

**Trade-off**: um `pnpm install` baixa deps dos dois apps mesmo quando o
dev só vai mexer no front; é tolerável no tamanho atual.

---

## 2. Clean Architecture no backend (ports/adapters)

**Decisão**: cada módulo Nest segue `domain/` (regras puras + ports) →
`application/use-cases/` → `infrastructure/` (adapters Prisma, HTTP, etc)
→ `controllers`. Repositórios são injetados por `Symbol` token
(`METRICS_REPOSITORY`, `DEVICES_REPOSITORY`), não por classe concreta.

**Por quê**: libera testar lógica de negócio sem subir Postgres (use-case
+ repo fake), e permite trocar Prisma por outro ORM sem tocar
use-case/controller. Também força a disciplina de não vazar `prisma.*`
pra fora do adapter.

**Trade-off**: boilerplate (duas interfaces + impl + token + binding no
module por repositório). Para um CRUD trivial seria overkill; aqui compensa
porque os use-cases de métricas têm lógica real (resolve período, calcula
variação, dispara alertas).

---

## 3. Shared Zod schemas como fonte única da verdade

**Decisão**: todo contrato público (`LoginRequest`, `SummaryResponse`,
`ConnectionView`, etc) vive em `packages/shared/src/schemas/`. O tipo TS
é inferido do schema (`z.infer<...>`), nunca duplicado como `interface`.

**Por quê**: um só lugar define forma + validação. Backend valida input
com `ZodValidationPipe` e output pelo type-check; frontend consome o tipo
diretamente. Rename de campo quebra typecheck nos dois lados.

**Trade-off**: Zod no bundle do frontend (overhead pequeno). Compensa
pelo zero drift entre as pontas.

---

## 4. MAC address com HMAC-SHA256 + nunca persistido raw

**Decisão**: `POST /connections` recebe `macAddress` em claro, mas o
backend aplica `hashMac(mac, MAC_HASH_SECRET)` imediatamente e só grava o
hash. O MAC original jamais toca o banco nem o log.

**Por quê**: MAC é identificador que persiste entre visitas (natureza
"customer id" permanente), então é PII sensível. Hash determinístico
preserva a utilidade analítica ("este device já apareceu") sem reter o
identificador original. Mudar `MAC_HASH_SECRET` zera a correlação com
dados anteriores — útil pra rotação ou pra invalidar o dataset se o
secret vazar.

**Trade-off**: perdeu-se a capacidade de reverter o hash pra investigar
um device específico. É o ponto — não deveria ser possível.

---

## 5. `POST /connections` autenticado por `X-Ingest-Key` (não por cookie)

**Decisão**: a rota de ingestão é marcada `@Public()` e usa um guard
dedicado (`IngestKeyGuard`) que valida o header `X-Ingest-Key` contra a
env `INGEST_API_KEY` em tempo constante (`timingSafeEqual`). O dono das
conexões é resolvido via `INGEST_USER_EMAIL`. Rotas de leitura
(`GET /connections`, `/metrics/*`) seguem no `AuthGuard` por cookie.

**Por quê**: no cenário real do produto, o emissor dos eventos é um
roteador na loja — não um humano no navegador. Exigir cookie de sessão
fecha a porta pra integração realista. Chave compartilhada por env
resolve o fluxo (produção manda `X-Ingest-Key: <secret>`), permite
rotação por restart e mantém zero superfície adicional (sem tabela, sem
CRUD, sem UI). O cenário mono-loja justifica a chave única.

**Trade-off**: compromisso da chave compromete todo o ingest. Mitigado
pelo escopo (um dono, um dispositivo conceitual) e documentado em
`docs/adr/0002-ingest-authentication.md` como follow-up a migrar pra
tabela `ApiKey` quando o produto escalar.

---

## 6. Idempotency key: header preferencial, derivada como fallback

**Decisão**: `POST /connections` aceita `Idempotency-Key` no header; se
ausente, deriva `${userId}:${macHash}:${connectedAt.toISOString()}`.
Reenvio devolve 200 com o mesmo registro.

**Por quê**: ingest Wi-Fi real tem retries de rede (mobile desconecta e
reconecta, roteador reenvia evento). Sem idempotency a mesma visita
contaria N vezes e inflaria todos os KPIs. A chave derivada cobre o caso
em que o cliente HTTP não controla o header (ex: scripts simples); a
header manual cobre casos onde o cliente quer forçar unicidade por outro
critério (ex: id de evento do roteador).

---

## 7. Postgres `timestamptz` (não `timestamp` naive)

**Decisão**: `Device.firstSeenAt/lastSeenAt` e `Connection.connectedAt/
disconnectedAt/createdAt` são `@db.Timestamptz(3)` no Prisma.

**Por quê**: Prisma por padrão emite `timestamp without time zone`, e
`AT TIME ZONE 'America/Sao_Paulo'` em cima de um timestamp naive faz o
inverso do esperado (soma 3h em vez de subtrair). Isso quebra o heatmap
e o `GROUP BY weekday` — bug real que apareceu quando o seed começou a
mostrar visitas às 2h da manhã numa loja aberta das 9h às 21h. Com
`timestamptz` o Postgres sabe o fuso e a conversão fica correta.

---

## 8. SQL raw (`$queryRaw` + `to_char`) nos repositórios de métrica

**Decisão**: `PrismaMetricsRepository` e `PrismaConnectionsRepository`
usam `$queryRaw` com SELECTs explícitos, inclusive para cálculo de
mediana (`PERCENTILE_CONT`), window functions (`new vs recurring`), e
conversão de `timestamptz` para string ISO via `to_char(... AT TIME ZONE
'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`.

**Por quê**: Prisma Client não expõe `PERCENTILE_CONT`, `DATE_TRUNC AT
TIME ZONE` nem retorno de string tipada. Raw SQL evita o anti-pattern
de puxar linhas pro Node e agregar em JS (que não escala). Já que a
query é raw, o `to_char` resolve o Date→ISO string direto no banco e
elimina qualquer mapper no caminho.

**Trade-off**: perde o type-safety de `prisma.connection.findMany`.
Compensado por anotar o retorno (`$queryRaw<ConnectionRow[]>`) e por
cobrir cada query com teste de integração.

---

## 9. Agregação no backend; frontend consome shape direto (property-direct)

**Decisão**: nada de `.map(x => ({ ...x, campo: outro }))` ou
`.reduce((acc, x) => acc + x.v, 0)` no frontend. Se a UI mostra "média
X", a resposta do backend já traz `avgX`. Componentes recebem o tipo do
`shared` como prop (sem view-model espelho).

**Por quê**: a regra evita duas fontes de verdade (quando precisamos
expor o mesmo número por outro canal — API para outro cliente,
dashboard interno, etc, não dá pra divergir). Também concentra os
testes de agregação num só lugar (use-case + SQL), não espalhado em
reducers que acompanham cada tela. Formatação de apresentação
(`Intl.NumberFormat`, "há 3h", `#a3f0…c812`) é a única exceção — isso
mora em `apps/web/src/utils/formatters.ts`.

---

## 10. Sessão cookie-based + argon2 (não JWT)

**Decisão**: autenticação é cookie HttpOnly contendo o id da sessão
(gerado por `randomUUID`), com registro na tabela `Session`. Senha
hasheada com argon2id.

**Por quê**: dashboard roda num domínio único (web + api em subdomínio
ou proxy), não precisa do apelo stateless do JWT. Em troca ganha-se
revogação instantânea (deletar linha em `Session`) e nada de dor com
`exp` + refresh. Argon2 é o padrão de 2015+ (resistente a GPU/ASIC);
bcrypt serviria mas não há motivo pra escolher o mais antigo em
greenfield.

**Trade-off**: toda rota autenticada consulta `Session` → `User` no DB.
Mitigado por renovar o cookie preguiçosamente (só nos últimos 24h de
validade) e por índice em `Session.id` + `expiresAt`.

---

## 11. `ThrottlerGuard` antes do `AuthGuard`

**Decisão**: no `AppModule.providers`, `APP_GUARD` ThrottlerGuard aparece
antes do AuthGuard. Nest executa guards em ordem de registro.

**Por quê**: throttle precisa decidir ANTES de pagar o custo de validar
cookie + buscar sessão + buscar user. Se o auth viesse antes, um
atacante com cookie velho consumiria DB a cada request só pra terminar
em 429. Com throttle primeiro, bloqueio é O(1) em memória.

---

## 12. Rate limit: default 100/min, login 10/min, ingest 1000/min

**Decisão**: `ThrottlerModule` global com 100/min por IP; override via
`@Throttle` em `POST /auth/login` (10/min, defesa anti brute-force) e em
`POST /connections` (1000/min, folga pra rajadas de ingest).

**Por quê**: threat model diferente por rota. Login é alvo clássico de
dicionário — 10 tentativas/minuto já é generoso pra humano real.
Ingest é ponto de pressão legítimo (loja cheia, muitos devices conectando
simultaneamente), um teto baixo demais machucaria o produto. Rotas de
leitura (`/metrics/*`) ficam no default 100/min — a loja real tem
unidades de usuários, nunca chegaria perto.

---

## 13. Hooks como classes + fixture pattern (`class.use()`)

**Decisão**: hooks no frontend são classes implementando interface, com
método `.use(params)` que chama todos os TanStack hooks em ordem fixa.
Export default é a instância (`metricsSummaryHooks`).

**Por quê**: pattern reusa a convenção que o dev já usa em outros
projetos (money-assistance); facilita mock em teste (substituir
`metricsService` passado pro service); interface descreve o shape de
retorno, útil pra autocompletion. ESLint reclama de `use` dentro de
classe (acha que é component), suprimido com `eslint-disable
react-hooks/rules-of-hooks` + comment explicando que `use()` é chamado
em render, não condicional.

---

## 14. `useDateRange` com defaults memorizados no mount

**Decisão**: valores padrão de `from`/`to` são computados em
`useMemo(() => ({...}), [])` com deps vazias.

**Por quê**: sem isso, `new Date().toISOString()` muda a cada render,
query keys do TanStack mudam, hooks re-fetcham, componente re-renderiza
→ loop infinito (chegamos a ~4k requests em segundos no dev). O
`useMemo` com `[]` congela o default por mount. Mudança explícita de
período (via picker ou shortcut) escreve na URL, que é a nova
single-source-of-truth.

---

## 15. Skeleton loading em vez de "empty → populated"

**Decisão**: cada componente de métrica renderiza `<Skeleton />` com
`animate-pulse` enquanto `data === undefined`.

**Por quê**: UX de dashboard que vai de "visitas: 0" pra "visitas: 2.837"
cria flicker e confunde quem olha. Skeleton comunica "está carregando",
não "está vazio".

---

## 16. Playwright em vez de Cypress

**Decisão**: suite E2E em Playwright com project chromium.

**Por quê**: trace viewer vem de graça (Cypress exige o cloud pago),
multi-browser nativo (webkit + firefox se precisar), footprint menor em
monorepo, convenção atual nos times grandes. Pro escopo do challenge
(login + dashboard assertion) qualquer um serviria — Playwright só
custou mais pontos no CI.

---

## 17. CORS + cookie cross-origin resolvido via `withCredentials`

**Decisão**: `app.enableCors({ credentials: true })` no backend;
`axios.create({ withCredentials: true })` no frontend; cookie com
`sameSite: 'lax'` em dev.

**Por quê**: web em `localhost:3000` e api em `localhost:3333` são
origens diferentes pro browser. Sem `credentials: true` dos dois lados
o cookie de sessão nem sai no fetch, nem é aceito na response. Em prod
atrás do mesmo domínio (proxy) isso fica transparente, mas em dev
precisa ser explícito.

