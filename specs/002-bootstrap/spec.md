# 002 — Bootstrap (SPEC)

> Status: **specification only**. Nenhuma implementação ainda. Companion a
> `plan.md` (abordagem) e `tasks.md` (quebra executável).

## 1. Resumo

Levantar o esqueleto do monorepo com todas as peças de infra que o resto das fases vai consumir, **sem código de domínio**. Ao final: `pnpm dev` roda `apps/api` (NestJS com health check) e `apps/web` (Next.js com página home) em paralelo contra Postgres via `docker-compose`, Prisma inicializado, `packages/shared` importável nos dois, lint/prettier/eslint configurados e verdes.

## 2. Escopo

**Dentro**

- `pnpm-workspace.yaml` + root `package.json` + `.nvmrc` + `tsconfig.base.json`
- `docker-compose.yml` com Postgres 16 (sem Redis)
- `apps/api/` — NestJS skeleton com módulo `health`, Prisma inicializado (schema + migration de "init"), `.env.example`, Jest configurado, estrutura **igual ao `money-assistance`**: módulos de domínio direto em `src/<module>/` (não em `src/modules/<module>/`), `src/@common/` pros helpers cross-module (com `domain/` e `infrastructure/` por dentro), `src/infrastructure/prisma/` pro PrismaService global, `src/config/`, `src/main.ts`
- `apps/web/` — Next.js (App Router) skeleton com página `/` placeholder, `.env.example`, estrutura **igual ao `money-assistance`**: `src/api.ts` (axios com `withCredentials: true`), `src/lib/queryClient.ts` (TanStack Query config com retry policy e stale/gc times), `src/services/` (classes implementando interfaces), `src/hooks/` (classes agrupando TanStack hooks), `src/stores/` (Zustand com persist), `src/components/{atoms,molecules,organisms,templates,ui}` (Atomic Design + shadcn), `src/lib/`, `src/utils/`, `src/@types/`. Tailwind init + **shadcn/ui init** (components.json) + **Vitest** + **Testing Library** + **jsdom** configurados
- `packages/shared/` — build via `tsc`, `src/index.ts` exportando 1 tipo smoke que `api` e `web` consomem
- ESLint config na raiz com overrides por package (api/web/shared têm necessidades diferentes)
- Prettier + `.editorconfig`
- `.gitignore` cobrindo `node_modules`, `dist`, `.next`, `.env`, builds, logs, caches, o PDF do desafio e o `pinto[.md`
- Scripts root: `pnpm dev` (api + web paralelo), `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`
- README **quick-start** validado end-to-end (`pnpm install` → `docker compose up -d` → `pnpm --filter api db:migrate` → `pnpm dev` → `GET /health` responde)

**Fora**

- Nenhum endpoint de domínio (`stores`, `connections`, `analytics`, `notifications`, `auth`) — tudo vai pra `004-auth` e `005-wifi-insights`
- CI/CD (pipelines de GitHub Actions pros testes vivem em `003-ci-pipeline`; só os workflows de release vêm do `001`)
- Deploy pra Vercel/Fly/Railway
- Configuração de SSE, cron, event-emitter (entram quando o módulo de notificações pedir)
- UI componentes (shadcn init etc.) — entra quando a primeira página real pedir, em `004-auth` ou `005-wifi-insights`

## 3. Estrutura de pastas resultante

```
boticario/
  apps/
    api/
      prisma/
        schema.prisma
        migrations/
      src/
        health/
          health.controller.ts
          health.module.ts
          health.service.ts
        @common/
          domain/
            constants/
            ports/
          infrastructure/
            pipes/
            logging/
        infrastructure/
          prisma/
            prisma.module.ts
            prisma.service.ts
        config/
        app.module.ts
        app.controller.ts
        app.service.ts
        main.ts
      test/
        health.e2e-spec.ts
      .env.example
      jest.config.ts
      tsconfig.json
      nest-cli.json
      package.json
      CHANGELOG.md
    web/
      src/
        app/
          (auth)/              # route group pra páginas sem shell
          (app)/               # route group pra páginas com shell autenticado
          layout.tsx
          page.tsx
          providers.tsx        # QueryClientProvider + outros providers
          globals.css
        api.ts                 # axios instance (withCredentials: true)
        globals.ts             # API_URL + constantes globais
        lib/
          queryClient.ts       # TanStack Query config
          utils.ts             # cn() do shadcn
        services/
          interfaces/
        hooks/
          interfaces/
          constants/
          utils/
        stores/                # Zustand com persist
        components/
          atoms/
          molecules/
          organisms/
          templates/
          ui/                  # shadcn/ui components
        utils/                 # funções puras (formatters)
        @types/
      components.json          # shadcn config
      .env.example
      vitest.config.ts
      vitest.setup.ts
      tailwind.config.ts
      postcss.config.mjs
      next.config.ts
      tsconfig.json
      package.json
      CHANGELOG.md
  packages/
    shared/
      src/
        index.ts                # export smoke de 1 tipo (ex: HealthResponseSchema)
      tsconfig.json
      package.json
  docker-compose.yml
  pnpm-workspace.yaml
  package.json
  tsconfig.base.json
  .nvmrc
  .editorconfig
  .gitignore
  .prettierrc
  .prettierignore
  eslint.config.mjs
```

## 4. Decisões técnicas

### 4.1 pnpm workspaces

```yaml
# pnpm-workspace.yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

Root `package.json` tem `"packageManager": "pnpm@9.x"`, scripts top-level e devDeps compartilhadas (eslint, prettier, husky, commitlint, typescript).

### 4.2 Node 20

`.nvmrc` com `20`. CI usa Node 20 na matrix. Dockerfile futuro parte de `node:20-alpine`.

### 4.3 TypeScript strict em todos os packages

`tsconfig.base.json` na raiz com `"strict": true`, `"noUncheckedIndexedAccess": true`, `"exactOptionalPropertyTypes": true`. Cada package estende via `"extends": "../../tsconfig.base.json"`.

### 4.4 Prisma — single schema no `apps/api/prisma/schema.prisma`

- Source of truth do schema
- `DATABASE_URL` lido via `.env` do `apps/api`
- Migration inicial vazia (`prisma migrate dev --name init --create-only`) só pra validar conexão + registrar baseline
- `prisma generate` roda no `postinstall` do `apps/api`
- `db:push` **proibido** em prod (regra do CLAUDE.md global); migrations versionadas obrigatórias

### 4.5 Shared package — build via tsc

- `packages/shared/package.json` com `"main": "./dist/index.js"`, `"types": "./dist/index.d.ts"`, `"scripts": { "build": "tsc" }`
- Dependentes referenciam com `"shared": "workspace:*"` nos `dependencies`
- `pnpm -r build` constrói shared primeiro (ordenação topológica do pnpm cuida disso)

Alternativa considerada: ts-paths com import direto do source (sem build). Decisão: build explícito, mais previsível em CI e em ambientes serverless (Vercel não gosta de ts-paths cross-workspace).

### 4.6 ESLint — flat config na raiz

Um `eslint.config.mjs` na raiz com overrides por `files` glob:

- `apps/api/**` → regras NestJS (prefere `@typescript-eslint/*`)
- `apps/web/**` → `eslint-config-next` + regras React
- `packages/shared/**` → só TS base
- Comum: `no-console`, `no-unused-vars`, imports ordenados (regra do CLAUDE.md)

### 4.7 Docker Compose — Postgres only

```yaml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: boticario
      POSTGRES_PASSWORD: boticario
      POSTGRES_DB: boticario
    ports:
      - '5432:5432'
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U boticario']
      interval: 5s
      timeout: 3s
      retries: 10

volumes:
  postgres-data:
```

Zero Redis — reafirma a decisão de notificações in-process.

### 4.8 Scripts root

```json
{
  "scripts": {
    "dev": "pnpm -r --parallel --filter './apps/*' dev",
    "build": "pnpm -r build",
    "lint": "pnpm -r lint",
    "typecheck": "pnpm -r typecheck",
    "test": "pnpm -r test",
    "prepare": "husky"
  }
}
```

`dev` roda `api` e `web` em paralelo (output interleaved — ok pra dev local).

### 4.9 Health check como smoke test da fase

- `GET /health` responde `{ status: 'ok', db: 'ok', timestamp: '...' }`
- Faz `SELECT 1` no Prisma pra provar que a conexão com Postgres tá viva
- Serve de smoke test manual (quick-start do README) e automatizado (teste e2e com supertest)

### 4.10 Auth — fora deste spec

Esse spec **não** cria tabelas `User`/`Session`, nem endpoints de auth, nem páginas de login. Entra em `004-auth`. O schema do Prisma aqui vai nascer vazio (só o setup).

## 5. Variáveis de ambiente

### `apps/api/.env.example`

```
DATABASE_URL=postgresql://boticario:boticario@localhost:5432/boticario
PORT=3333
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### `apps/web/.env.example`

```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

Secrets de domínio (`SESSION_COOKIE_SECRET`, `MAC_HASH_SECRET`) entram quando as fases que precisam deles chegarem.

## 6. Critérios de sucesso

- `pnpm install` instala tudo sem warning crítico e dispara o hook do husky (vindo de BOT-4)
- `docker compose up -d` sobe Postgres saudável (`pg_isready` responde)
- `pnpm --filter api db:migrate` roda a migration inicial com sucesso
- `pnpm dev` sobe api em `:3333` e web em `:3000` sem crash
- `curl http://localhost:3333/health` responde `200` com `db: 'ok'`
- Browser em `http://localhost:3000` renderiza a página home (placeholder)
- `pnpm lint`, `pnpm typecheck`, `pnpm build`, `pnpm test` passam todos verde
- Teste e2e `health.e2e-spec.ts` em `apps/api` passa contra Postgres do docker-compose
- Shared package é importável de `apps/api` e `apps/web` sem erro de resolução
- `.gitignore` cobre tudo que não deve ir pro git (confirmado via `git status` limpo após `pnpm install` + `docker compose up -d` + build)

## 7. Riscos e mitigações

| Risco                                                                                          | Mitigação                                                                                                   |
| ---------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Prisma `generate` quebra no primeiro `pnpm install` (DB offline)                               | `postinstall` tolera DB offline (só gera client). Migration roda em passo separado                          |
| TanStack Query SSR vs Client Component no App Router                                           | `providers.tsx` como Client Component wrapper no `layout.tsx`; teste manual que a página home carrega       |
| ESLint flat config conflita com `eslint-config-next` (que ainda usa legacy em algumas versões) | Pinnar versão do `eslint-config-next` compatível; se incompatível, fallback pra `.eslintrc.cjs` por package |
| `shared` não encontrado em runtime do Next (SSR)                                               | `transpilePackages: ['shared']` no `next.config.ts` resolve                                                 |
| Health check passa mas DB tá sem schema                                                        | Teste e2e roda `prisma migrate deploy` no setup                                                             |
| Dev esquece de rodar migration e fica confuso                                                  | README quick-start deixa a ordem explícita; `pnpm db:migrate` como alias claro                              |

## 8. Dependência de outras fases

- **Depende de**: `001-release-management` concluído (porque `BOT-1` cria stubs de `apps/api/package.json` e `apps/web/package.json` que esse spec vai preencher — não sobrescreve o `version`).
- **Habilita**: `003-ci-pipeline` (CI precisa dos scripts `lint`/`typecheck`/`test`/`build` existindo pra rodar), `004-auth`, `005-wifi-insights`.
