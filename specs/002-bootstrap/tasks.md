# Bootstrap do monorepo (BOT-6 … BOT-14)

> **Depende de `001-release-management` concluído** — stubs de `apps/api/package.json` e `apps/web/package.json` com `version: 0.1.0` já devem existir (vindos de BOT-1). Esse spec só preenche o resto.
>
> Companion a `spec.md` (o quê) e `plan.md` (como/decisões/riscos).

## Decisões (recap do `plan.md`)

- Monorepo pnpm, Node 20, TypeScript strict em tudo
- `apps/api` (NestJS + Prisma + Jest), `apps/web` (Next.js App Router + TanStack Query + Tailwind + Jest + RTL), `packages/shared` (tsc build, consumido via `workspace:*`)
- `docker-compose.yml` só com Postgres 16 (zero Redis)
- ESLint flat config na raiz com overrides por package
- Nenhum código de domínio — só `GET /health` como smoke test

## Convenções

- Todas as tasks são `[S]` sequenciais (bootstrap é inerentemente ordenado — ver `plan.md` §5)
- Bundles de commit sugeridos no `plan.md` §6
- Scope dos commits: `chore(repo):` / `build(repo):` pra workspace, `feat(api):`, `feat(web):`, `feat(shared):` conforme o package

---

## Fase 0 — Workspace foundation

- [ ] **BOT-6** [S] — Workspace raiz:
  - `pnpm-workspace.yaml` com `packages: ['apps/*', 'packages/*']`
  - `package.json` raiz: `"name": "boticario"`, `"private": true`, `"packageManager": "pnpm@9.x"`, scripts top-level (`dev`, `build`, `lint`, `typecheck`, `test`, `prepare`)
  - `.nvmrc` com `20`
  - `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: NodeNext`, `target: ES2022`
  - `.gitignore` cobrindo `node_modules/`, `dist/`, `build/`, `.next/`, `.turbo/`, `.env`, `.env.local`, `*.log`, `coverage/`, `.DS_Store`, `pinto[.md`, `Desafio Técnico Desenvolvedor*.pdf`
  - Validação: `pnpm install` roda sem erro

- [ ] **BOT-7** [S] — Docker Compose + envs base:
  - `docker-compose.yml` com serviço `postgres:16-alpine` + volume + healthcheck
  - User/pass/db: `boticario/boticario/boticario`, porta `5432:5432`
  - Validação: `docker compose up -d` sobe o Postgres saudável (`docker compose ps` mostra `healthy`)

---

## Fase 1 — Apps skeleton

- [ ] **BOT-8** [S] — `apps/api` NestJS skeleton:
  - `nest new apps/api --skip-git --package-manager pnpm --strict`
  - Reorganiza `src/` em `modules/`, `common/`, `infra/`
  - `main.ts` com `app.enableCors({ origin: process.env.CORS_ORIGIN })`, `app.listen(process.env.PORT ?? 3333)`
  - `prisma/schema.prisma` com `datasource db` apontando pra `env("DATABASE_URL")` e `generator client` default
  - Migration inicial vazia: `pnpm --filter api prisma migrate dev --name init --create-only` → aplica
  - `postinstall` do `apps/api/package.json` roda `prisma generate`
  - Módulo `health`:
    - `health.controller.ts` → `GET /health` retorna `{ status, db, timestamp }`
    - `health.service.ts` → faz `prisma.$queryRaw\`SELECT 1\`` e devolve `db: 'ok' | 'error'`
    - `health.module.ts` → import no `app.module.ts`
  - `infra/prisma/prisma.module.ts` + `prisma.service.ts` (extends `PrismaClient` com `onModuleInit` conectando)
  - `.env.example` com `DATABASE_URL`, `PORT=3333`, `CORS_ORIGIN=http://localhost:3000`, `NODE_ENV=development`
  - `test/health.e2e-spec.ts` — e2e com supertest batendo em `/health` e esperando `200` + `db: 'ok'`
  - Pino configurado como logger raiz do Nest
  - Validação: `pnpm --filter api dev` sobe em `:3333`; `curl :3333/health` → `200` com `db: 'ok'`; `pnpm --filter api test:e2e` passa

- [ ] **BOT-10** [S] — `packages/shared` smoke export:
  - `package.json` com `"name": "shared"`, `"version": "0.1.0"`, `"private": true`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, `"scripts": { "build": "tsc", "dev": "tsc --watch", "typecheck": "tsc --noEmit" }`
  - `tsconfig.json` extende `../../tsconfig.base.json` com `outDir: ./dist`, `rootDir: ./src`, `declaration: true`
  - `src/index.ts` exporta 1 schema Zod smoke (ex: `HealthResponseSchema` com `status, db, timestamp`) + tipo inferido
  - Depende de `zod` como `dependencies`
  - `apps/api/package.json` passa a declarar `"shared": "workspace:*"` nos `dependencies`
  - `apps/api/src/modules/health/health.controller.ts` valida resposta contra `HealthResponseSchema` (prova consumo cross-package)
  - Validação: `pnpm -r build` builda shared antes de api; `pnpm --filter api test:e2e` ainda passa

- [ ] **BOT-9** [S] — `apps/web` Next.js skeleton:
  - `pnpm create next-app@latest apps/web --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"` (eslint vem do flat config da raiz, não do default do Next)
  - Remove boilerplate do `src/app/page.tsx`, substitui por placeholder minimal ("Boticario Wi-Fi Insights — bootstrap OK")
  - `next.config.ts` com `transpilePackages: ['shared']`
  - `src/app/providers.tsx` como Client Component wrapper com `QueryClientProvider` do TanStack Query
  - `src/app/layout.tsx` envolve `children` com `<Providers>`
  - `src/lib/api-client.ts` — wrapper fetch mínimo que lê `process.env.NEXT_PUBLIC_API_URL`, método `getHealth()` que bate em `${API}/health` e valida com `HealthResponseSchema` do `shared`
  - `package.json` declara `"shared": "workspace:*"` nos `dependencies`
  - Jest + Testing Library setup (`jest.config.ts`, `jest.setup.ts`), 1 teste smoke renderizando a home
  - `.env.example` com `NEXT_PUBLIC_API_URL=http://localhost:3333`
  - Validação: `pnpm --filter web dev` sobe em `:3000`; browser renderiza a home sem erro; `pnpm --filter web test` passa

---

## Fase 2 — Lint, format, scripts

- [ ] **BOT-11** [S] — ESLint flat config na raiz:
  - `eslint.config.mjs` com imports de `@eslint/js`, `typescript-eslint`, `eslint-config-next` (bridged se necessário)
  - Base config aplica em `**/*.{ts,tsx}`: TS strict rules + import ordering (regra do CLAUDE.md: builtin → external → internal → parent → sibling → index, alfabético intra-grupo)
  - Overrides:
    - `apps/api/**` → regras NestJS, permite decorators
    - `apps/web/**` → regras React/Next (`eslint-config-next`), permite JSX
    - `packages/shared/**` → só base
  - Scripts `lint` em cada package: `eslint . --max-warnings=0`
  - Validação: `pnpm lint` passa verde em todos os packages

- [ ] **BOT-12** [S] — Prettier + editorconfig:
  - `.prettierrc` na raiz: `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`
  - `.prettierignore` cobre `dist/`, `.next/`, `node_modules/`, `coverage/`, `pnpm-lock.yaml`
  - `.editorconfig` padrão (`indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`, `charset = utf-8`)
  - `prettier` como devDep na raiz (não por package — compartilhado)
  - Scripts raiz: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`
  - Validação: `pnpm format:check` passa (depois de um `pnpm format` inicial)

---

## Fase 3 — Dev flow + validação final

- [ ] **BOT-13** [S] — Scripts `pnpm dev` paralelo:
  - Script raiz `"dev": "pnpm -r --parallel --filter './apps/*' dev"` roda `apps/api dev` e `apps/web dev` juntos
  - Script `"shared:dev": "pnpm --filter shared dev"` roda tsc watch do shared em terminal separado (opcional, só se dev tiver mudando shared ao vivo)
  - Validação: `pnpm dev` sobe api `:3333` e web `:3000` sem crash; ambos respondem

- [ ] **BOT-14** [S] — Quick-start no README + smoke end-to-end:
  - Confirma que a seção `## 11. Local setup` do `README.md` bate com o fluxo real
  - Executa do zero numa pasta limpa: `pnpm install` → `docker compose up -d` → `pnpm --filter api db:migrate` → `pnpm dev` → `curl :3333/health` → browser em `:3000`
  - Ajusta README se alguma etapa divergiu (ex: comando de migrate exato, nome de script)
  - `git status` após o fluxo mostra working tree limpo (nenhum arquivo gerado escapou do `.gitignore`)

---

## Checklist de encerramento (antes de propor merge da Release PR do bootstrap)

- [ ] `pnpm install` numa máquina limpa funciona
- [ ] `docker compose up -d` sobe Postgres healthy
- [ ] `pnpm --filter api db:migrate` aplica a migration init sem erro
- [ ] `pnpm dev` sobe os 2 apps
- [ ] `GET http://localhost:3333/health` responde `200` com `db: 'ok'`
- [ ] `http://localhost:3000` renderiza a página placeholder
- [ ] `pnpm lint` verde
- [ ] `pnpm typecheck` verde
- [ ] `pnpm build` verde (shared → api → web, nesta ordem via topological)
- [ ] `pnpm test` verde (api e2e health + web smoke render)
- [ ] `git status` limpo depois de tudo rodar

## Fora do escopo (vai pra specs seguintes)

- CI (`003-ci-pipeline`)
- Autenticação (`004-auth`)
- Modelos de domínio (Store/Device/Connection/Notification) e endpoints (`005-wifi-insights`)
- shadcn/ui init
- Swagger config
- Dockerfiles de prod
- Seed de dados
