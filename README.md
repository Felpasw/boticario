# Boticario — Wi-Fi Insights

A dashboard that gives a Boticário store owner visibility over the visitors who connect to the guest Wi-Fi. The data is simulated through an ingestion endpoint (no real router integration) and turned into actionable metrics: when the store fills, who comes back, how long they stay, how the week is trending, and automatic alerts when something unusual happens.

This document is the **initial product brief**. It exists to guide the split of the work into phases (`specs/NNN-slug/`) and to align decisions before we start coding.

---

## 1. Product vision

The owner should not have to look at raw data. The dashboard answers five questions directly and surfaces an alert when something deserves attention:

| Question the owner asks       | Metric                                          | Decision it supports                    |
| ----------------------------- | ----------------------------------------------- | --------------------------------------- |
| When does the store fill up?  | Visits per hour and per day of week (heatmap)   | Staff scheduling                        |
| Do customers come back?       | New vs. recurring visitors                      | Retention actions                       |
| How long do they stay?        | Average/median dwell time                       | Engagement, layout, service             |
| Is foot traffic growing?      | Weekly trend and variation vs. previous period  | Assess campaigns                        |
| Did something unusual happen? | Automatic inline alerts on the summary endpoint | React fast without staring at the panel |

**Not** a CRM, not a POS, not a storefront. **It is** a visibility panel over guest Wi-Fi connection events, built as a technical case study.

---

## 2. Target audience

- A single store owner checking the panel from desktop or phone. The challenge brief is explicit about this: _"you are the owner of **a** store"_.
- No multi-tenant SaaS layer and **no `Store` entity** — `Device` and `Connection` anchor directly on `User`. Scaling to multi-store is a documented follow-up (migration + refactor, ~1 day), not something the MVP pays for upfront.

---

## 3. Product pillars

### 3.1. Ingestion

- `POST /connections` registers a visitor connection event (`macAddress`, `connectedAt`, optional `disconnectedAt`). The owner is resolved from the session cookie — no `storeId` on the wire.
- MAC never persists — only `HMAC-SHA256(mac, MAC_HASH_SECRET)`. The hash lets us identify recurring devices without storing the identifier.
- Idempotent by `Idempotency-Key` header (or derived from `userId + macHash + connectedAt`).
- Realistic ~8-week dataset is produced via `pnpm --filter api db:seed:connections` instead of an in-API simulator endpoint.

### 3.2. Analytics

Precomputed on demand via SQL with the configured timezone (`AT TIME ZONE :tz`, resolved from `APP_TIMEZONE` env var, default `America/Sao_Paulo`):

- `GET /connections?from=&to=&page=&perPage=` — raw paginated listing per period
- `GET /metrics/summary?from=&to=` — KPIs for the period, variation vs. previous period, inline alerts
- `GET /metrics/heatmap?from=&to=` — weekday × hour matrix
- `GET /metrics/timeseries?from=&to=&granularity=day|week` — time series

Pure functions for metric calculations live inside the `metrics` module and are tested in isolation. The pre-period comparison window is `[from - (to - from), from]`.

### 3.3. Alerts

Evaluated inline on `GET /metrics/summary` by a pure function (`alerts-evaluator.ts`). Up to 3 alerts per response, ordered by severity (warning > info > success). No table, no cron, no SSE — zero persistence.

| Type              | Trigger                                                                        | Severity  |
| ----------------- | ------------------------------------------------------------------------------ | --------- |
| `TRAFFIC_PEAK`    | Weekday × hour cell above p95 of the matrix                                    | `info`    |
| `LOW_TRAFFIC_DAY` | A specific weekday 30%+ below the average of the same weekday in prior windows | `warning` |
| `NEW_RECORD`      | Current period visits above every previous equivalent window                   | `success` |
| `TREND_UP`        | Variation above +15%                                                           | `success` |
| `TREND_DOWN`      | Variation below -15%                                                           | `warning` |

The front renders them as a banner on top of the dashboard.

### 3.4. Authentication

Session-based with `HttpOnly SameSite=Lax Secure` cookies. Password hashed with `argon2id`. Session store lives in **Postgres** (table `sessions`) — no Redis in the stack. Logout invalidates the session row immediately.

### 3.5. Seed

`pnpm --filter api db:seed` creates the admin user. `pnpm --filter api db:seed:connections` populates ~8 weeks of connections with realistic patterns (lunch and evening peaks, Saturday heavier, Sunday lighter, ~35% recurring, dwell 5–40 min). Deterministic via `faker.seed(42)` so repeated runs produce the same dataset.

---

## 4. Main functional requirements

- Sign up / login (email + password, cookie session)
- Dashboard page: period selector (7d/30d/90d/custom), KPI cards with variation, heatmap, trend chart, alert banner
- Connections page: paginated table with period filter + loading / empty / error states
- All data-fetching components have explicit **loading / empty / error** states
- Ingestion endpoint protected by auth (owner ingests only for themselves — no cross-user access path exists)
- Rate limit on `POST /connections` (1000 req/min per IP for demo bursts) and `POST /auth/login` (10/min for brute-force protection)

---

## 5. Non-functional requirements

- **TypeScript strict** across every package.
- **TDD mandatory** for every production module: unit tests on metrics and alert rules, integration tests on repositories (Testcontainers), E2E on the critical dashboard flow (Playwright).
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
- Charts: **Recharts** (heatmap custom in CSS Grid)
- Tests: **Jest + Testing Library** (unit/integration) + **Playwright** (E2E)

### Backend (`apps/api/`)

- **NestJS** on Node 20, strict TypeScript
- **Postgres 16** via **Prisma** (schema as source of truth)
- **Passport** (local strategy) + session cookie + session store in Postgres
- Rate limit via **`@nestjs/throttler`**
- API docs via **`@nestjs/swagger`** at `/docs`
- Logs: **pino** structured + request id
- Tests: **Jest** + **`@nestjs/testing`** + **supertest** + **Testcontainers** (real Postgres for repository/integration tests)

### Shared (`packages/shared/`)

- DTOs, Zod schemas, enum constants shared between `api` and `web`
- Internal only (not published to a registry)

### Infra

- Monorepo with **pnpm workspaces**: `apps/api`, `apps/web`, `packages/shared`
- Local: **docker-compose** with Postgres 16 (zero Redis)
- CI: **GitHub Actions** with parallel jobs (lint, typecheck, test, build, commitlint; E2E added in `005`)
- Release automation: **release-please** per package (`apps/api`, `apps/web` only; `packages/shared` is internal)
- Deploy: **Vercel** (web) + **Fly.io / Railway standard** (api) + **Neon** (Postgres). No cron processes, so always-on is not a hard requirement — but still recommended for cold-start latency.

---

## 7. Repository layout

```
boticario/
  apps/
    api/                  # NestJS (HTTP only — no crons, no workers)
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
        features/         # dashboard, auth
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
    004-auth/
    005-wifi-insights/
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
  userId      String
  macHash     String   // HMAC-SHA256(mac, MAC_HASH_SECRET); raw MAC never stored
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

Mono-loja by challenge design — no `Store` entity. See §9 "Multi-store evolution" below for the documented upgrade path.

---

## 9. Multi-store evolution (follow-up, not in MVP)

Scaling the model to multi-store is a small, well-understood migration:

1. Add `Store` entity with `ownerId`, `name`, `timezone`.
2. Migration: `ALTER TABLE device/connection RENAME COLUMN user_id TO store_id` + nullable backfill.
3. Create one `Store` per existing `User`, populate FKs, drop nullability.
4. Extract `apps/api/src/stores/` module with `StoresService.getStoresForOwner`.
5. Resolve active store per request (header, path param or UI selector).
6. UI: store selector in the nav + persistence of the selection.

Estimated effort: ~1 day. Deliberately out of scope for the challenge MVP.

---

## 10. Roadmap

Phase ordering (full detail in each `specs/NNN-slug/`):

- **001-release-management** — release-please + commitlint + husky. **Priority zero**: every commit from here onward feeds the auto-changelog.
- **002-bootstrap** — monorepo skeleton: pnpm workspaces, `apps/api` (NestJS), `apps/web` (Next.js), `packages/shared`, docker-compose Postgres, Prisma init, base tsconfig/eslint/prettier.
- **003-ci-pipeline** — GitHub Actions: lint, typecheck, test, build, commitlint jobs in parallel on every PR and push to `main`.
- **004-auth** — users, sessions, cookie-based auth, login/register/logout endpoints and pages.
- **005-wifi-insights** — `Device`, `Connection`, ingestion, metrics endpoints with inline alerts, dashboard page, connections page, seed, Playwright E2E.

Each phase starts with tests before code (TDD rule).

---

## 11. Open questions (decide as they come up)

- **Deploy final da API** — Fly.io (machine always-on, lower cold start) or Railway standard. Decision deferred to the deploy spec.

---

## 12. Local setup

```sh
# Env files (edit if the defaults do not fit)
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# Postgres via docker-compose (host port 5434 to avoid clashing with a local server)
docker compose up -d

# Install workspace deps (runs husky + prisma generate via lifecycle scripts)
pnpm install

# Apply Prisma migrations (no models yet — just initialises the migrations table)
pnpm --filter api db:migrate

# API + web in parallel
pnpm dev
```

- Web: http://localhost:3000
- API: http://localhost:3333
- Health: `curl http://localhost:3333/health` → `{ "status": "ok", "db": "ok", "timestamp": "..." }`
- Swagger (added in `005`): http://localhost:3333/docs

Seed scripts (`db:seed`, `db:seed:connections`) land with specs `004-auth` and `005-wifi-insights` respectively.

### Required env vars

`apps/api/.env`:

```
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
DATABASE_URL=postgresql://boticario:boticario@localhost:5434/boticario?schema=public
# Added in later specs:
# SESSION_COOKIE_SECRET=...      # 004-auth
# MAC_HASH_SECRET=...            # 005-wifi-insights
# APP_TIMEZONE=America/Sao_Paulo # 005-wifi-insights
```

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

---

## 13. Project conventions

- Conventional Commits (see `specs/001-release-management/`).
- Branch naming: `BOT-N/felpa-<name>`.
- Commit tag at end of subject: `[BOT-N]`.
- `main` is protected: no direct pushes; every change lands via PR.
- TDD across the whole codebase.
- ADRs for cross-cutting decisions in `docs/adr/NNNN-title.md`.

---

## 14. Status

Repository live at https://github.com/Felpasw/boticario. Specs `001-release-management` and `002-bootstrap` are implemented: release-please + commitlint + husky, pnpm workspace, docker-compose Postgres, NestJS api with a `/health` endpoint hitting Prisma, Next.js web with a QueryClient-wrapped home, shared Zod schema consumed cross-package, ESLint flat configs and Prettier. Next step: `specs/003-ci-pipeline/`.
