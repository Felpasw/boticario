# 005 — Wi-Fi Insights (PLAN)

> Status: **planning only**. Decisões ficam aqui; execução vai pra `tasks.md`.

## 1. Objetivo

Fechar o produto do desafio: dashboard do dono da loja com KPIs, heatmap, timeseries, alerts contextuais e tabela de connections — alimentado por dados simulados via `POST /connections` (idempotente, com hash do MAC) e seed realista. Tudo autenticado pelo cookie de sessão do `004`.

## 2. Fluxo esperado end-to-end

### Dev / avaliador
1. `pnpm --filter api db:seed` cria admin
2. `pnpm --filter api db:seed:connections` popula ~8 semanas de dados realistas
3. Login em `/login` → redirect `/dashboard`
4. Dashboard renderiza KPIs + heatmap + timeseries + banner de alerts
5. User troca período (botões 7d/30d/90d/custom) → URL atualiza → queries re-fetch
6. Clica "Connections" na nav → tabela paginada por período
7. Logout → redirect login

### Ingest externo (simulação durante demo)
1. Script externo (curl/postman/httpie) faz `POST /connections` com cookie da sessão autenticada
2. Idempotency-Key previne duplicata se o cliente retentar
3. Resposta devolve `durationSeconds` calculado
4. Próximo refresh do dashboard mostra o novo dado agregado

## 3. Decisões técnicas (travadas)

### 3.1 Sem entidade `Store` — mono-loja por desafio — DECIDIDO

Opções:
- Multi-tenant com `storeId` em todas as rotas + seletor na UI
- `Store` 1:1 com User (owner tem 1 loja implícita, sem UI pra criar/trocar)
- Sem entidade `Store` — `Device`/`Connection` ancoram direto no `User`

Decisão: **sem `Store`**. O desafio é literal ("você é dono de uma loja" — singular). A entidade intermediária só adiciona módulo `stores/`, FK extra, resolver de store por request e cascade em cadeia — nada disso agrega valor pra UI do dashboard, que é a mesma com ou sem a entidade. Trade-off: evoluir pra multi-store exige migration + refactor (`userId` → `storeId`, extrair módulo, seletor na UI). Custo estimado ~1 dia pelo escopo contido, aceitável. Documentado como follow-up no README.

Consequências concretas:
- `User` ganha `devices: Device[]` + `connections: Connection[]` como relações inversas
- `Device.userId` + `@@unique([userId, macHash])` + index `(userId, lastSeenAt)`
- `Connection.userId` + index `(userId, connectedAt)`
- Zero módulo `stores/`, zero `StoresService`, zero `getStoreForUser`
- Idempotency key derivada: `${userId}:${macHash}:${connectedAt.toISOString()}`

### 3.2 Timezone global via env, não por entidade — DECIDIDO

Sem `Store`, não existe `store.timezone`. Opções:
- Timezone no `User` (futuro: user escolhe)
- Timezone global via env var

Decisão: **env var `APP_TIMEZONE`** com default `America/Sao_Paulo`, lido por um `TimezoneConfig` injetável (`@common/config/timezone.config.ts`). Faz single source nos SQLs com `AT TIME ZONE :tz`. Se multi-loja ou multi-user com timezones diferentes virar escopo depois, migra pra campo na entidade. Hoje não existe demanda.

### 3.3 Date range na URL, não em store — DECIDIDO

Opções:
- Zustand store (padrão money pra alguns dados globais)
- `useSearchParams` do Next (URL-based)

Decisão: **URL**. Rationale:
- Bookmarkable: "manda o link do dashboard com os últimos 7 dias" funciona
- Shareable: avaliador consegue reproduzir estado exato copiando URL
- Reset ao fechar aba (desejável — próximo acesso começa limpo)
- Zero store adicional pra manter em sync

Hook `useDateRange` encapsula leitura/escrita + default (últimos 30d) + validação (`to >= from`).

### 3.4 Alerts inline no `/metrics/summary`, não persistido — DECIDIDO

Confirmado na conversa. Função pura `alerts-evaluator.ts` recebe `(summary, prevSummary, heatmap)` → `Alert[]` (até 3, ordenado por severity). Zero tabela, zero cron, zero SSE. Preço: perde histórico de alerts — aceitável pro escopo.

### 3.5 Charts: Recharts — DECIDIDO

Bate com stack moderno Next + boa DX. Alternativas descartadas:
- `@nivo/*`: lib mais pesada, boa pra heatmap mas pior pra line
- Chart.js: imperativo demais em React
- D3 direto: overkill

Risco: Recharts não tem heatmap nativo. Mitigação: implementar heatmap via CSS Grid + cores manuais em `organisms/HeatmapChart.tsx` (dataset é 7×24 = 168 células, trivial).

### 3.6 Server Components + HydrationBoundary — DECIDIDO

Dashboard page é Server Component que faz prefetch com `queryClient.prefetchQuery` pros 3 endpoints de metrics (com defaults). Hidrata via `<HydrationBoundary state={dehydrate(queryClient)}>`. Client Component dentro consome via `useQuery` normalmente.

Benefício: primeira pintura já vem com dados do SSR, loading só aparece quando user muda período. Padrão oficial do TanStack Query v5 pro Next App Router.

### 3.7 Rate limit global — DECIDIDO

`@nestjs/throttler` como `APP_GUARD` adicional (compõe com AuthGuard):
- Default: 100 req/min por IP
- Override `POST /connections`: 1000/min
- Override `POST /auth/login`: 10/min (anti-brute-force — adicionado nessa fase, não no `004`)

### 3.8 Metrics calculation em SQL raw vs ORM — DECIDIDO: SQL raw

Agregações usando `prisma.$queryRaw` com SQL explícito pros benefícios:
- Controle fino de `AT TIME ZONE`
- Window functions e `percentile_cont` que Prisma não expõe nativamente
- Previsibilidade de performance

Testes de repository rodam com Testcontainers (Postgres real), dataset fixado no setup.

### 3.9 Idempotency key — DECIDIDO: header preferencial, derivado como fallback

- Se `Idempotency-Key` header presente → usa literal (cliente controla)
- Se ausente → `${userId}:${macHash}:${connectedAt.toISOString()}`
- Colisão de derivada = aceita (visita no mesmo segundo é edge case; se vir disconnectedAt atualizado, use-case faz update)

### 3.10 Variação vs. período anterior — DECIDIDO

Compara contra `[from - (to - from), from]`. Exemplos:
- `from=D-30, to=D` → compara com `[D-60, D-30]` (30d anteriores)
- `from=D-7, to=D` → compara com `[D-14, D-7]` (7d anteriores)

Resposta inclui tanto o valor atual quanto a `variation: { pct, direction: 'up' | 'down' | 'flat' }`.

### 3.11 Dwell mediana (não média) como KPI principal — DECIDIDO

Mediana é mais robusta a outliers (dispositivos esquecidos conectados overnight). Média exibida como secundária no tooltip. Outliers > 8h filtrados em ambas (floor-level sanitization no SQL).

### 3.12 Swagger — DECIDIDO: SIM

`@nestjs/swagger` em `/docs`. Pequeno custo, grande valor pro critério "qualidade da documentação" do desafio. Em prod, protegido pelo guard global (requer login) — por ora deixa aberto em dev.

## 4. Mapeamento de scopes de commit

| Área | Scope |
|---|---|
| Prisma schema (Device/Connection) + migrations | `feat(api):` |
| Módulos connections/, metrics/ | `feat(api):` |
| `TimezoneConfig` em `@common/config/` | `feat(api):` |
| Rate limit global via throttler | `feat(api):` |
| Shared schemas (connections + metrics + alerts) | `feat(shared):` |
| Seed de connections | `chore(api):` ou `feat(api):` |
| Swagger config | `feat(api):` ou `docs(api):` |
| Front — services, hooks, stores novos | `feat(web):` |
| Front — components (atoms/molecules/organisms/templates) | `feat(web):` |
| Front — páginas dashboard + connections | `feat(web):` |
| Playwright E2E | `test(web):` ou `feat(web):` |
| ADR (se houver — ex: SQL raw vs ORM, mono-loja) | `docs(repo):` |

## 5. Ordem de execução das tasks

```
BOT-32 (Prisma: Device+Connection + migration)
  └─ BOT-33 (shared: schemas Zod de connection + metrics — inclui dwell-distribution, top-recurring e split new/recurring da timeseries)
       └─ BOT-34 (api: devices repo + mac-hasher + idempotency-key-builder)
            └─ BOT-35 (api: register-connection use-case + POST /connections + rate limit override)
                 └─ BOT-36 (api: list-connections use-case + GET /connections paginated)
                      └─ BOT-37 (api: metrics-calculator + alerts-evaluator + period-resolver + TimezoneConfig — funções puras + config)
                           └─ BOT-38 (api: prisma-metrics.repository com SQL raw agregado — 5 métodos: summary, heatmap, timeseries com split, dwell-distribution, top-recurring)
                                └─ BOT-39 (api: 5 use-cases + GET /metrics/{summary,heatmap,timeseries,dwell-distribution,top-recurring})
                                     └─ BOT-40 (api: @nestjs/throttler global + override no login + swagger config)
                                          └─ BOT-41 (api: seed de connections realistas 8 semanas)
                                               └─ BOT-42 (web: connectionsService + metricsService + hooks — inclui useMetricsDwellDistribution + useMetricsTopRecurring + useDateRange)
                                                    └─ BOT-43 (web: atoms + molecules [KpiCard, AlertBanner, DateRangePicker, PaginationControls, DwellBucketBar, RecurringDeviceRow])
                                                         └─ BOT-44 (web: organisms [SummarySection, HeatmapChart, TimeseriesChart com 2 linhas, DwellDistributionChart, TopRecurringList, ConnectionsTable])
                                                              └─ BOT-45 (web: dashboard page com SSR prefetch — 5 queries prefetched + layout acomodando dwell + top recurring)
                                                                   └─ BOT-46 (web: connections page com paginação + filtro)
                                                                        └─ BOT-47 (web: Playwright E2E dashboard + connections — assert nos 5 widgets)
                                                                             └─ BOT-48 (ci: job e2e no workflow do 003)
```

17 tasks (BOT-32..BOT-48). Toda `[S]` — camadas se empilham. Dwell distribution + top recurring + split new/recurring entram expandindo as tasks de metrics (back + front) ao invés de virarem tasks dedicadas — mantém granularidade coerente de camada.

## 6. Bundles de commit sugeridos

- **Bundle A** (`feat(api): add device and connection models`): BOT-32 + BOT-33
- **Bundle B** (`feat(api): add connection ingestion with mac hashing`): BOT-34 + BOT-35
- **Bundle C** (`feat(api): add connections listing with pagination`): BOT-36
- **Bundle D** (`feat(api): add metrics endpoints with inline alerts`): BOT-37 + BOT-38 + BOT-39
- **Bundle E** (`feat(api): add rate limiting and swagger docs`): BOT-40
- **Bundle F** (`chore(api): seed realistic 8-week connection dataset`): BOT-41
- **Bundle G** (`feat(web): add services and hooks for connections and metrics`): BOT-42
- **Bundle H** (`feat(web): add dashboard atomic components`): BOT-43 + BOT-44
- **Bundle I** (`feat(web): add dashboard page with ssr prefetch`): BOT-45
- **Bundle J** (`feat(web): add connections page`): BOT-46
- **Bundle K** (`test(web): add playwright e2e for dashboard flow`): BOT-47 + BOT-48

11 bundles / 11 PRs. Granularidade boa pra review incremental.

## 7. Riscos arquiteturais

### 7.0 Split new/recurring e top-recurring com joins mais pesados

As queries novas puxam mais trabalho que as anteriores:
- **Timeseries com split**: precisa join com `device.firstSeenAt` pra classificar cada bucket, custo ~2x da timeseries simples
- **Top recurring**: `GROUP BY deviceId + ORDER BY visitCount DESC LIMIT N` com `HAVING COUNT(*) >= 2` — ok se index `(userId, connectedAt)` cobrir, mas pode degradar se dataset crescer muito

Mitigação:
- Benchmark no dataset seedado (~8 semanas) — meta < 300ms por rota
- Se virar gargalo depois, materializar view diária `device_daily_visits` (fora do escopo deste spec)
- `top-recurring` com `limit` default 10 e max 50 segura o pior caso

### 7.1 Timezone bug nas agregações

SQL `EXTRACT(DOW FROM connectedAt AT TIME ZONE :tz)` — se esquecer `AT TIME ZONE`, visita 23h BRT (02h UTC do dia seguinte) aparece no weekday errado. Mitigação: `TimezoneConfig` como ponto único; todo query de agregação testada com dataset que tem visita cruzando meia-noite BRT; teste quebra se tz esquecido.

### 7.2 Dataset de teste pra queries de agregação

Testar `GROUP BY weekday × hour` precisa de dataset com dados em múltiplas horas e dias. Mitigação: fixture determinística em `apps/api/test/fixtures/connections-seed.ts` com 100 conexões cobrindo os 7 dias × algumas horas. Reusado em testes de repository e e2e de metrics.

### 7.3 HeatmapChart custom sem lib

Risco: implementação em CSS Grid pode ficar feia / não acessível. Mitigação: usar `@tanstack/react-table` + células coloridas por intensidade, ARIA roles, testável via Testing Library. Benchmark antes de BOT-44: se feio, troca pra `@nivo/heatmap`.

### 7.4 SSR + HydrationBoundary complexo

Pode ter edge cases com queries parametrizadas pela URL (defaults no server vs params no client). Mitigação:
- Server Component usa defaults (últimos 30d) pro prefetch
- Client reconcilia via `useQuery` com `queryKey` refletindo URL params
- Mismatch → segundo fetch no client (penalidade pequena, não quebra)

### 7.5 Playwright no CI com Postgres

E2E precisa do web + api + Postgres rodando. Mitigação: job `e2e` no CI do `003` sobe o docker-compose, roda `pnpm db:migrate` + `db:seed` + `db:seed:connections`, inicia api + web em background, roda Playwright.

### 7.6 Seed de connections com `faker.seed(42)`

Determinismo quebra se `faker` mudar implementação interna de random. Mitigação: pinnar versão exata; teste do seed valida contagem total (± tolerância pequena).

### 7.7 Rate limit anti-brute-force em `/auth/login`

Aplicar em prod via `@nestjs/throttler` global com override 10/min. Risco: usuário legítimo esquecendo senha é bloqueado. Mitigação: janela curta (1 min) e override razoável.

### 7.8 Débito de refactor pra virar multi-store

Documentado e aceito. Lista de mudanças pra evoluir:
- Migration: `ALTER TABLE device/connection RENAME COLUMN user_id TO store_id` + nova tabela `store`
- Backfill: criar 1 `Store` por `User` existente, popular FK
- Extrair módulo `stores/` com `StoresService`
- Trocar `@CurrentUser()` → resolver de store ativo (header/path/seletor)
- UI: seletor na nav + persistência da seleção

Custo estimado ~1 dia. Risco de retrabalho aceito pelo escopo mono-loja do desafio.

## 8. Fora do escopo deste spec

- Entidade `Store` / multi-store / troca de loja na UI
- Simulador `/connections/simulate` (cortado — seed basta)
- SSE / sininho em tempo real
- Export CSV/Excel
- Dashboard de admin pra configurar thresholds
- Fiscal, pagamentos
- Sweep de connections antigas (deferred)
- Dashboard mobile dedicado (responsivo basta)
- Insights textuais via LLM (determinístico via `alerts-evaluator` basta)

## 9. Tasks breakdown proposal (vai pro `tasks.md`)

BOT-32..BOT-48, 17 tasks. Detalhamento no `tasks.md`.

## 10. Próximo passo

Validar `tasks.md`, abrir branch `BOT-32/felpa-wifi-prisma-models`, começar pela Bundle A.
