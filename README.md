# Boticario — Wi-Fi Insights

A dashboard that gives a Boticário store owner visibility over the visitors who connect to the guest Wi-Fi. The data is simulated through ingestion endpoints (no real router integration) and turned into actionable metrics: when the store fills, who comes back, how long they stay, how the week is trending, and automatic alerts when something unusual happens.

This document is the **initial product brief**. It exists to guide the split of the work into phases (`specs/NNN-slug/`) and to align decisions before we start coding.

---

## 1. Product vision

The owner should not have to look at raw data. The dashboard answers five questions directly and surfaces an alert when something deserves attention:

| Question the owner asks | Metric | Decision it supports |
|---|---|---|
| When does the store fill up? | Visits per hour and per day of week (heatmap) | Staff scheduling |
| Do customers come back? | New vs. recurring visitors | Retention actions |
| How long do they stay? | Average/median dwell time | Engagement, layout, service |
| Is foot traffic growing? | Weekly trend and variation vs. previous period | Assess campaigns |
| Did something unusual happen? | Automatic in-app notifications | React fast without staring at the panel |

**Not** a CRM, not a POS, not a storefront. **It is** a visibility panel over guest Wi-Fi connection events, built as a technical case study.

---

## 2. Target audience

- A single store owner (or small group of store owners) checking the panel from desktop or phone
- No multi-tenant SaaS layer, but the data model carries `storeId` everywhere so the step to multi-tenant is trivial

---

## 3. Product pillars

### 3.1. Ingestion
- `POST /connections` registers a visitor connection event (storeId, mac, connectedAt, optional disconnectedAt).
- MAC never persists — only `HMAC-SHA256(mac, MAC_HASH_SECRET)`. The hash lets us identify recurring devices without storing the identifier.
- Idempotent by `Idempotency-Key` header (or derived from `storeId + macHash + connectedAt`).
- `POST /connections/simulate` generates N realistic connections for a store (used to demo the live notifications).

### 3.2. Analytics
Precomputed on demand via SQL with the store timezone (`AT TIME ZONE store.timezone`):
- `GET /stores/:id/analytics/summary` — KPIs for the period + variation vs. previous period
- `GET /stores/:id/analytics/heatmap` — weekday × hour matrix
- `GET /stores/:id/analytics/timeseries?granularity=day|week`
- `GET /stores/:id/analytics/visitors` — new vs. recurring
- `GET /stores/:id/analytics/insights` — textual sentences generated from the data (e.g. "Your peak is Saturday 2–5 pm")

Pure functions for metric calculations live inside the `analytics` module and are tested in isolation.

### 3.3. Notifications
Four types, all evaluated in-process (no worker, no queue, no Redis). Dedup via `dedupeKey` unique constraint on the table so the same alert never duplicates.

| Type | Trigger | When it fires |
|---|---|---|
| `TRAFFIC_PEAK` | Connections in the last window above a threshold | Inline on `POST /connections` |
| `NEW_RECORD` | Today surpasses the all-time best day | Inline on `POST /connections` |
| `LOW_TRAFFIC_DAY` | Yesterday X% below the weekday average | Daily cron 08:00 (store tz) via `@nestjs/schedule` |
| `DAILY_SUMMARY` | Previous day summary | Daily cron 08:00 |

Delivery is in-app via SSE (`GET /stores/:id/notifications/stream`). Email/push stays as future work.

### 3.4. Authentication
Session-based with `HttpOnly SameSite=Lax Secure` cookies. Password hashed with `argon2id`. Session store lives in **Postgres** (table `sessions`) — no Redis in the stack. Logout invalidates the session row immediately.

### 3.5. Simulator and seed
- `pnpm db:seed` creates 2 stores and ~8 weeks of connections with realistic patterns (lunch and evening peaks, Saturday heavier, Sunday lighter, ~35% recurring, dwell 5–40 min).
- `/connections/simulate` on the API lets the dashboard trigger live events during a demo and watch notifications arrive via SSE.

---

## 4. Main functional requirements

- Sign up / login (email + password, cookie session)
- Dashboard page: store selector + period selector (7d/30d/90d/custom), KPI cards with variation, heatmap, trend chart, new vs. recurring, textual insights, notification bell
- Notifications page: list with filter (read/unread), mark as read, mark all, rules configuration (enable/disable + tune thresholds)
- All data-fetching components have explicit **loading / empty / error** states
- Ingestion endpoints protected by auth (owner can only ingest for their own stores)
- Rate limit on `POST /connections` (with simulator bypass)

---

## 5. Non-functional requirements

- **TypeScript strict** across every package.
- **TDD mandatory** for every production module: unit tests on metrics and notification rules, integration tests on controllers, E2E on the critical dashboard flow.
- **Performance:** dashboard first paint < 2 s on broadband; analytics queries < 300 ms server-side at seed volume.
- **Error handling:** standardized error envelope on every response; error boundary per dashboard section so one broken block does not kill the page.
- **Privacy / LGPD:** MAC never persisted (only HMAC hash); PII (email) never in log lines.
- **Accessibility:** AA contrast, labels on controls, keyboard navigation.
- **i18n:** pt-BR as default; strings not hardcoded inside components.

---

## 6. Tech stack

### Frontend (`apps/web/`)
- **Next.js** (App Router), strict TypeScript
- Remote state: **TanStack Query**
- Forms: **React Hook Form + Zod** (schemas shared via `packages/shared`)
- UI: **Tailwind + shadcn/ui**
- Charts: **Recharts**
- Tests: **Jest + Testing Library** (unit/integration) + **Playwright** (E2E)

### Backend (`apps/api/`)
- **NestJS** on Node 20, strict TypeScript
- **Postgres 16** via **Prisma** (schema as source of truth)
- **Passport** (local strategy) + session cookie + session store in Postgres
- **`@nestjs/schedule`** for cron (daily jobs)
- **`EventEmitter2`** for in-process pub/sub (ingestion → notification evaluation)
- Rate limit via **`@nestjs/throttler`**
- Logs: **pino** structured + request id
- Tests: **Jest** + **`@nestjs/testing`** + **supertest** + **Testcontainers** (real Postgres for repository/integration tests)

### Shared (`packages/shared/`)
- DTOs, Zod schemas, enum constants shared between `api` and `web`
- Internal only (not published to a registry)

### Infra
- Monorepo with **pnpm workspaces**: `apps/api`, `apps/web`, `packages/shared`
- Local: **docker-compose** with Postgres 16 (zero Redis)
- CI: **GitHub Actions** with parallel jobs (lint, typecheck, test, build, commitlint)
- Release automation: **release-please** per package (`apps/api`, `apps/web` only; `packages/shared` is internal)
- Deploy: **Vercel** (web) + **Fly.io / Railway standard** (api — always-on required for cron) + **Neon** (Postgres)

---

## 7. Repository layout

```
boticario/
  apps/
    api/                  # NestJS (HTTP + crons + SSE, single process)
      src/
        modules/
          auth/
          stores/
          connections/
          analytics/
          notifications/
        common/           # filters, pipes, interceptors
        infra/            # prisma, event-emitter config
        main.ts
      prisma/
      test/
      CHANGELOG.md
      package.json
    web/                  # Next.js App Router
      src/
        app/
        components/
        features/         # dashboard, notifications, auth
        lib/              # api client, hooks
      CHANGELOG.md
      package.json
  packages/
    shared/               # DTOs + Zod schemas + enums
      src/
      package.json
  specs/
    000-product-brief/
    001-release-management/
    002-bootstrap/
    003-ci-pipeline/
    NNN-slug/
      spec.md             # the what
      plan.md             # the how
      tasks.md            # BOT-N executable items
    roadmap.md            # phase ordering (once >3 specs)
    ideas.md              # unprioritized backlog
  docs/
    adr/                  # Architecture Decision Records
  .github/
    workflows/            # ci.yml, release-please.yml, version-preview.yml, commitlint.yml
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

## 8. Data model (initial sketch)

```prisma
model Store {
  id        String   @id @default(uuid())
  ownerId   String
  name      String
  timezone  String   @default("America/Sao_Paulo")
  createdAt DateTime @default(now())
  owner         User          @relation(fields: [ownerId], references: [id])
  devices       Device[]
  connections   Connection[]
  rules         NotificationRule[]
  notifications Notification[]
}

model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  createdAt    DateTime  @default(now())
  stores       Store[]
  sessions     Session[]
}

model Session {
  id        String   @id          // opaque session id, stored in the cookie
  userId    String
  createdAt DateTime @default(now())
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id])
  @@index([userId])
  @@index([expiresAt])
}

model Device {
  id          String   @id @default(uuid())
  storeId     String
  macHash     String   // HMAC-SHA256(mac, MAC_HASH_SECRET); raw MAC never stored
  firstSeenAt DateTime
  lastSeenAt  DateTime
  store       Store    @relation(fields: [storeId], references: [id])
  connections Connection[]
  @@unique([storeId, macHash])
}

model Connection {
  id              String    @id @default(uuid())
  storeId         String
  deviceId        String
  connectedAt     DateTime
  disconnectedAt  DateTime?
  durationSeconds Int?
  idempotencyKey  String    @unique
  createdAt       DateTime  @default(now())
  store           Store     @relation(fields: [storeId], references: [id])
  device          Device    @relation(fields: [deviceId], references: [id])
  @@index([storeId, connectedAt])
}

model NotificationRule {
  id      String           @id @default(uuid())
  storeId String
  type    NotificationType
  params  Json             // e.g. { "threshold": 30, "windowMinutes": 60 }
  enabled Boolean          @default(true)
  store   Store            @relation(fields: [storeId], references: [id])
}

model Notification {
  id        String   @id @default(uuid())
  storeId   String
  ruleId    String?
  type      NotificationType
  title     String
  message   String
  payload   Json
  dedupeKey String   @unique
  readAt    DateTime?
  createdAt DateTime @default(now())
  store     Store    @relation(fields: [storeId], references: [id])
  @@index([storeId, createdAt])
}

enum NotificationType {
  TRAFFIC_PEAK
  LOW_TRAFFIC_DAY
  NEW_RECORD
  DAILY_SUMMARY
}
```

---

## 9. Roadmap

Phase ordering (full detail in each `specs/NNN-slug/`):

- **001-release-management** — release-please + commitlint + husky. **Priority zero**: every commit from here onward feeds the auto-changelog.
- **002-bootstrap** — monorepo skeleton: pnpm workspaces, `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`, docker-compose Postgres, Prisma init, base tsconfig/eslint/prettier.
- **003-ci-pipeline** — GitHub Actions: lint, typecheck, test, build, commitlint jobs in parallel on every PR and push to `main`.
- **004-auth** — users, sessions, cookie-based auth, login/register/logout endpoints and pages. (to be written)
- **005-wifi-insights** — `Store`, `Device`, `Connection`, `NotificationRule`, `Notification`, ingestion, analytics, notifications, SSE, dashboard, simulator. (to be written; working draft lives in `pinto[.md`)

Each phase starts with tests before code (TDD rule).

---

## 10. Open questions (decide as they come up)

- **Insights textuais** — função determinística baseada no heatmap/trend, ou chamada a LLM (opcional, requer API key)? Default: determinístico.
- **Rate limit on `POST /connections`** — por IP + exceção interna pro simulador, ou endpoint separado sem limit?
- **Deploy final da API** — Fly.io (preferência: machine always-on, cron confiável) ou Railway standard. Decisão na fase de deploy.

---

## 11. Local setup (post-bootstrap)

```sh
cp .env.example .env

# Postgres (via docker-compose)
docker compose up -d

# Install workspace deps
pnpm install

# Database
pnpm --filter api db:migrate
pnpm --filter api db:seed

# API + web in parallel
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333
- Swagger: http://localhost:3333/docs

### Required env vars (initial list)

```
DATABASE_URL=postgres://...
SESSION_COOKIE_SECRET=...
MAC_HASH_SECRET=...
CORS_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_URL=http://localhost:3333
```

---

## 12. Project conventions

- Conventional Commits (see `specs/001-release-management/`).
- Branch naming: `BOT-N/felpa-<name>`.
- Commit tag at end of subject: `[BOT-N]`.
- `main` is protected: no direct pushes; every change lands via PR.
- TDD across the whole codebase.
- ADRs for cross-cutting decisions in `docs/adr/NNNN-title.md`.

---

## 13. Status

Initial brief, repository live at https://github.com/Felpasw/boticario. Nothing implemented yet beyond the specs skeleton. Next step: execute `specs/001-release-management/tasks.md`.
