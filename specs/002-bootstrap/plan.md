# 002 — Bootstrap (PLAN)

> Status: **planning only**. Decisões ficam aqui; execução vai pra `tasks.md`.

## 1. Objetivo

Entregar um monorepo onde o próximo dev (ou o próprio Felpa dois meses depois) consegue clonar, rodar `pnpm install && docker compose up -d && pnpm --filter api db:migrate && pnpm dev` e ter `api` + `web` + Postgres funcionando — zero código de domínio, 100% da infra pronta pra quem vier adicionar `auth` em `004` e `wifi-insights` em `005`.

## 2. Ordem de execução (por que importa)

1. **Workspace primeiro** (pnpm + tsconfig base + eslint/prettier) — sem isso, instalar deps nos apps vira retrabalho
2. **Docker + Postgres** antes do Prisma — Prisma precisa de DB vivo pra `migrate dev`
3. **Shared** antes dos apps — se api/web referenciam `shared` sem o package existir, instala quebra
4. **API** antes de **Web** — web depende de `NEXT_PUBLIC_API_URL` apontando pra algo real pra o smoke test
5. **README quick-start** por último — só documenta depois que o fluxo foi validado end-to-end

## 3. Estratégia de "zero código de domínio"

Tentação clássica: aproveitar o bootstrap pra já criar `User`, módulo `auth`, página de login, "só pra ter alguma coisa". **Não.**

Justificativa:
- O schema do Prisma vai mudar várias vezes conforme `004-auth` e `005-wifi-insights` detalham modelo. Criar entidade agora = retrabalho + migrations órfãs.
- Health check sem domínio é smoke test suficiente pra provar que a stack funciona.
- Separação limpa: quando a Release PR de `002` for revisada, o diff é 100% infra. Mais fácil pro reviewer.

Exceção aceita: `GET /health` com `SELECT 1` no Prisma — é o único "código executável" que roda. Vive em `apps/api/src/modules/health/`.

## 4. Decisões técnicas tomadas

### 4.1 Node 20, pnpm 9, TypeScript 5.x strict

Padrão atual estável. `.nvmrc` fixa, CI matrix bate.

### 4.2 Prisma, não TypeORM

- Padrão do `money-assistance` (referência de arquitetura)
- Schema declarativo + migrations versionadas é mais previsível
- Prisma Studio é uma mão na roda em dev
- `prisma generate` no `postinstall` do api garante que o client esteja sempre em dia

### 4.3 Shared via build (tsc), não via ts-paths

Opções:
- (A) `ts-paths` com import direto do `src/` — zero build step
- (B) Build com `tsc` e consumir `dist/` — build explícito

Decisão: **(B)**. Rationale:
- Vercel/Next.js tem fricção com ts-paths cross-workspace (precisa `transpilePackages` + às vezes bundler config)
- Build explícito expõe quebra de API cedo (CI do `003` roda `pnpm -r build` e vai falhar se shared quebrar)
- Topological ordering do pnpm cuida da ordem (`shared` builda antes de `api`/`web` que dependem dele)

Preço: 1 passo a mais no desenvolvimento (precisa rodar `pnpm --filter shared build` ou `pnpm -w build` depois de mudar shared). Mitigação: `pnpm --filter shared dev` com `tsc --watch` roda em paralelo com o `pnpm dev` dos apps.

### 4.4 ESLint flat config (eslint v9+)

- Moderno, mais performático, menos arquivos
- Risco: `eslint-config-next` legacy — mitigado pinnando versão compatível ou usando bridge

Alternativa descartada: `.eslintrc.cjs` por package — mais arquivos, config duplicada.

### 4.5 Jest no api, Vitest no web (padrão `money-assistance`)

Decisão: **Jest no `apps/api`, Vitest no `apps/web` e `packages/shared`**. Rationale:
- `apps/api`: Jest é default do NestJS, zero fricção com `@nestjs/testing` + `supertest` + Testcontainers
- `apps/web`: Vitest + Testing Library + jsdom bate com o padrão do `money-assistance` (`web/vitest.config.ts`), hot reload rápido e integração nativa com Vite/Next
- `packages/shared`: Vitest (compartilha setup com web; schemas Zod se beneficiam do watch rápido)

Preço: 2 runners pra manter. Aceito — comando `pnpm test` em cada package é agnóstico (chama o runner nativo do package).

### 4.6 Docker Compose só com Postgres

Reafirma a decisão da conversa: zero Redis, zero Mailpit, zero MinIO. Se algum serviço local for necessário depois, adiciona por spec que precisar.

### 4.7 CORS liberado só pro `NEXT_PUBLIC_API_URL`

`apps/api/main.ts` lê `CORS_ORIGIN` do env, defaults `http://localhost:3000`. Sem CORS wildcard em nenhum momento.

### 4.8 Logger

Pino desde o início no api (mesmo sem request id ou nível por módulo configurado ainda). Barato de setar agora, custoso de retrofitar depois.

## 5. Dependências entre tasks

```
BOT-6 (workspace raiz)
   └─ BOT-7 (docker-compose + envs)
         └─ BOT-8 (apps/api NestJS skeleton + Prisma init + health)
                 └─ BOT-10 (packages/shared smoke export)
                         └─ BOT-9 (apps/web Next.js skeleton + consome shared)
                               └─ BOT-11 (eslint flat config com overrides)
                                     └─ BOT-12 (prettier + editorconfig)
                                           └─ BOT-13 (scripts pnpm dev paralelo)
                                                 └─ BOT-14 (README quick-start + smoke e2e)
```

Toda task `[S]` (sequencial). Nenhuma paralelizável — bootstrap de infra é inerentemente ordenado.

## 6. Bundles de commit sugeridos

Pra reduzir ruído na Release PR:

- **Bundle A** (feat: workspace foundation): BOT-6 + BOT-7 + BOT-11 + BOT-12
- **Bundle B** (feat: api skeleton with health): BOT-8
- **Bundle C** (feat: shared package smoke): BOT-10
- **Bundle D** (feat: web skeleton with api client): BOT-9
- **Bundle E** (chore: dev scripts and quick-start): BOT-13 + BOT-14

5 bundles. Cada um vira 1 PR → 1 bump por package afetado via release-please.

Scope dos commits:
- Workspace/root → `chore(repo):` ou `build(repo):`
- apps/api → `feat(api):`
- apps/web → `feat(web):`
- packages/shared → `feat(shared):`

## 7. Riscos arquiteturais

### 7.1 Prisma Client gerado em `node_modules/.prisma` vira dor em CI

CI roda `pnpm install --frozen-lockfile` e precisa de `prisma generate` antes de qualquer typecheck que use `@prisma/client`. Mitigação: `postinstall` do `apps/api` roda `prisma generate` automaticamente. CI do `003` adiciona `pnpm --filter api prisma generate` como passo explícito defensivo.

### 7.2 Monorepo e Testcontainers

Testes de repository usam Testcontainers (Postgres real descartável). CI precisa de Docker-in-Docker ou do runner com Docker socket. GitHub Actions default já tem Docker — fica validado em `003`.

### 7.3 Next.js 15 App Router + TanStack Query SSR

TanStack Query v5 tem padrão específico pra Server Components (`HydrationBoundary`). Risco: aqui a página home é só placeholder, mas quando `005` for criar o dashboard real, o padrão SSR precisa estar certo. Mitigação: documentar no spec `005` que a dashboard page sai Server Component pra hidratar `useQuery` no client; `providers.tsx` já tá pronto pra isso.

### 7.4 Health check acoplado ao Prisma

Se Prisma crasha o módulo `health` crasha junto. Aceito — é o que a gente quer medir. Alternativa seria desacoplar, mas aumenta complexidade sem benefício no bootstrap.

## 8. Alternativas descartadas (pra registro)

- **Nx / Turborepo**: overkill pra monorepo com 3 packages. pnpm workspaces + scripts raiz basta e é mais transparente.
- **Yarn Berry (PnP)**: pnpm já é a escolha do `money-assistance`, mantém consistência.
- **tRPC em vez de REST**: foge do escopo do desafio ("API REST + Swagger" tá no `pinto[.md`); tRPC acopla front e back, perde o critério "qualidade de documentação de API".
- **GraphQL**: mesmo motivo, excesso de complexidade pro escopo.
- **Dockerfile pros apps nesta fase**: deploy entra em outra fase; local roda nativo via `pnpm dev`.

## 9. Fora do escopo deste spec

- Dockerfiles de prod
- Scripts de seed (entram em `005-wifi-insights` com dados realistas)
- shadcn/ui init (entra quando a primeira página real pedir, em `004-auth`)
- Swagger config (entra em `005-wifi-insights` quando houver endpoints de verdade)
- Pino com request-id interceptor (entra junto com o primeiro endpoint real)

## 10. Próximo passo

Validar o `tasks.md`, abrir branch `BOT-6/felpa-workspace-foundation`, começar pela bundle A.
