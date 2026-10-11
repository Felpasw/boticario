# Boticario — Wi-Fi Insights

Dashboard que dá ao dono de uma loja Boticário visibilidade sobre os visitantes que se conectam ao Wi-Fi de cortesia. Os dados são simulados via um endpoint de ingestão (sem integração real com roteador) e transformados em métricas acionáveis: quando a loja enche, quem volta, quanto tempo fica, como a semana está trendando, e alertas automáticos quando algo foge do normal.

Este documento é o **product brief inicial**. Serve pra guiar a quebra do trabalho em fases (`specs/NNN-slug/`) e alinhar decisões antes de começar a codar.

## 🚀 App no ar

Deploy ativo rodando numa VPS, pronto pra avaliar sem precisar subir local:

| O que                | Endereço                                                                 |
| -------------------- | ------------------------------------------------------------------------ |
| 🖥️ Dashboard (web)   | http://15.204.244.117:3000                                               |
| 🔌 API               | http://15.204.244.117:3333                                               |
| 📘 Swagger UI        | http://15.204.244.117:3333/docs                                          |
| ❤️ Health            | http://15.204.244.117:3333/health                                        |

**Credenciais pra login no dashboard**:

- **Email**: `admin@boticario.local`
- **Senha**: `change-me-dev`

Pra testar o endpoint de ingestão autenticado via API key:

```sh
curl -X POST http://15.204.244.117:3333/connections \
  -H "Content-Type: application/json" \
  -H "X-Ingest-Key: change-me-dev-ingest-key" \
  -d '{"macAddress":"AA:BB:CC:DD:EE:01","connectedAt":"2026-10-11T12:00:00.000Z","disconnectedAt":"2026-10-11T12:15:00.000Z"}'
```

> **📘 Docs complementares**:
> - [`docs/rodando.md`](docs/rodando.md) — guia prático de setup e testes
> - [`docs/decisions.md`](docs/decisions.md) — justificativas das escolhas arquiteturais
> - [`docs/ia-workflow.md`](docs/ia-workflow.md) — como o projeto é tocado com IA (spec/plan/tasks)

---

## 1. Visão de produto

O dono não deveria ter que olhar dado cru. O dashboard responde cinco perguntas diretamente e dispara um alerta quando algo merece atenção:

| Pergunta do dono                       | Métrica                                                   | Decisão que suporta                     |
| -------------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| Quando a loja enche?                   | Visitas por hora e por dia da semana (heatmap)            | Escala de equipe                        |
| Os clientes voltam?                    | Visitantes novos vs. recorrentes                          | Ações de retenção                       |
| Quanto tempo eles ficam?               | Dwell médio/mediano                                       | Engajamento, layout, atendimento        |
| O movimento está crescendo?            | Tendência semanal e variação vs. período anterior         | Avaliar campanhas                       |
| Algo fora do padrão aconteceu?         | Alertas automáticos inline no endpoint de summary         | Reagir rápido sem olhar o painel o dia  |

**Não é** um CRM, não é um PDV, não é um e-commerce. **É** um painel de visibilidade sobre eventos de conexão Wi-Fi de visitantes, construído como estudo de caso técnico.

---

## 2. Público-alvo

- Um dono de loja único consultando o painel do desktop ou do celular. O enunciado do desafio é explícito: _"você é o dono de **uma** loja"_.
- Sem camada SaaS multi-tenant e **sem entidade `Store`** — `Device` e `Connection` ancoram direto em `User`. Escalar pra multi-loja é um follow-up documentado (migration + refactor, ~1 dia), não algo que o MVP paga adiantado.

---

## 3. Pilares do produto

### 3.1. Ingestão

- `POST /connections` registra um evento de conexão (`macAddress`, `connectedAt`, `disconnectedAt` opcional). Autenticado por header `X-Ingest-Key` (shared secret via env), não por cookie — o emissor típico é um roteador na loja, não um humano logado. O dono das conexões é resolvido pela env `INGEST_USER_EMAIL`.
- MAC nunca persiste — só `HMAC-SHA256(mac, MAC_HASH_SECRET)`. O hash permite identificar devices recorrentes sem armazenar o identificador original.
- Idempotente via header `Idempotency-Key` (ou derivado de `userId + macHash + connectedAt`).
- Dataset realista de ~8 semanas é produzido via `pnpm --filter api db:seed:connections` em vez de um simulador dentro da API.

### 3.2. Analytics

Calculadas sob demanda via SQL com o timezone configurado (`AT TIME ZONE :tz`, resolvido da env var `APP_TIMEZONE`, default `America/Sao_Paulo`):

- `GET /connections?from=&to=&page=&perPage=` — listagem crua paginada por período
- `GET /metrics/summary?from=&to=` — KPIs do período, variação vs. período anterior, alertas inline
- `GET /metrics/heatmap?from=&to=` — matriz dia-da-semana × hora
- `GET /metrics/timeseries?from=&to=&granularity=day|week` — série temporal

Funções puras pra cálculo de métricas vivem dentro do módulo `metrics` e são testadas isoladas. A janela de comparação do período anterior é `[from - (to - from), from]`.

### 3.3. Alertas

Avaliados inline no `GET /metrics/summary` por uma função pura (`alerts-evaluator.ts`). Até 3 alertas por response, ordenados por severidade (warning > info > success). Sem tabela, sem cron, sem SSE — zero persistência.

| Tipo              | Trigger                                                                           | Severidade |
| ----------------- | --------------------------------------------------------------------------------- | ---------- |
| `TRAFFIC_PEAK`    | Célula weekday × hora acima do p95 da matriz                                      | `info`     |
| `LOW_TRAFFIC_DAY` | Um weekday específico 30%+ abaixo da média do mesmo weekday em janelas anteriores | `warning`  |
| `NEW_RECORD`      | Visitas do período atual acima de todas as janelas equivalentes anteriores        | `success`  |
| `TREND_UP`        | Variação acima de +15%                                                            | `success`  |
| `TREND_DOWN`      | Variação abaixo de -15%                                                           | `warning`  |

O front renderiza como banner no topo do dashboard.

### 3.4. Autenticação

Baseada em sessão com cookie `HttpOnly SameSite=Lax Secure`. Senha hasheada com `argon2id`. Store de sessão vive em **Postgres** (tabela `sessions`) — zero Redis na stack. Logout invalida a linha de sessão imediatamente.

### 3.5. Seed

`pnpm --filter api db:seed` cria o admin. `pnpm --filter api db:seed:connections` popula ~8 semanas de conexões com padrões realistas (picos de almoço e saída, sábado mais pesado, domingo mais leve, ~35% recorrentes, dwell de 5–40 min). Determinístico via `faker.seed(42)` pra que runs repetidas produzam o mesmo dataset.

---

## 4. Requisitos funcionais principais

- Cadastro / login (email + senha, sessão por cookie)
- Página de dashboard: seletor de período (7d/30d/90d/custom), cards de KPI com variação, heatmap, gráfico de tendência, banner de alertas
- Página de connections: tabela paginada com filtro de período + estados de loading / vazio / erro
- Todos os componentes de data-fetching têm estados explícitos de **loading / empty / error**
- Endpoint de ingestão protegido por auth (dono só ingere pra si mesmo — nenhum caminho de cross-user existe)
- Rate limit em `POST /connections` (1000 req/min por IP para rajadas da demo) e `POST /auth/login` (10/min para defesa anti brute-force)

---

## 5. Requisitos não-funcionais

- **TypeScript strict** em todo pacote.
- **TDD obrigatório** pra todo módulo de produção: unit tests nas métricas e regras de alerta, integration tests nos repositórios (Testcontainers), E2E no fluxo crítico do dashboard (Playwright).
- **Performance:** first paint do dashboard < 2 s em banda larga; queries de analytics < 300 ms no servidor no volume do seed.
- **Tratamento de erro:** envelope de erro padronizado em toda response; error boundary por seção do dashboard pra que um bloco quebrado não mate a página.
- **Privacidade / LGPD:** MAC nunca persistido (só o hash HMAC); PII (email) nunca em linha de log.
- **Acessibilidade:** contraste AA, labels nos controles, navegação por teclado.
- **i18n:** pt-BR como default; strings não hardcoded dentro de componentes.

---

## 6. Stack técnica

### Frontend (`apps/web/`)

- **Next.js** (App Router), TypeScript strict
- Estado remoto: **TanStack Query**
- Forms: **React Hook Form + Zod** (schemas compartilhados via `packages/shared`)
- UI: **Tailwind + shadcn/ui**
- Charts: **Recharts** (heatmap custom em CSS Grid)
- Testes: **Vitest + Testing Library** (unit/integration) + **Playwright** (E2E)

### Backend (`apps/api/`)

- **NestJS** rodando em Node 20, TypeScript strict
- **Postgres 16** via **Prisma** (schema como fonte da verdade)
- **Argon2** pra hash de senha + sessão por cookie + store de sessão em Postgres
- Rate limit via **`@nestjs/throttler`**
- Docs via **`@nestjs/swagger`** em `/docs`
- Logs: estruturados via logger do Nest com contexto
- Testes: **Vitest** + **`@nestjs/testing`** + **supertest**

### Shared (`packages/shared/`)

- DTOs, schemas Zod, constantes enum compartilhados entre `api` e `web`
- Uso interno (não publicado em registry)

### Infra

- Monorepo com **pnpm workspaces**: `apps/api`, `apps/web`, `packages/shared`
- Local: **docker-compose** com Postgres 16 (zero Redis)
- CI: **GitHub Actions** com jobs paralelos (lint, typecheck, test, build, commitlint; E2E Playwright no `005`)
- Automação de release: **release-please** por pacote (`apps/api`, `apps/web` apenas; `packages/shared` é interno)
- Deploy: **Vercel** (web) + **Fly.io / Railway standard** (api) + **Neon** (Postgres). Como não há processo cron, always-on não é hard requirement — mas ainda recomendado por causa de latência de cold-start.

---

## 7. Layout do repositório

```
boticario/
  apps/
    api/                  # NestJS (só HTTP — sem crons, sem workers)
      src/
        @common/
          config/         # TimezoneConfig
          infrastructure/ # filters, pipes, interceptors
        auth/
        connections/
        metrics/
        main.ts
      prisma/
      test/
      CHANGELOG.md
      package.json
    web/                  # Next.js App Router
      src/
        app/
        components/
        hooks/            # TanStack Query wrappers
        services/         # axios clients
      e2e/                # Playwright
      CHANGELOG.md
      package.json
  packages/
    shared/               # DTOs + schemas Zod + enums
      src/
      package.json
  specs/
    000-product-brief/
    001-release-management/
    002-bootstrap/
    003-ci-pipeline/
    004-auth/
    005-wifi-insights/
      spec.md             # o quê
      plan.md             # o como
      tasks.md            # itens executáveis BOT-N
  docs/
    adr/                  # Architecture Decision Records
    decisions.md          # resumo executivo das decisões
    rodando.md            # setup e testes
    ia-workflow.md        # fluxo spec-driven com IA
  .github/
    workflows/            # ci.yml, release-please.yml, commitlint.yml
    pull_request_template.md
    CODEOWNERS
  release-please-config.json
  .release-please-manifest.json
  commitlint.config.mjs
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  README.md
```

---

## 8. Modelo de dados (esboço inicial)

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  createdAt    DateTime  @default(now())
  sessions     Session[]
  devices      Device[]
  connections  Connection[]
}

model Session {
  id        String   @id          // id opaco da sessão, armazenado no cookie
  userId    String
  createdAt DateTime @default(now())
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([expiresAt])
}

model Device {
  id          String   @id @default(uuid())
  userId      String
  macHash     String   // HMAC-SHA256(mac, MAC_HASH_SECRET); MAC cru nunca armazenado
  firstSeenAt DateTime
  lastSeenAt  DateTime
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  connections Connection[]
  @@unique([userId, macHash])
  @@index([userId, lastSeenAt])
}

model Connection {
  id              String    @id @default(uuid())
  userId          String
  deviceId        String
  connectedAt     DateTime
  disconnectedAt  DateTime?
  durationSeconds Int?
  idempotencyKey  String    @unique
  createdAt       DateTime  @default(now())
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  device          Device    @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  @@index([userId, connectedAt])
  @@index([deviceId, connectedAt])
}
```

Mono-loja por desenho do desafio — sem entidade `Store`. Ver §9 "Evolução multi-loja" abaixo pro caminho de upgrade documentado.

---

## 9. Evolução multi-loja (follow-up, não no MVP)

Escalar o modelo pra multi-loja é uma migração pequena e bem compreendida:

1. Adicionar entidade `Store` com `ownerId`, `name`, `timezone`.
2. Migration: `ALTER TABLE device/connection RENAME COLUMN user_id TO store_id` + backfill nullable.
3. Criar uma `Store` por `User` existente, popular FKs, dropar nullable.
4. Extrair módulo `apps/api/src/stores/` com `StoresService.getStoresForOwner`.
5. Resolver a loja ativa por request (header, path param ou seletor na UI).
6. UI: seletor de loja na nav + persistência da seleção.

Esforço estimado: ~1 dia. Deliberadamente fora de escopo pro MVP do desafio.

---

## 10. Roadmap

Ordem das fases (detalhe completo em cada `specs/NNN-slug/`):

- **001-release-management** — release-please + commitlint + husky. **Prioridade zero**: cada commit a partir daqui alimenta o auto-changelog.
- **002-bootstrap** — esqueleto do monorepo: pnpm workspaces, `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`, docker-compose Postgres, Prisma init, tsconfig/eslint/prettier base.
- **003-ci-pipeline** — GitHub Actions: lint, typecheck, test, build, commitlint em jobs paralelos a cada PR e push na `main`.
- **004-auth** — users, sessions, auth por cookie, endpoints e páginas de login/register/logout.
- **005-wifi-insights** — `Device`, `Connection`, ingestão, endpoints de métrica com alertas inline, página de dashboard, seed, Playwright E2E.

Cada fase começa com testes antes do código (regra do TDD).

---

## 11. Setup local (resumo)

Guia completo em [`docs/rodando.md`](docs/rodando.md). TL;DR:

```sh
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

docker compose up -d                            # Postgres (porta 5434)
pnpm install
pnpm --filter api db:migrate                    # aplica migrations
pnpm --filter api db:seed                       # cria admin
pnpm --filter api db:seed:connections           # popula ~5k conexões
pnpm dev                                        # API + web em paralelo
```

- Web: http://localhost:3000
- API: http://localhost:3333
- Swagger: http://localhost:3333/docs
- Login default: `admin@boticario.local` / `change-me-dev`

---

## 12. Testes

Três suites, todas ligadas no workflow `ci`:

```sh
pnpm test                           # unit (shared + api + web via vitest)
pnpm --filter api test:e2e          # api integration (NestJS supertest + Postgres)
pnpm --filter web e2e               # browser e2e (Playwright chromium)
```

Playwright guarda trace, screenshot e vídeo em caso de falha debaixo de `apps/web/test-results/`; o job no CI faz upload como artifact `playwright-report` pra que uma run vermelha seja sempre inspecionável a partir do PR.

---

## 13. Convenções do projeto

- Conventional Commits (ver `specs/001-release-management/`).
- Nome de branch: `BOT-N/felpa-<name>`.
- Tag de commit no fim do subject: `[BOT-N]`.
- Mensagens de commit em inglês (ver `CLAUDE.md` do projeto).
- `main` é protegida: zero push direto; toda mudança entra via PR.
- TDD em todo o codebase.
- ADRs pra decisões cross-cutting em `docs/adr/NNNN-titulo.md`.

---

## 14. Status

Repositório vivo em https://github.com/Felpasw/boticario. O MVP do Wi-Fi Insights (`specs/005-wifi-insights`) está entregue na branch `BOT-32/felpa-wifi-insights`:

- Auth (`004-auth`): sessão por cookie, senha com argon2, `/auth/{login,logout,me}`.
- Ingestão: `POST /connections` com hash HMAC-SHA256 do MAC (MAC cru nunca persistido) e idempotência via header ou derivada de `userId:macHash:connectedAt`.
- Listagem: `GET /connections` paginada por período.
- Métricas: `/metrics/{summary,heatmap,timeseries,dwell-distribution,top-recurring}` calculadas no Postgres (`PERCENTILE_CONT`, `DATE_TRUNC … AT TIME ZONE 'America/Sao_Paulo'`, window functions pra new vs. recurring, 5 buckets fixos de dwell, top recurring com `HAVING COUNT(*) >= 2`).
- Alertas: inline no `/metrics/summary`, até 3, ordenados por severidade.
- Guardrails: `@nestjs/throttler` global (100/min), apertado pra 10/min no login e 1000/min na ingestão; Swagger UI em `/docs` com versão lida do `package.json`.
- Seed: dataset determinístico de 8 semanas (`faker.seed(42)`, dwell log-normal com ~2% outliers, picos de almoço/saída, +40% no sábado, −30% no domingo).
- Web: dashboard Next.js consumindo as métricas reais via hooks TanStack Query, período na URL (shortcuts + range custom), loading com skeleton, dark mode, logo do Grupo Boticário com fade-in.
- Testes: 8 vitest em `apps/web`, api unit + supertest e2e (NestJS), 4 specs Playwright cobrindo login + dashboard, todos verdes no CI.
