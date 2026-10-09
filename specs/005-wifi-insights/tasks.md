# Wi-Fi Insights (BOT-32 … BOT-48)

> **Depende de `004-auth` concluído** (user, session, `@CurrentUser()`, shell protegido prontos).
>
> Companion a `spec.md` (o quê) e `plan.md` (como/decisões/riscos).

## Decisões (recap do `plan.md`)

- **Sem entidade `Store`** — desafio é mono-loja; `Device`/`Connection` ancoram em `User`
- Timezone global via env var `APP_TIMEZONE` + `TimezoneConfig` injetável
- Date range na URL via `useDateRange()` (não em Zustand)
- Alerts inline no `/metrics/summary` (função pura, até 3 por response, zero persistência)
- Charts: Recharts; heatmap custom em CSS Grid
- Server Components com prefetch + HydrationBoundary pro dashboard
- Rate limit global via `@nestjs/throttler` com overrides em `/connections` (1000/min) e `/auth/login` (10/min)
- Metrics via SQL raw (`$queryRaw`) pra controle de `AT TIME ZONE` e `percentile_cont`
- Idempotency key: header preferencial, derivado como fallback
- Dwell mediana como KPI principal, média secundária
- Swagger em `/docs`

## Convenções

- Todas `[S]` sequenciais (`plan.md` §5)
- Scope: `feat(api):` / `feat(shared):` / `feat(web):` / `chore(api):` / `test(web):` conforme bundle
- Bundles sugeridos no `plan.md` §6

---

## Fase 0 — Schema + shared

- [ ] **BOT-32** [S] [T] — Prisma: `Device`, `Connection`:
  - Adiciona models ao `apps/api/prisma/schema.prisma` (ver `spec.md` §3)
  - `User` ganha `devices: Device[]` e `connections: Connection[]` (relações inversas)
  - Migration: `pnpm --filter api prisma migrate dev --name add_devices_connections`
  - Teste: integração em `apps/api/test/wifi-models.integration-spec.ts` validando `prisma.device.upsert({ where: { userId_macHash } })` + `prisma.connection.create`
  - Validação: migration aplica; teste passa

- [ ] **BOT-33** [S] [T] — Shared: schemas Zod:
  - `packages/shared/src/schemas/connection.ts`:
    - `MacAddressSchema` = regex IEEE 802
    - `RegisterConnectionRequestSchema` = `{ macAddress, connectedAt, disconnectedAt? }` com refine `disconnectedAt >= connectedAt`
    - `ConnectionViewSchema` = `{ id, deviceId, connectedAt, disconnectedAt, durationSeconds }`
    - `ConnectionsQuerySchema` = `{ from?, to?, page?, perPage? }` com default `page=1, perPage=50`
    - `ConnectionsListResponseSchema` = `{ data, page, perPage, total, totalPages }`
  - `packages/shared/src/schemas/metrics.ts`:
    - `MetricsQuerySchema` = `{ from?, to?, granularity? }` com refine janela ≤ 365d
    - `TopRecurringQuerySchema` = `{ from?, to?, limit? }` com default `limit=10`, max 50
    - `KpiBlockSchema` = `{ value, variation: { pct, direction: 'up'|'down'|'flat' } }`
    - `SummaryResponseSchema` = `{ period, kpis: { visits, uniqueVisitors, recurringRate, dwellMedianSeconds }, alerts: Alert[] }`
    - `AlertSchema` + `AlertTypeEnum` + `AlertSeverityEnum`
    - `HeatmapResponseSchema`
    - `TimeseriesBucketSchema` = `{ bucket, visits, uniqueVisitors, newVisitors, recurringVisitors }` com refine `newVisitors + recurringVisitors === uniqueVisitors`
    - `TimeseriesResponseSchema` = `{ period, granularity, series: TimeseriesBucketSchema[] }`
    - `DwellBucketSchema` = `{ label, lowerSeconds, upperSeconds: number | null, count }`
    - `DwellDistributionResponseSchema` = `{ period, buckets: DwellBucketSchema[], totalWithDwell }` com os 5 buckets fixos
    - `TopRecurringItemSchema` = `{ deviceId, visitCount, firstSeenInPeriodAt, lastSeenAt, avgDwellSeconds }`
    - `TopRecurringResponseSchema` = `{ period, data: TopRecurringItemSchema[] }`
  - Export tudo via `packages/shared/src/index.ts`
  - Teste: `.test.ts` por schema validando edge cases
  - Validação: `pnpm -r build` + `pnpm --filter shared test` passam

---

## Fase 1 — Backend: ingestion + listing

- [ ] **BOT-34** [S] [T] — Devices repo + MAC hasher + idempotency key builder:
  - `apps/api/src/connections/domain/services/mac-hasher.ts`:
    - `hashMac(mac: string, secret: string): string` — HMAC-SHA256(mac.toLowerCase(), secret).hex
    - Pura, testada com fixture determinística
  - `apps/api/src/connections/domain/services/idempotency-key-builder.ts`:
    - `buildKey({ userId, macHash, connectedAt }): string` — formato `${userId}:${macHash}:${connectedAt.toISOString()}`
  - `apps/api/src/connections/domain/ports/devices-repository.ts` — interface com `upsertByUserAndMacHash`
  - `apps/api/src/connections/infrastructure/repositories/prisma-devices.repository.ts` — impl com `prisma.device.upsert({ where: { userId_macHash }, create: ..., update: { lastSeenAt } })`
  - `.env.example` ganha `MAC_HASH_SECRET=change-me-dev-secret`
  - Testes: unit das 2 funções puras + integração do repo
  - Validação: todos passam

- [ ] **BOT-35** [S] [T] — `POST /connections`:
  - `apps/api/src/connections/domain/ports/connections-repository.ts` — interface com `findByIdempotencyKey`, `create`
  - `apps/api/src/connections/infrastructure/repositories/prisma-connections.repository.ts`
  - `apps/api/src/connections/domain/errors/`:
    - `disconnected-before-connected.error.ts`
    - `invalid-mac-address.error.ts`
  - `apps/api/src/connections/application/use-cases/register-connection.use-case.ts`:
    - Lê `userId` do `@CurrentUser()`
    - Hash do MAC
    - Monta idempotency key (header preferencial, derivado fallback)
    - `findByIdempotencyKey`: se existe, retorna 200 com registro existente; senão `upsertDevice` + `create connection` com `durationSeconds` calculado
  - `apps/api/src/connections/dto/register-connection.dto.ts` — valida via `ZodValidationPipe` com `RegisterConnectionRequestSchema`
  - `apps/api/src/connections/connections.controller.ts`:
    - `POST /connections` com `@CurrentUser()` + `@Headers('idempotency-key')` + body
    - 201 em criação, 200 em idempotency hit
    - `@Throttle({ default: { limit: 1000, ttl: 60000 } })` override
  - `apps/api/src/connections/connections.module.ts` — bindings DI
  - Testes:
    - Unit do use-case (sucesso, idempotency hit, disconnected-before-connected)
    - E2E `connections.e2e-spec.ts`: POST autenticado 201; reenvio devolve 200 com mesmo id; 422 se disconnect < connect; 401 sem cookie
  - Validação: todos passam

- [ ] **BOT-36** [S] [T] — `GET /connections` paginated:
  - `apps/api/src/connections/application/use-cases/list-connections.use-case.ts`:
    - Lê `userId` + `{ from, to, page, perPage }` com defaults (últimos 30d, page=1, perPage=50)
    - Count total + fetch paginado
    - Retorna `{ data, page, perPage, total, totalPages }`
  - Repo ganha `listByUserInRange({ userId, from, to, page, perPage })` + `countByUserInRange(...)`
  - DTO query validado via `ZodQueryPipe` com `ConnectionsQuerySchema`
  - Controller: `GET /connections` com `@CurrentUser()`
  - Testes:
    - Unit do use-case com mock de repo
    - E2E com dataset seedado: paginação correta, filtro de período, totalPages
  - Validação: todos passam

---

## Fase 2 — Backend: metrics

- [ ] **BOT-37** [S] [T] — Funções puras + `TimezoneConfig`:
  - `apps/api/src/@common/config/timezone.config.ts`:
    - Classe injetável que lê `APP_TIMEZONE` do `ConfigService` com default `America/Sao_Paulo`
    - Expõe `get(): string`
    - Teste unit cobrindo default + override
  - `apps/api/src/metrics/domain/services/period-resolver.ts`:
    - `resolvePeriod({ from?, to? }): { from: Date, to: Date, prevFrom: Date, prevTo: Date }` com default 30d e cálculo do período anterior equivalente
    - Validações: `to >= from`, janela ≤ 365d → `InvalidPeriodError` / `PeriodTooLargeError`
  - `apps/api/src/metrics/domain/services/metrics-calculator.ts`:
    - `calcVariation(current, previous): { pct, direction }`
    - `calcRecurringRate(uniqueTotal, uniqueRecurring): number`
    - Funções puras simples, testáveis com fixtures
  - `apps/api/src/metrics/domain/services/alerts-evaluator.ts`:
    - `evaluateAlerts({ summary, prevSummary, heatmap }): Alert[]`
    - Heurísticas da `spec.md` §6; retorna até 3 ordenado por severity
  - Testes unit:
    - `timezone.config.spec.ts`: default + override via env
    - `period-resolver.spec.ts`: defaults, prev-period calc, erros
    - `metrics-calculator.spec.ts`: variation up/down/flat, recurring rate edge cases
    - `alerts-evaluator.spec.ts`: cada tipo de alert com fixture, ordenação, truncate em 3
  - Validação: todos passam

- [ ] **BOT-38** [S] [T] — Repository de metrics (SQL raw):
  - `apps/api/src/metrics/infrastructure/repositories/prisma-metrics.repository.ts` com 5 métodos:
    - `summaryFor({ userId, from, to, timezone })`: visits, uniqueVisitors, uniqueRecurring, dwellMedian, dwellAvg via `prisma.$queryRaw`
    - `heatmapFor({ userId, from, to, timezone })`: GROUP BY `EXTRACT(DOW ...) AT TIME ZONE timezone`
    - `timeseriesFor({ userId, from, to, granularity, timezone })`: GROUP BY `DATE_TRUNC(granularity, ...) AT TIME ZONE timezone`; por bucket, calcula `newVisitors` = COUNT(DISTINCT macHash) com `device.firstSeenAt >= bucket_start` e `recurringVisitors` com `<`
    - `dwellDistributionFor({ userId, from, to })`: `COUNT(*)` por faixa via `CASE WHEN durationSeconds < 300 THEN '0-5min' ... END`, filtrando `disconnectedAt IS NOT NULL` e `durationSeconds <= 28800`; sempre devolve os 5 buckets fixos (count=0 se vazio)
    - `topRecurringFor({ userId, from, to, limit })`: `GROUP BY deviceId` com `COUNT(*) AS visitCount, MIN(connectedAt), MAX(connectedAt), AVG(durationSeconds)`, `HAVING COUNT(*) >= 2 ORDER BY visitCount DESC, lastSeenAt DESC LIMIT ?`
    - Filtra outliers `durationSeconds > 28800` (8h) em cálculos de dwell
    - `timezone` recebido do `TimezoneConfig.get()` no use-case que injeta no repo
  - `apps/api/src/metrics/domain/ports/metrics-repository.ts` — interface com os 5 métodos
  - Fixture determinística em `apps/api/test/fixtures/connections-seed.ts`: 100 conexões cobrindo 2 semanas × 7 dias × algumas horas, com mix de novos vs. recorrentes conhecido, dwell variado cobrindo as 5 faixas, e visitas cruzando meia-noite BRT (teste de timezone)
  - Testes de integração (Testcontainers) validando cada um dos 5 métodos com a fixture (incluindo invariante `new + recurring == uniqueVisitors` por bucket)
  - Validação: todos passam; teste de timezone não falha; cada método < 300ms

- [ ] **BOT-39** [S] [T] — Metrics use-cases + endpoints:
  - `apps/api/src/metrics/application/use-cases/get-summary.use-case.ts`:
    - Chama `periodResolver` → resolve `tz = timezoneConfig.get()` → `metricsRepo.summaryFor({ ..., timezone: tz })` + `summaryFor(prevPeriod)` + `heatmapFor(period)`
    - Monta `KpiBlockSchema` com variação
    - Chama `alertsEvaluator.evaluate(...)` → monta response
  - `get-heatmap.use-case.ts` + `get-timeseries.use-case.ts` análogos
  - `get-dwell-distribution.use-case.ts`: resolve período, chama `metricsRepo.dwellDistributionFor(...)`, retorna 5 buckets fixos
  - `get-top-recurring.use-case.ts`: resolve período, valida `limit` (default 10, max 50), chama `metricsRepo.topRecurringFor(...)`, retorna lista
  - `apps/api/src/metrics/dto/metrics-query.dto.ts` + `top-recurring-query.dto.ts` — valida via `ZodQueryPipe` com schemas do `shared`
  - `apps/api/src/metrics/metrics.controller.ts`:
    - `GET /metrics/summary` + `GET /metrics/heatmap` + `GET /metrics/timeseries` + `GET /metrics/dwell-distribution` + `GET /metrics/top-recurring`
    - Todos com `@CurrentUser()`
  - `apps/api/src/metrics/metrics.module.ts`
  - Testes:
    - Unit dos 5 use-cases com mocks
    - E2E `metrics.e2e-spec.ts` com dataset seedado: cada rota responde formato esperado, com variação calculada, invariantes checadas (new + recurring, 5 buckets sempre, top-recurring ordenado)
  - Validação: todos passam; latência de cada rota < 300ms no dataset de teste

---

## Fase 3 — Backend: throttler, seed, swagger

- [ ] **BOT-40** [S] [T] — Rate limit global + Swagger:
  - `pnpm --filter api add @nestjs/throttler`
  - `ThrottlerModule.forRoot` no `AppModule` com default 100 req/min
  - `APP_GUARD` com `ThrottlerGuard` (compõe com AuthGuard)
  - `@Throttle({ default: { limit: 10, ttl: 60000 } })` em `AuthController.login`
  - `@Throttle({ default: { limit: 1000, ttl: 60000 } })` em `ConnectionsController.register`
  - `@nestjs/swagger` config em `main.ts`: `/docs` serve UI, title "Boticario Wi-Fi Insights API", version lida do `package.json`
  - DTOs anotados com `@ApiProperty` (ou `zod-to-openapi` se vale a pena)
  - Testes: e2e verifica 429 após exceder limit no login
  - Validação: `/docs` lista 9 rotas (login, logout, me, POST/GET connections, 5 metrics)

- [ ] **BOT-41** [S] — Seed de connections realistas:
  - `apps/api/prisma/seed/connections.ts`:
    - Pega admin seedado em `004` (`userId = admin.id`)
    - Gera ~8 semanas de connections com `faker.seed(42)` (determinístico):
      - 56 dias (hoje-56 → hoje)
      - Distribuição por hora: baseline + bump 12-14h + bump 17-19h
      - Distribuição por dia: Sáb +40%, Dom -30%
      - Devices: ~35% recorrentes, 65% novos
      - Dwell: log-normal centrada em 15min, cap 60min, 2% outliers > 2h
      - macHash via `mac-hasher` com secret de dev
    - Idempotente: usa upsert pela `idempotencyKey` derivada
  - Script: `apps/api/package.json` adiciona `"db:seed:connections": "ts-node prisma/seed/connections.ts"`
  - Validação: rodar 2x não quebra; `/metrics/summary` após seed retorna números não triviais

---

## Fase 4 — Frontend: services, hooks

- [ ] **BOT-42** [S] [T] — Services + hooks:
  - `apps/web/src/services/`:
    - `interfaces/connections.interface.ts` + `connections.service.ts` — classe com `register`, `list({ from, to, page, perPage })`
    - `interfaces/metrics.interface.ts` + `metrics.service.ts` — classe com `summary`, `heatmap`, `timeseries`, `dwellDistribution`, `topRecurring({ from, to, limit })`
  - `apps/web/src/hooks/`:
    - `interfaces/useConnections.interface.ts` + `useConnections.ts` — classe `ConnectionsHooks` com `use(params)` → `{ list, register }`
    - `interfaces/useMetricsSummary.interface.ts` + `useMetricsSummary.ts` — classe análoga
    - `useMetricsHeatmap.ts` + `useMetricsTimeseries.ts` + `useMetricsDwellDistribution.ts` + `useMetricsTopRecurring.ts` análogos
    - `useDateRange.ts` — hook utilitário: lê `useSearchParams()`, devolve `{ from, to, granularity, setPeriod, setShortcut }` com defaults (últimos 30d)
    - Query keys exportadas: `CONNECTIONS_QUERY_KEYS`, `METRICS_QUERY_KEYS` com `byPeriod(from, to)` cobrindo as 5 rotas
  - Testes:
    - `.test.ts` por service (mock axios)
    - `.test.tsx` por hook (`renderHook` com `QueryClientProvider`)
    - `useDateRange.test.ts` com `createMemoryRouter` ou mock de `useSearchParams`
  - Validação: `pnpm --filter web test` passa

---

## Fase 5 — Frontend: components

- [ ] **BOT-43** [S] [T] — Atoms + molecules:
  - `apps/web/src/components/atoms/`:
    - `KpiValue.tsx` — formata número grande (abrev k/M quando couber)
    - `VariationBadge.tsx` — seta + % colorida por direção
    - `AlertIcon.tsx` — ícone por severity (lucide-react)
    - `SkeletonBlock.tsx` — placeholder genérico
    - `DeviceBadge.tsx` — mostra ID do device truncado (ex: `#a3f0…`) com monospace, usado no top-recurring
  - `apps/web/src/components/molecules/`:
    - `KpiCard.tsx` — title + `KpiValue` + `VariationBadge` + estado loading
    - `AlertBanner.tsx` — list de alerts com `AlertIcon`, estado vazio escondido
    - `DateRangePicker.tsx` — shadcn `Calendar` em popover
    - `PeriodShortcuts.tsx` — botões 7d/30d/90d/Custom (dispara `setShortcut` do `useDateRange`)
    - `PaginationControls.tsx` — prev/next + indicador de página
    - `DwellBucketBar.tsx` — barra horizontal com label + count + % do total (usada 5 vezes no `DwellDistributionChart`)
    - `RecurringDeviceRow.tsx` — linha com `DeviceBadge` + nº visitas + "última vez há Nd" + dwell médio formatado
  - `apps/web/src/utils/formatters.ts` — `formatNumber`, `formatPercent`, `formatDuration`, `formatDate`
  - Testes `.test.tsx` por componente — render + estados
  - Validação: `pnpm --filter web test` passa

- [ ] **BOT-44** [S] [T] — Organisms:
  - `apps/web/src/components/organisms/`:
    - `SummarySection.tsx` — grid de 4 `KpiCard`, consome `useMetricsSummary().use(...)`, estados loading/empty/error
    - `HeatmapChart.tsx` — CSS Grid 7×24 com cores por intensidade (`#f1f5f9` → `#1e293b`), ARIA roles, consome `useMetricsHeatmap`
    - `TimeseriesChart.tsx` — Recharts `LineChart` com **2 linhas** (novos + recorrentes), legenda, tooltip mostrando total + split, consome `useMetricsTimeseries`
    - `DwellDistributionChart.tsx` — vertical stack de 5 `DwellBucketBar` ordenadas, consome `useMetricsDwellDistribution`, estado vazio (sem connections com `disconnectedAt`)
    - `TopRecurringList.tsx` — lista de até 10 `RecurringDeviceRow`, consome `useMetricsTopRecurring({ limit: 10 })`, estado vazio ("Nenhum dispositivo recorrente no período")
    - `ConnectionsTable.tsx` — shadcn `Table` + `PaginationControls`, consome `useConnections`
  - Cada organismo tem Error Boundary próprio (`react-error-boundary` ou wrapper manual) — seção quebrada não derruba página
  - Testes `.test.tsx`: render + estados vazio/erro + interação (hover tooltip, click paginação); `TimeseriesChart` com assert nas 2 séries renderizadas
  - Validação: `pnpm --filter web test` passa

---

## Fase 6 — Frontend: pages

- [ ] **BOT-45** [S] [T] — `/dashboard` page com SSR prefetch:
  - `apps/web/src/components/templates/DashboardTemplate.tsx` — layout com header (`DateRangePicker` + `PeriodShortcuts`) + content area em grid responsivo
  - `apps/web/src/app/(app)/dashboard/page.tsx` — Server Component:
    - Cria `queryClient` server-side
    - Resolve período default via `periodResolver`
    - Prefetch das **5 queries de metrics** (summary, heatmap, timeseries, dwell-distribution, top-recurring) via `queryClient.prefetchQuery(...)` encaminhando cookie
    - Renderiza `<HydrationBoundary state={dehydrate(queryClient)}>` wrappando `<DashboardTemplate>` + `<AlertBanner>` + `<SummarySection>` + `<HeatmapChart>` + `<TimeseriesChart>` + `<DwellDistributionChart>` + `<TopRecurringList>`
  - Layout proposto do dashboard (responsivo):
    - Linha 1: `AlertBanner` (full-width, oculto se vazio)
    - Linha 2: `SummarySection` (4 cards side-by-side em desktop, 2×2 em mobile)
    - Linha 3: `TimeseriesChart` (full-width) + `DwellDistributionChart` (side column 1/3) em desktop
    - Linha 4: `HeatmapChart` (full-width)
    - Linha 5: `TopRecurringList` (full-width, max 10 linhas)
  - `apps/web/src/app/(app)/page.tsx` passa a `redirect('/dashboard')` (substitui placeholder do `004`)
  - Nav do shell `(app)/layout.tsx` ganha itens Dashboard + Connections
  - Testes:
    - Component test do `DashboardTemplate`
    - E2E manual: login → dashboard renderiza com dados do seed, 5 widgets visíveis
  - Validação: dashboard renderiza sem flash de loading quando dados estão em cache

- [ ] **BOT-46** [S] [T] — `/connections` page:
  - `apps/web/src/app/(app)/connections/page.tsx` — Server Component com prefetch análogo (list da primeira página)
  - Renderiza `<ConnectionsTable>` + `<DateRangePicker>` + `<PaginationControls>`
  - Estados loading (skeleton rows), empty ("Nenhuma conexão no período"), error ("Tentar novamente")
  - Testes component + E2E manual
  - Validação: paginação + filtro de período funcionam

---

## Fase 7 — E2E Playwright + CI

- [ ] **BOT-47** [S] [T] — Playwright setup + E2E dashboard/connections:
  - `pnpm --filter web add -D @playwright/test`
  - `apps/web/playwright.config.ts` com projects `chromium` + `webkit` (opcional)
  - `apps/web/e2e/dashboard.spec.ts`:
    - Setup: start api + web via `webServer` do Playwright; seed admin + connections antes
    - Test: login → espera redirect `/dashboard` → verifica 4 KPIs + heatmap + 2 linhas da timeseries + 5 barras do dwell + lista de top-recorrentes com ≥ 2 linhas → clica "7d" → verifica widgets atualizam → verifica banner de alerts tem pelo menos 1
  - `apps/web/e2e/connections.spec.ts`:
    - Login → nav Connections → tabela renderiza → clica "próxima página" → URL muda → nova página renderiza
  - Scripts no `apps/web/package.json`: `"e2e": "playwright test"`, `"e2e:ui": "playwright test --ui"`
  - Validação: `pnpm --filter web e2e` passa local com docker-compose rodando

- [ ] **BOT-48** [S] — CI: job `e2e` no `003`:
  - Atualiza `.github/workflows/ci.yml` adicionando job `e2e`:
    - `needs: [build]`
    - Service container Postgres (reusa config do `test`)
    - Steps: install, prisma generate + migrate deploy + seed admin + seed connections, start api (background) + build web + start web (background), `pnpm --filter web e2e`
    - Upload traces/screenshots como artifact em falha (`actions/upload-artifact`)
  - Atualiza branch protection na GitHub UI: adiciona `e2e` nos required checks
  - Validação: PR dummy dispara `e2e` e passa

---

## Checklist de encerramento

- [ ] `pnpm --filter api db:seed` cria admin + `db:seed:connections` cria dataset
- [ ] `POST /connections` autenticado grava, retorna 201; reenvio devolve 200 com mesmo id; 422 se disconnect < connect; 429 após exceder throttle; 401 sem cookie
- [ ] `GET /connections?from=...&to=...&page=...&perPage=...` paginated OK com totalPages correto
- [ ] `/metrics/summary` responde com KPIs + variação + até 3 alerts
- [ ] `/metrics/heatmap` responde matriz 7×24 (esparsa)
- [ ] `/metrics/timeseries?granularity=day` e `week` respondem série com split `newVisitors + recurringVisitors == uniqueVisitors` em todo bucket
- [ ] `/metrics/dwell-distribution` responde 5 buckets fixos com `count` consistente
- [ ] `/metrics/top-recurring?limit=10` responde até 10 devices ordenados por `visitCount DESC`, só `>= 2` visitas
- [ ] Timezone correto: visita 23h BRT aparece no weekday 23h BRT (não dia seguinte UTC)
- [ ] Dashboard renderiza KPIs com variação, heatmap preenchido, timeseries com 2 linhas, histograma de dwell em barras, lista de top recorrentes, banner com alerts
- [ ] `DateRangePicker` + `PeriodShortcuts` mudam URL → todas as 5 queries de metrics re-fetch
- [ ] `/connections` lista tabela paginada com estados loading/empty/error
- [ ] Error boundary isola falha de uma seção do dashboard sem derrubar as outras
- [ ] Logout limpa queryClient → connections+metrics somem de cache no próximo login
- [ ] `/docs` lista 9 rotas com DTOs documentadas
- [ ] Playwright E2E dashboard + connections passam local + CI
- [ ] CI do `003` ganhou job `e2e` e todos verdes (6 required checks: lint, typecheck, test, build, commitlint, e2e)
- [ ] `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` passam

## Fora do escopo (não implementar aqui)

- Entidade `Store` / multi-store UI
- Simulador `POST /connections/simulate`
- SSE / notificações persistidas / cron
- Export CSV/Excel
- Deploy (vira spec próprio)
- Sweep de connections antigas
- Insights textuais via LLM
