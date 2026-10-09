# 005 — Wi-Fi Insights (SPEC)

> Status: **specification only**. Companion a `plan.md` (abordagem) e `tasks.md` (quebra).

## 1. Resumo

Domínio do produto: ingestão de conexões de Wi-Fi de visitantes, listagem crua paginada por período, e 3 rotas de métricas agregadas pro painel. Alerts gerados inline no `/metrics/summary` (sem tabela de notificação, sem cron, sem SSE). Front com dashboard + tabela de connections, padrão molecular herdado do `money-assistance`.

**Escopo é mono-loja por definição do desafio** ("você é dono de uma loja"). Não existe entidade `Store` no modelo — `Device` e `Connection` ancoram direto no `User` (o dono). Timezone global via env var, não por loja. Qualquer evolução pra multi-store exige migration explícita, documentada no README como follow-up.

## 2. Escopo

**Dentro**
- Models Prisma: `Device`, `Connection` (sem `Store`)
- Módulo `apps/api/src/connections/`:
  - `POST /connections` — ingestão idempotente (HMAC-SHA256 do MAC + idempotency key)
  - `GET /connections?from=&to=&page=&perPage=` — listagem paginada por período
- Módulo `apps/api/src/metrics/`:
  - `GET /metrics/summary?from=&to=` — KPIs (visitas, únicos, recorrentes %, dwell médio+mediano) + variação vs. período anterior + `alerts: Alert[]` inline
  - `GET /metrics/heatmap?from=&to=` — matriz dia-da-semana × hora
  - `GET /metrics/timeseries?from=&to=&granularity=day|week` — série temporal de visitas
- Timezone global via env var `APP_TIMEZONE=America/Sao_Paulo` (lido num helper `TimezoneConfig` injetável — single source nos SQLs `AT TIME ZONE`)
- Query params padronizados em todas as rotas de leitura:
  - `from`, `to` (ISO 8601, opcionais, default: últimos 30 dias, `to >= from`, janela máxima 365d)
- Rate limit global via `@nestjs/throttler` + override agressivo em `POST /connections` (1000 req/min por IP, pensando em simulação de carga pra demo)
- Seed de connections realistas (`pnpm --filter api db:seed:connections`): ~8 semanas de dados pro admin seedado em `004`, com padrões realistas (picos almoço/fim-tarde, sábado +, domingo -, ~35% recorrentes, dwell 5–40 min)
- Front:
  - `src/services/connections.service.ts` + `metrics.service.ts` (classes com interface)
  - `src/hooks/useConnections.ts` + `useMetricsSummary.ts` + `useMetricsHeatmap.ts` + `useMetricsTimeseries.ts` + `useDateRange.ts` (padrão `AuthHooks` com `use()`)
  - `src/stores/dateRangeStore.ts` — não; **date range vive na URL** via `useSearchParams` (bookmarkable, shareable)
  - `src/app/(app)/page.tsx` — redireciona pra `/dashboard`
  - `src/app/(app)/dashboard/page.tsx` — KPIs + heatmap + timeseries + banner de alerts
  - `src/app/(app)/connections/page.tsx` — tabela paginada com filtro de período
  - Componentes atomic: `atoms/{KpiValue,VariationBadge,AlertIcon}`, `molecules/{KpiCard,AlertBanner,DateRangePicker,PeriodShortcuts,PaginationControls}`, `organisms/{SummarySection,HeatmapChart,TimeseriesChart,ConnectionsTable}`, `templates/DashboardTemplate`
  - Charts via **Recharts**
- Playwright E2E: login → dashboard renderiza KPIs → troca período → tabela de connections pagina
- Swagger UI em `/docs` (NestJS `@nestjs/swagger`)

**Fora**
- Entidade `Store` / multi-store / troca de loja / seletor / timezone por loja
- Simulador (`POST /connections/simulate` — cortado da conversa, seed basta)
- Notificações persistidas / cron / SSE / sininho em tempo real / tabela `Notification`
- Export de dados (CSV/Excel)
- Dashboard de admin / configuração de thresholds pelo user
- Fiscal, pagamentos, etc

## 3. Prisma schema (adições)

```prisma
model Device {
  id          String   @id @default(uuid())
  userId      String
  macHash     String                           // HMAC-SHA256(mac, MAC_HASH_SECRET)
  firstSeenAt DateTime
  lastSeenAt  DateTime
  user        User         @relation(fields: [userId], references: [id], onDelete: Cascade)
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
  durationSeconds Int?                           // calculado quando disconnectedAt vem no payload
  idempotencyKey  String    @unique              // header Idempotency-Key OU derivado
  createdAt       DateTime  @default(now())
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  device          Device    @relation(fields: [deviceId], references: [id], onDelete: Cascade)
  @@index([userId, connectedAt])
  @@index([deviceId, connectedAt])
}
```

`User` (herdado do `004`) ganha `devices: Device[]` e `connections: Connection[]` como relações inversas.

Decisões:
- Sem `Store` — desafio é explicitamente mono-loja; cada `User` é o dono do próprio contexto de dados
- `Device.macHash` — raw MAC **nunca** persistido (LGPD + reafirmação do pinto)
- `Connection.idempotencyKey` — único; derivado = `userId:macHash:connectedAt.toISOString()` se header não vier
- `Connection.durationSeconds` — calculado no insert quando `disconnectedAt` presente; nunca derivado em query (barato de armazenar, caro de recalcular em agregação)
- Index composto `(userId, connectedAt)` cobre 100% das queries de analytics (always-filtered by user + range)
- Cascade em `onDelete` — se user some, devices e connections somem junto

## 4. Estrutura do backend

### `apps/api/src/@common/config/`
- `timezone.config.ts` — classe injetável que lê `APP_TIMEZONE` do `ConfigService` com default `America/Sao_Paulo`; expõe `get(): string`
- Importada onde queries de agregação precisam de `AT TIME ZONE`

### `apps/api/src/connections/`
```
connections/
  connections.module.ts
  connections.controller.ts
  connections.service.ts
  dto/
    register-connection.dto.ts
    list-connections.dto.ts
  application/
    use-cases/
      register-connection.use-case.ts    # idempotente + HMAC + upsert device
      list-connections.use-case.ts       # paginado por período
    types/
      connection-view.ts
  domain/
    services/
      mac-hasher.ts                      # pure function HMAC-SHA256
      idempotency-key-builder.ts         # deriva key se header ausente
    errors/
      invalid-period.error.ts
      disconnected-before-connected.error.ts
    ports/
      connections-repository.ts
      devices-repository.ts
  infrastructure/
    repositories/
      prisma-connections.repository.ts
      prisma-devices.repository.ts
```

### `apps/api/src/metrics/`
```
metrics/
  metrics.module.ts
  metrics.controller.ts
  metrics.service.ts
  dto/
    metrics-query.dto.ts                 # { from?, to?, granularity? } validado via Zod
  application/
    use-cases/
      get-summary.use-case.ts            # KPIs + variação + alerts
      get-heatmap.use-case.ts            # matriz 7×24
      get-timeseries.use-case.ts         # série por day|week
    types/
      summary.ts                         # KpiBlock, Variation, Alert
      heatmap.ts
      timeseries.ts
  domain/
    services/
      period-resolver.ts                 # from/to default + validation + prev-period calc
      alerts-evaluator.ts                # função pura: (summary, prev) => Alert[]
      metrics-calculator.ts              # funções puras (visitasCount, recurringPct, dwellStats, variation)
    errors/
      invalid-period.error.ts
      period-too-large.error.ts
  infrastructure/
    repositories/
      prisma-metrics.repository.ts       # queries SQL raw/aggregadas (AT TIME ZONE)
```

Cálculo das métricas em **funções puras** (`metrics-calculator.ts`) — testáveis isoladamente com fixtures.

### `apps/api/src/@common/` (adições)
- `infrastructure/pipes/zod-query.pipe.ts` — valida query string contra Zod schema do shared
- `config/timezone.config.ts` — ver §4 acima

## 5. Rotas detalhadas

### `POST /connections`
**Autenticação**: requerida (admin do seed; user vem via `@CurrentUser()`)
**Body**:
```json
{
  "macAddress": "AA:BB:CC:DD:EE:FF",
  "connectedAt": "2026-10-08T14:03:00Z",
  "disconnectedAt": "2026-10-08T14:41:00Z"
}
```
**Header opcional**: `Idempotency-Key: <string>` (se ausente, derivado)
**Sucesso (201)**:
```json
{ "id": "uuid", "deviceId": "uuid", "connectedAt": "...", "disconnectedAt": "...", "durationSeconds": 2280 }
```
**Erros**:
- `422 DISCONNECTED_BEFORE_CONNECTED` — `disconnectedAt < connectedAt`
- `422 VALIDATION_ERROR` — MAC inválido, datas no futuro, etc
- `200 (not 201)` — se idempotency key já existe, retorna o registro existente sem criar novo (ou devolve mesmo status + body — padrão `200 + já existente` pra sinalizar)
- `429 TOO_MANY_REQUESTS` — rate limit

### `GET /connections?from=&to=&page=&perPage=`
**Query**:
- `from`, `to` — opcionais, default últimos 30d
- `page` — opcional, default 1 (1-indexed)
- `perPage` — opcional, default 50, max 200
**Sucesso (200)**:
```json
{
  "data": [{ "id": "...", "connectedAt": "...", "disconnectedAt": "...", "durationSeconds": 2280, "deviceId": "..." }],
  "page": 1, "perPage": 50, "total": 342, "totalPages": 7
}
```

### `GET /metrics/summary?from=&to=`
```json
{
  "period": { "from": "2026-09-08", "to": "2026-10-08" },
  "kpis": {
    "visits": { "value": 1234, "variation": { "pct": 12.3, "direction": "up" } },
    "uniqueVisitors": { "value": 456, "variation": { "pct": -2.1, "direction": "down" } },
    "recurringRate": { "value": 0.35, "variation": { "pct": 1.2, "direction": "up" } },
    "dwellMedianSeconds": { "value": 720, "variation": { "pct": 0, "direction": "flat" } }
  },
  "alerts": [
    { "type": "TRAFFIC_PEAK", "severity": "info", "title": "Pico de tráfego", "message": "Seu pico foi sábado entre 14h e 17h (87 visitas/h)" },
    { "type": "LOW_TRAFFIC_DAY", "severity": "warning", "title": "Dia abaixo da média", "message": "Terça (06/10) ficou 32% abaixo da média das últimas 4 terças" }
  ]
}
```

### `GET /metrics/heatmap?from=&to=`
```json
{
  "period": { "from": "...", "to": "..." },
  "matrix": [
    { "weekday": 0, "hour": 0, "count": 2 },
    { "weekday": 0, "hour": 1, "count": 1 },
    "..."
  ]
}
```
`weekday`: 0=Dom .. 6=Sáb. Matriz esparsa (só horas com dado).

### `GET /metrics/timeseries?from=&to=&granularity=day|week`
```json
{
  "period": { "from": "...", "to": "..." },
  "granularity": "day",
  "series": [
    { "bucket": "2026-09-08", "visits": 34, "uniqueVisitors": 22 },
    { "bucket": "2026-09-09", "visits": 41, "uniqueVisitors": 28 }
  ]
}
```

## 6. Alerts (gerados inline)

Função pura `alerts-evaluator.ts` recebe `(summary, prevSummary, heatmap)` e devolve `Alert[]`. Heurísticas:

| Type | Trigger | Severity |
|---|---|---|
| `TRAFFIC_PEAK` | Identifica dia+hora com `count > p95(matriz)` | `info` |
| `LOW_TRAFFIC_DAY` | Dia da semana específico no período com `visits < avg(mesmo weekday períodos anteriores) * 0.7` | `warning` |
| `NEW_RECORD` | `summary.visits > max(prev períodos)` | `success` |
| `TREND_UP` | `variation.visits.pct > 15` | `success` |
| `TREND_DOWN` | `variation.visits.pct < -15` | `warning` |

Máximo 3 alerts no response (ordena por severity: warning > info > success, trunca). Sem persistência — recalculado a cada request. Front renderiza como banner no topo do dashboard.

## 7. Métricas (definições formais)

- **Visitas**: `COUNT(connections) WHERE userId=? AND connectedAt BETWEEN from AND to`
- **Visitantes únicos**: `COUNT(DISTINCT macHash) WHERE userId=? AND connectedAt BETWEEN from AND to`
- **Taxa de recorrência**: `uniqueRecurring / uniqueTotal` onde recurring = device com `firstSeenAt < from` (visitou antes do período)
- **Dwell**:
  - **mediana**: `percentile_cont(0.5) WITHIN GROUP (ORDER BY durationSeconds)` ignorando NULL
  - **média**: `AVG(durationSeconds)` — exibido como secundário
  - Outliers: ignorar `durationSeconds > 8h` (prováveis dispositivos esquecidos conectados overnight)
- **Variação**: comparação com período `[from - (to-from), from]` (período imediatamente anterior de mesmo tamanho)
- **Heatmap**: `GROUP BY EXTRACT(DOW FROM connectedAt AT TIME ZONE :tz), EXTRACT(HOUR FROM connectedAt AT TIME ZONE :tz)`
- **Timeseries day**: `GROUP BY DATE_TRUNC('day', connectedAt AT TIME ZONE :tz)`
- **Timeseries week**: `GROUP BY DATE_TRUNC('week', connectedAt AT TIME ZONE :tz)`

`:tz` resolvido pelo `TimezoneConfig.get()` (default `America/Sao_Paulo`, override via env `APP_TIMEZONE`).

## 8. Estrutura do frontend

### `src/services/`
- `connections.service.ts` → `class ConnectionsService implements IConnectionsService` com `register(payload)`, `list({ from, to, page, perPage })`
- `metrics.service.ts` → `class MetricsService implements IMetricsService` com `summary({ from, to })`, `heatmap({ from, to })`, `timeseries({ from, to, granularity })`
- Interfaces em `services/interfaces/connections.interface.ts` + `metrics.interface.ts` reusando tipos do `shared` via `z.infer`

### `src/hooks/`
- `useConnections.ts` → `class ConnectionsHooks` com `use(params)` → `{ list: UseQueryResult, register: UseMutationResult }`
- `useMetricsSummary.ts` → `class MetricsSummaryHooks` com `use({ from, to })` → `{ summary: UseQueryResult }`
- `useMetricsHeatmap.ts` → análogo
- `useMetricsTimeseries.ts` → análogo
- `useDateRange.ts` → hook utilitário que lê `useSearchParams()` e devolve `{ from, to, granularity, setPeriod }` (síncrono com URL)
- Query keys: `CONNECTIONS_QUERY_KEYS = { all, list: (params) => [...] }`, `METRICS_QUERY_KEYS = { summary, heatmap, timeseries, byPeriod: (from, to) => [...] }`

### `src/stores/`
- Nada novo. `dateRange` vive na URL.
- `userStore` já veio do `004`.

### `src/components/`
- **atoms/**: `KpiValue` (formata número), `VariationBadge` (seta + %), `AlertIcon` (muda ícone por severity), `SkeletonBlock`
- **molecules/**: `KpiCard` (title + value + variation + icon), `AlertBanner` (list de alerts), `DateRangePicker` (shadcn Calendar), `PeriodShortcuts` (botões 7d/30d/90d/custom), `PaginationControls`
- **organisms/**: `SummarySection` (grid de 4 KpiCards), `HeatmapChart` (Recharts custom via Treemap/HeatmapGrid), `TimeseriesChart` (Recharts LineChart), `ConnectionsTable` (shadcn Table com estados loading/empty/error)
- **templates/**: `DashboardTemplate` (container + nav do shell)

### `src/app/(app)/`
- `page.tsx` → `redirect('/dashboard')`
- `dashboard/page.tsx` → Server Component que faz prefetch via TanStack Query HydrationBoundary; renderiza `<AlertBanner>` + `<SummarySection>` + `<HeatmapChart>` + `<TimeseriesChart>` com `<DateRangePicker>` + `<PeriodShortcuts>` no header
- `connections/page.tsx` → `<ConnectionsTable>` + `<PaginationControls>` + `<DateRangePicker>`
- `layout.tsx` (do 004) ganha itens de nav: Dashboard, Connections

## 9. Loading / empty / error (obrigatório por componente)

- **Loading**: skeleton no formato final do conteúdo (nunca spinner genérico)
- **Empty**: mensagem orientando ação (ex: "Nenhuma conexão no período. Rode `pnpm --filter api db:seed:connections` ou ajuste as datas.")
- **Error**: mensagem clara + botão "Tentar novamente" acionando `refetch()` do TanStack
- **Error boundary**: um `<ErrorBoundary>` por seção do dashboard — se `SummarySection` quebrar, `HeatmapChart` continua renderizando

## 10. Validação de entrada

- Schemas Zod no `shared` por rota:
  - `RegisterConnectionRequestSchema` (body do POST)
  - `ConnectionsQuerySchema` (query do GET /connections)
  - `MetricsQuerySchema` (query das 3 rotas de metrics, com `granularity` opcional)
- Validação acontece via `ZodValidationPipe` (body) e `ZodQueryPipe` (query) do `@common/`
- Falha → `400 VALIDATION_ERROR` com `details: [{ field, issue }]`

## 11. Rate limiting

- `@nestjs/throttler` instalado como guard global
- Default: 100 req/min por IP em qualquer rota
- Override via `@Throttle({ default: { limit: 1000, ttl: 60000 } })` em `POST /connections` (pensando em bursts de simulação durante demo/dev)
- Login (`POST /auth/login`): override pra 10 tentativas/min por IP (defesa anti-brute-force)

## 12. Swagger

- `@nestjs/swagger` registrado em `main.ts`
- `/docs` serve UI
- DTOs anotados com `@ApiProperty` ou via geração a partir dos schemas Zod (`zod-to-openapi` se vale a pena)
- Expor sem auth em dev; em prod gated pelo mesmo guard global

## 13. Seed de connections

`apps/api/prisma/seed/connections.ts`:
- Pega o admin seedado em `004`
- Gera ~8 semanas de connections pro user:
  - Dias: hoje - 56d até hoje
  - Dist de visitas por hora: baseline + bumps em 12-14h e 17-19h
  - Dist por dia: Sáb +40%, Dom -30%, dias úteis base
  - Devices: ~35% recorrentes (reaparece em dias diferentes), 65% novos
  - Dwell: distribuição concentrada em 10-20 min (log-normal, cap em 60min, 2% outliers > 2h)
  - Idempotency key gerada por determinismo (seed reproducível com `faker.seed(42)`)
- Script: `pnpm --filter api db:seed:connections` (separado do seed de admin pra poder rerodar sem recriar user)

## 14. Testes

- **api**:
  - Unit: cada função pura em `metrics-calculator.ts` + `alerts-evaluator.ts` + `period-resolver.ts` + `mac-hasher.ts` + `idempotency-key-builder.ts` com fixtures determinísticas
  - Unit: cada use-case com mock dos ports
  - Integration (Testcontainers): `prisma-connections.repository.spec.ts`, `prisma-metrics.repository.spec.ts` (queries de agregação com dataset conhecido)
  - E2E: `connections.e2e-spec.ts` (POST idempotente, validação, paginação do GET), `metrics.e2e-spec.ts` (3 rotas com dataset seedado)
- **web**:
  - Unit: `useConnections.test.tsx`, `useMetricsSummary.test.tsx` (mock axios)
  - Component: `KpiCard.test.tsx`, `AlertBanner.test.tsx`, `HeatmapChart.test.tsx` (render + estados vazio/erro)
- **E2E Playwright**:
  - `e2e/dashboard.spec.ts`: login → dashboard renderiza 4 KPIs + heatmap + timeseries + banner de alerts → troca período 7d/30d/90d → KPIs atualizam
  - `e2e/connections.spec.ts`: dashboard → nav Connections → tabela carrega → pagina → filtra período
  - CI do `003` ganha job novo `e2e` com Playwright containers

## 15. Critérios de sucesso

- `pnpm --filter api db:seed:connections` popula ~8 semanas de dados realistas
- `POST /connections` autenticado grava com idempotência (reenvio devolve mesmo registro, não duplica)
- `POST /connections` com `disconnectedAt < connectedAt` devolve `422`
- `GET /connections?from=...&to=...&page=...` paginated OK, com `totalPages` correto
- 3 rotas de metrics respondem < 300ms com dataset seedado
- `/metrics/summary` devolve `alerts: Alert[]` com até 3 itens ordenados por severity
- Dashboard renderiza KPIs com variação (seta up/down + %), heatmap preenchido, timeseries com linha, banner com alerts
- `DateRangePicker` muda `from`/`to` na URL → todas as queries re-fetch
- `/connections` lista tabela paginada com estados loading/empty/error
- Logout do `004` limpa queryClient (connections+metrics somem de cache)
- Playwright E2E dashboard + connections passam no CI
- Swagger em `/docs` lista 7 rotas (login, logout, me, POST/GET connections, 3 metrics) com DTOs
- `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` passam
- CI do `003` continua verde + job novo de e2e

## 16. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| Query de agregação (heatmap/timeseries) lenta com volume maior | Index `(userId, connectedAt)` cobre tudo; se virar gargalo, materializar view por hora/dia em outra fase |
| Timezone bug (UTC vs São Paulo) em heatmap/timeseries | SQL sempre com `AT TIME ZONE :tz` injetando `TimezoneConfig.get()`; teste e2e com dataset conhecido (visita às 23h UTC = 20h BRT em dia anterior) |
| Alerts gerados variam entre requests (não determinísticos) | Função pura testada com fixtures; dedupe implícito já que não persiste |
| Idempotency key colide com visita legítima no mesmo segundo | Header `Idempotency-Key` recomendado; derivação `userId:macHash:connectedAt` aceita colisão rara como aceita (próximo request com disconnectedAt atualiza) |
| Rate limit mordendo durante demo com simulação de carga | Override em `POST /connections` pra 1000/min cobre o uso |
| MAC hash muda se MAC_HASH_SECRET rotacionar | Documento no README que rotação do secret requer re-seed (fase deferred) |
| Recharts heatmap custom é trabalhoso | Fallback: usar `<HeatmapGrid>` custom em CSS Grid (sem lib); ou lib externa como `@nivo/heatmap` |
| HydrationBoundary + TanStack SSR tem edge cases com queries parametrizadas pela URL | Prefetch no Server Component com os defaults; client refetch quando `useDateRange` resolve params |
| Virar multi-store no futuro exige migration + refactor | Aceito. Documentado como follow-up no README: extrair `Store` como entidade, trocar FK `userId` → `storeId`, adicionar seletor na UI. Custo estimado baixo (~1 dia) pelo escopo contido. |

## 17. Dependências

- **Depende de**: `004-auth` concluído (user, session, `@CurrentUser()`, shell protegido prontos)
- **Habilita**: deploy (spec próprio quando chegar lá) — todas as rotas de domínio prontas
