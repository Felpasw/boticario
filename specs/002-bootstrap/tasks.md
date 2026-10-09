# Bootstrap do monorepo (BOT-6 … BOT-14)

> **Depende de `001-release-management` concluído** — stubs de `apps/api/package.json` e `apps/web/package.json` com `version: 0.1.0` já devem existir (vindos de BOT-1). Esse spec só preenche o resto.
>
> Companion a `spec.md` (o quê) e `plan.md` (como/decisões/riscos).

## Decisões (recap do `plan.md`)

- Monorepo pnpm, Node 20, TypeScript strict em tudo
- `apps/api` (NestJS + Prisma + Jest) com estrutura **igual ao `money-assistance`**: módulos de domínio direto em `src/<module>/`, `src/@common/`, `src/infrastructure/prisma/`, `src/config/`
- `apps/web` (Next.js App Router + TanStack + Vitest + RTL + Tailwind + **shadcn/ui**) com estrutura **igual ao `money-assistance`**: `src/api.ts` (axios), `src/lib/queryClient.ts`, `src/services/` (classes com interface), `src/hooks/` (classes agrupando TanStack), `src/stores/` (Zustand com persist), `src/components/{atoms,molecules,organisms,templates,ui}`
- `packages/shared` (tsc build + Vitest, consumido via `workspace:*`)
- `docker-compose.yml` só com Postgres 16 (zero Redis)
- ESLint flat config na raiz com overrides por package
- Nenhum código de domínio — só `GET /health` como smoke test

## Convenções

- Todas as tasks são `[S]` sequenciais (bootstrap é inerentemente ordenado — ver `plan.md` §5)
- Bundles de commit sugeridos no `plan.md` §6
- Scope dos commits: `chore(repo):` / `build(repo):` pra workspace, `feat(api):`, `feat(web):`, `feat(shared):` conforme o package

---

## Fase 0 — Workspace foundation

- [x] **BOT-6** [S] — ✅ commit `c70025e` — Workspace raiz:
  - `pnpm-workspace.yaml` com `packages: ['apps/*', 'packages/*']`
  - `package.json` raiz: `"name": "boticario"`, `"private": true`, `"packageManager": "pnpm@9.x"`, scripts top-level (`dev`, `build`, `lint`, `typecheck`, `test`, `prepare`)
  - `.nvmrc` com `20`
  - `tsconfig.base.json` com `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `moduleResolution: NodeNext`, `target: ES2022`
  - `.gitignore` cobrindo `node_modules/`, `dist/`, `build/`, `.next/`, `.turbo/`, `.env`, `.env.local`, `*.log`, `coverage/`, `.DS_Store`, `pinto[.md`, `Desafio Técnico Desenvolvedor*.pdf`
  - Validação: `pnpm install` roda sem erro

- [x] **BOT-7** [S] — ✅ commit `c70025e` — Docker Compose + envs base:
  - `docker-compose.yml` com serviço `postgres:16-alpine` + volume + healthcheck
  - User/pass/db: `boticario/boticario/boticario`, porta `5432:5432`
  - Validação: `docker compose up -d` sobe o Postgres saudável (`docker compose ps` mostra `healthy`)

---

## Fase 1 — Apps skeleton

- [x] **BOT-8** [S] — ✅ commit `2763fbb` — `apps/api` NestJS skeleton (estrutura igual ao `money-assistance`):
  - `nest new apps/api --skip-git --package-manager pnpm --strict`
  - Reorganiza `src/` em: módulos direto na raiz (ex: `src/health/`), `src/@common/` (com `domain/{constants,ports}` + `infrastructure/{pipes,logging}`), `src/infrastructure/prisma/`, `src/config/`
  - `main.ts` com `app.enableCors({ origin: process.env.CORS_ORIGIN, credentials: true })`, `app.listen(process.env.PORT ?? 3333)`, logger pino raiz
  - `prisma/schema.prisma` com `datasource db` apontando pra `env("DATABASE_URL")` e `generator client` default
  - Migration inicial vazia: `pnpm --filter api prisma migrate dev --name init --create-only` → aplica
  - `postinstall` do `apps/api/package.json` roda `prisma generate`
  - Módulo `health` (em `src/health/`):
    - `health.controller.ts` → `GET /health` retorna `{ status, db, timestamp }`
    - `health.service.ts` → faz `prisma.$queryRaw\`SELECT 1\``e devolve`db: 'ok' | 'error'`
    - `health.module.ts` → import no `app.module.ts`
  - `infrastructure/prisma/prisma.module.ts` + `prisma.service.ts` (extends `PrismaClient` com `onModuleInit` conectando; module `@Global()`)
  - `.env.example` com `DATABASE_URL`, `PORT=3333`, `CORS_ORIGIN=http://localhost:3000`, `NODE_ENV=development`
  - `test/health.e2e-spec.ts` — e2e com supertest batendo em `/health` e esperando `200` + `db: 'ok'`
  - Validação: `pnpm --filter api dev` sobe em `:3333`; `curl :3333/health` → `200` com `db: 'ok'`; `pnpm --filter api test:e2e` passa

- [x] **BOT-10** [S] — ✅ commit `e7f030b` — `packages/shared` smoke export:
  - `package.json` com `"name": "shared"`, `"version": "0.1.0"`, `"private": true`, `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, `"scripts": { "build": "tsc", "dev": "tsc --watch", "typecheck": "tsc --noEmit" }`
  - `tsconfig.json` extende `../../tsconfig.base.json` com `outDir: ./dist`, `rootDir: ./src`, `declaration: true`
  - `src/index.ts` exporta 1 schema Zod smoke (ex: `HealthResponseSchema` com `status, db, timestamp`) + tipo inferido
  - Depende de `zod` como `dependencies`
  - `apps/api/package.json` passa a declarar `"shared": "workspace:*"` nos `dependencies`
  - `apps/api/src/modules/health/health.controller.ts` valida resposta contra `HealthResponseSchema` (prova consumo cross-package)
  - Validação: `pnpm -r build` builda shared antes de api; `pnpm --filter api test:e2e` ainda passa

- [x] **BOT-9** [S] — ✅ commit `dbca2c2` — `apps/web` Next.js skeleton (estrutura igual ao `money-assistance`):
  - `pnpm create next-app@latest apps/web --typescript --tailwind --app --src-dir --no-eslint --import-alias "@/*"` (eslint vem do flat config da raiz)
  - Remove boilerplate; substitui `src/app/page.tsx` por placeholder minimal
  - `next.config.ts` com `transpilePackages: ['shared']`
  - **Estrutura `src/` igual money**:
    - `src/api.ts` — `axios.create({ baseURL: API_URL, withCredentials: true, paramsSerializer: { indexes: null } })` + export default
    - `src/globals.ts` — exporta `API_URL = process.env.NEXT_PUBLIC_API_URL!` + constantes globais do app
    - `src/lib/queryClient.ts` — `new QueryClient({ defaultOptions })` com retry policy espelhando money (não retry em 4xx exceto 408; staleTime 30s; gcTime 5min; refetchOnWindowFocus false)
    - `src/lib/utils.ts` — `cn()` do shadcn (clsx + tailwind-merge)
    - Pastas vazias prontas: `src/services/{,interfaces}/`, `src/hooks/{,interfaces,constants,utils}/`, `src/stores/`, `src/components/{atoms,molecules,organisms,templates,ui}/`, `src/utils/`, `src/@types/`
  - `src/app/providers.tsx` — Client Component com `<QueryClientProvider client={queryClient}>` importando do `@/lib/queryClient`
  - `src/app/layout.tsx` envolve `children` com `<Providers>`
  - Route groups vazios: `src/app/(auth)/` e `src/app/(app)/` prontos pras páginas futuras
  - **shadcn/ui init**: `pnpm --filter web dlx shadcn@latest init -d` com style default (new-york), base color `neutral`, cssVariables true, components alias `@/components/ui`; cria `components.json` + `src/components/ui/` + atualiza `tailwind.config.ts` e `globals.css`
  - Dependências: `axios`, `@tanstack/react-query`, `zustand`, `zod`, `clsx`, `tailwind-merge`, `lucide-react`
  - Dev dependencies: `vitest`, `@vitest/ui`, `@testing-library/react`, `@testing-library/user-event`, `@testing-library/jest-dom`, `jsdom`
  - `vitest.config.ts` com `environment: 'jsdom'`, path aliases espelhando `tsconfig.json`
  - `vitest.setup.ts` com `import '@testing-library/jest-dom/vitest'`
  - 1 teste smoke em `src/app/page.test.tsx` renderizando a home
  - `package.json` declara `"shared": "workspace:*"` nos `dependencies`
  - `.env.example` com `NEXT_PUBLIC_API_URL=http://localhost:3333`
  - Validação: `pnpm --filter web dev` sobe em `:3000`; browser renderiza a home; `pnpm --filter web test` passa

---

## Fase 2 — Lint, format, scripts

- [x] **BOT-11** [S] — ✅ commit `1653a4e` (per-package instead of root-only, mirroring money-assistance) — ESLint flat config na raiz:
  - `eslint.config.mjs` com imports de `@eslint/js`, `typescript-eslint`, `eslint-config-next` (bridged se necessário)
  - Base config aplica em `**/*.{ts,tsx}`: TS strict rules + import ordering (regra do CLAUDE.md: builtin → external → internal → parent → sibling → index, alfabético intra-grupo)
  - Overrides:
    - `apps/api/**` → regras NestJS, permite decorators
    - `apps/web/**` → regras React/Next (`eslint-config-next`), permite JSX
    - `packages/shared/**` → só base
  - Scripts `lint` em cada package: `eslint . --max-warnings=0`
  - Validação: `pnpm lint` passa verde em todos os packages

- [x] **BOT-12** [S] — ✅ commit `1653a4e` — Prettier + editorconfig:
  - `.prettierrc` na raiz: `singleQuote: true`, `trailingComma: 'all'`, `printWidth: 100`
  - `.prettierignore` cobre `dist/`, `.next/`, `node_modules/`, `coverage/`, `pnpm-lock.yaml`
  - `.editorconfig` padrão (`indent_style = space`, `indent_size = 2`, `end_of_line = lf`, `insert_final_newline = true`, `charset = utf-8`)
  - `prettier` como devDep na raiz (não por package — compartilhado)
  - Scripts raiz: `"format": "prettier --write ."`, `"format:check": "prettier --check ."`
  - Validação: `pnpm format:check` passa (depois de um `pnpm format` inicial)

---

## Fase 3 — Dev flow + validação final

- [x] **BOT-13** [S] — ✅ delivered as part of commit `c70025e` (root script) + validated in Bundle F — Scripts `pnpm dev` paralelo:
  - Script raiz `"dev": "pnpm -r --parallel --filter './apps/*' dev"` roda `apps/api dev` e `apps/web dev` juntos
  - Script `"shared:dev": "pnpm --filter shared dev"` roda tsc watch do shared em terminal separado (opcional, só se dev tiver mudando shared ao vivo)
  - Validação: `pnpm dev` sobe api `:3333` e web `:3000` sem crash; ambos respondem

- [x] **BOT-14** [S] — ✅ Bundle F — README §12 rewritten, host port moved to 5434, `agentRules: false` on Next (removes auto-generated AGENTS.md), smoke run: Postgres healthy, migrate ok, `pnpm dev` boots both, `/health` returns `{status:'ok', db:'ok'}`, web `/` returns 200 — Quick-start no README + smoke end-to-end:
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
