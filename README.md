# Boticario

A store management system covering the day-to-day of a retail operation: product catalog, inventory, point-of-sale, customers, orders and reporting. Built as a NestJS API consumed by a Next.js web app, versioned per package.

This document is the **initial product brief**. It exists to guide the split of the work into phases (`specs/NNN-slug/tasks.md`) and to align decisions before we start coding.

---

## 1. Product vision

A single place to run a store: the operator sells on the counter, the manager tracks stock and margins, the owner reads the reports. Fast enough to not get in the way of a sale, structured enough to keep the data trustworthy over months of use.

**Not** a marketplace, not a public storefront. **It is** an internal back-office + POS for people who already own the store and need to operate it.

---

## 2. Target audience

- Small/medium retail stores with 1–5 operators behind the counter
- Store owners who want visibility over sales, stock and cash without a spreadsheet
- Managers who need to adjust prices, run promotions and audit inventory movements
- Desktop-first operators (sale happens on a counter) with a mobile fallback for stock-taking on the floor

---

## 3. Product pillars

### 3.1. Catalog and inventory
- Products with SKU, barcode, category, variants (size/color), unit of measure, cost, price, tax info.
- Stock per product (and per variant) with movement history (purchase, sale, adjustment, transfer, return).
- Low-stock alerts with configurable threshold per product/category.

### 3.2. Point-of-sale (POS)
- Fast sale flow: scan/search → add to cart → payment → receipt in under 10 seconds for a known SKU.
- Multiple payment methods per sale (cash + card split, voucher, store credit).
- Discount handling with reason and operator attribution for audit.
- Cash drawer open/close with reconciliation report.

### 3.3. Customers
- Optional customer attached to the sale (CPF/CNPJ, name, phone, email).
- Purchase history per customer.
- Store credit and simple loyalty hooks (points per real spent — rules TBD).

### 3.4. Orders and fulfillment
- Sales orders (POS) and purchase orders (supplier intake) share the same movement engine.
- Status machine per order (draft → confirmed → fulfilled → closed, or cancelled with reason).
- Returns tied to the original sale, with stock restocking and refund breakdown.

### 3.5. Reporting
- Daily cash report (sales, discounts, payments by method, cash in/out).
- Inventory valuation (on-hand × cost) and turnover per category.
- Top products / dead stock windows (7/30/90 days).
- Operator performance (sales count, average ticket, discount usage).

### 3.6. Admin and multi-store (future)
- Users with role-based permissions (owner, manager, operator, stock-only).
- Multi-store support is **out of scope for MVP**; the data model should not actively block it.

---

## 4. Main functional requirements

- Sign up / login (auth provider TBD — email+password w/ JWT is the default pick)
- Role-based access control for POS vs admin surfaces
- Product CRUD with variants, barcode and bulk price update
- Stock movement log with filter by product, operator, date, kind
- POS flow (search, cart, payment, receipt, void/refund)
- Customer CRUD and lookup from POS
- Reports as listed in §3.5
- Audit log for sensitive actions (price change, void, cash drawer open/close, refund)

---

## 5. Non-functional requirements

- **Operator-first UX.** The POS screen must be usable with keyboard only (barcode scanner emits keystrokes). No modal dialogs between "scan" and "pay".
- **Data integrity over cleverness.** Every stock movement is append-only; current stock is a derived view. No silent updates to historical rows.
- **TDD across the whole codebase.** No production code without a failing test first. Backend with Jest + Supertest, frontend with Vitest + Testing Library.
- **Performance:** POS actions respond in < 150 ms server-side; a cold boot of the POS page is < 2 s on local LAN.
- **Availability:** the POS must keep working for the current cash session even if the API blips (short retry/backoff, degraded mode TBD).
- **Privacy:** customer PII (CPF, phone, email) is logged only when necessary and never in free-text log lines.
- **i18n:** pt-BR as default; the architecture should not hardcode strings in components.

---

## 6. Tech stack

### Frontend (`web/`)
- **Next.js** (App Router), strict TypeScript.
- Remote state: TanStack Query.
- Forms: React Hook Form + Zod (or Formik + Yup — final pick in the UI shell spec).
- UI: Tailwind + shadcn/ui.
- Tests: Vitest + Testing Library + Playwright (E2E).

### Backend (`api/`)
- **NestJS** on Node 20, strict TypeScript.
- Postgres as the primary database, accessed via **Prisma** (schema as source of truth, `prisma migrate` for versioning — `db push` banned in prod).
- Auth: Passport + JWT (access + refresh), bcrypt/argon2 for password hashing.
- Rate limiting: `@nestjs/throttler`.
- Background jobs: `bullmq` + Redis (added when the first async job lands).
- Tests: **Jest** + **@nestjs/testing** + **supertest** + real Postgres via Testcontainers for repository/integration tests.
- Structured logging: NestJS `Logger` with JSON transport (added when observability phase lands).

### Infra
- Monorepo with **pnpm workspaces**: `api/` (NestJS) and `web/` (Next.js) at the root.
- CI: GitHub Actions — parallel jobs (lint, test, build, commitlint) covering both packages.
- Release automation: **release-please** per package (see `specs/001-release-management/`).
- Deploy: TBD (Fly.io, Railway, self-hosted — decided when we reach that phase).

---

## 7. Proposed repository layout

```
boticario/
  api/               # NestJS API
    src/
    test/
    prisma/
    CHANGELOG.md
    package.json
  web/               # Next.js app
    src/
    CHANGELOG.md
    package.json
  specs/
    NNN-slug/
      spec.md        # detailed specification
      plan.md        # high-level plan (optional)
      tasks.md       # trackable BOT-N tasks
    roadmap.md       # phase ordering across the project
    ideas.md         # unprioritized product backlog
  docs/
    adr/             # Architecture Decision Records
  .github/
    workflows/       # CI, release-please, commitlint
  release-please-config.json
  .release-please-manifest.json
  commitlint.config.mjs
  pnpm-workspace.yaml
  package.json
  README.md
```

---

## 8. Data model (initial sketch)

Not the final schema — just enough to align vocabulary:

- **User** — id, email, name, password_hash, role (owner|manager|operator|stock), active, created_at
- **Product** — id, sku, barcode, name, description, category_id, unit, cost, price, tax_class, active
- **ProductVariant** — id, product_id, sku, barcode, attributes (JSON — size/color/etc), cost, price
- **Category** — id, name, parent_id, path
- **StockMovement** — id, product_id, variant_id, kind (purchase|sale|adjustment|transfer|return), quantity (+/-), reason, operator_id, reference_id (order id), created_at
- **StockLevel** (derived view) — product_id, variant_id, on_hand
- **Customer** — id, document (CPF/CNPJ), name, phone, email, credit_balance, created_at
- **SalesOrder** — id, number, customer_id, operator_id, status, subtotal, discount, total, opened_at, closed_at
- **SalesOrderItem** — id, order_id, product_id, variant_id, quantity, unit_price, discount, total
- **Payment** — id, order_id, method (cash|card|voucher|credit), amount, reference, received_at
- **CashSession** — id, operator_id, opened_at, closed_at, opening_amount, closing_amount, expected_amount
- **AuditLog** — id, actor_id, action, entity, entity_id, payload (JSON), created_at

---

## 9. Roadmap

Full phase-by-phase plan will live in `specs/roadmap.md` once there are more than three specs. Short version, grouped in blocks:

- **Block A — Foundation:** release automation (`001-release-management`), application skeleton (NestJS + Next.js + Postgres via docker-compose + Prisma).
- **Block B — Access control:** auth (email+password, JWT), users and roles, protected routes on both ends.
- **Block C — Catalog core:** products, variants, categories, prices, bulk import.
- **Block D — Inventory engine:** stock movements, derived levels, purchase orders, adjustments, low-stock alerts.
- **Block E — POS:** cart flow, payments, receipts, void/refund, cash drawer sessions.
- **Block F — Customers & loyalty:** customer CRUD, purchase history, store credit, simple loyalty.
- **Block G — Reporting:** daily cash report, inventory valuation, top/dead stock, operator performance.
- **Block H — Audit & admin polish:** audit log viewer, admin surfaces, settings, backups guidance.

Each phase starts with tests before code (TDD rule). Product ideas not yet scheduled live in `specs/ideas.md`.

---

## 10. Open questions (decide before slicing)

- **Auth provider:** JWT only, or add OAuth later (Google) for admin users?
- **Fiscal integration:** NFC-e/SAT emission in MVP or as a later phase?
- **Payment integration:** does the POS integrate with a card terminal (Stone, Cielo, Rede) or does the operator type the amount after swiping?
- **Barcode scanner:** support both USB-HID (keyboard emulation) and camera scanning on `web/`?
- **Offline mode on POS:** cache last-known catalog and queue sales when API is down, or hard-fail?
- **Multi-store:** keep data model multi-tenant-ready from day 1, or single-store and migrate later?
- **Price history:** keep historical prices on `Product` or model as `PriceList` from the start?
- **Returns window / refund rules:** fixed per store or per product category?

---

## 11. Local setup (draft, will be updated per phase)

```sh
# Postgres + Redis (via docker-compose, added in the bootstrap phase)
docker compose up -d postgres redis

# Install workspace deps
pnpm install

# API (NestJS)
pnpm --filter api dev        # http://localhost:3000

# Web (Next.js)
pnpm --filter web dev        # http://localhost:3001
```

---

## 12. Project conventions

- Conventional Commits (see `specs/001-release-management/`).
- Branch naming: `BOT-N/felpa-<name>`.
- Commit tag at end of subject: `[BOT-N]`.
- `main` is protected: no direct pushes; every change lands via PR.
- TDD across the whole codebase — no production code without a failing test first.
- ADRs for cross-cutting decisions in `docs/adr/NNNN-title.md`.
- `DOCS/` for living module documentation (created starting at the first domain phase).

---

## 13. Status

Initial brief. Nothing implemented yet beyond this skeleton. Next steps:

1. Align the open questions in §10.
2. Execute `specs/001-release-management/tasks.md` to lock the release pipeline before any production commit.
3. Bootstrap `api/` and `web/` (NestJS + Next.js + Prisma + docker-compose) under its own spec.
