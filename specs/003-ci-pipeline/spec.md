# 003 — CI pipeline (SPEC)

> Status: **specification only**. Nenhuma implementação ainda. Companion a
> `plan.md` (abordagem) e `tasks.md` (quebra executável).

## 1. Resumo

Pipeline de GitHub Actions que roda em todo PR e em todo push pra `main`, cobrindo lint, typecheck, test e build dos três packages do monorepo (`apps/api`, `apps/web`, `packages/shared`). Jobs paralelos, cache de `pnpm store` entre runs, saída previsível e required pra proteger `main`.

## 2. Escopo

**Dentro**
- Workflow `.github/workflows/ci.yml` com jobs paralelos: `install`, `lint`, `typecheck`, `test`, `build`
- Cache do pnpm store (chave: lock hash)
- Setup matricial (Node 20 por enquanto; estrutura pronta pra expandir)
- Service container Postgres pros testes e2e do `apps/api`
- Required checks declarados pra branch protection (`main`)
- `.github/CODEOWNERS` auto-assign `@Felpasw`
- `.github/pull_request_template.md` lembrando: Conventional Commits, tag `[BOT-N]`, English-only commit subject, checklist de testes
- ADR `docs/adr/0001-ci-pipeline.md` documentando a decisão

**Fora**
- Workflows de release (`release-please.yml`, `version-preview.yml`, `commitlint.yml`) — vêm do `001-release-management`, esse spec só **referencia** eles como required checks
- Deploy automatizado (vira spec próprio quando a infra de deploy for decidida)
- Coverage report publicado (ex: Codecov) — opcional, decisão em `plan.md`
- E2E com Playwright no CI headless — entra junto com `005-wifi-insights` quando houver UI real pra testar
- Enabling branch protection pela API — passo manual via GitHub UI (documentado no ADR)

## 3. Workflow `.github/workflows/ci.yml`

### 3.1 Triggers

```yaml
on:
  pull_request:
    branches: [main]
  push:
    branches: [main]
```

### 3.2 Jobs

Todos partem do mesmo setup (checkout + pnpm + node + install com cache). Pra evitar reinstalar em cada job, usamos cache do `pnpm store` via `actions/cache` com chave `${{ runner.os }}-pnpm-${{ hashFiles('pnpm-lock.yaml') }}`.

```yaml
jobs:
  lint:
    name: lint
    runs-on: ubuntu-latest
    steps: [checkout, setup pnpm, setup node 20, install (cached), pnpm lint]

  typecheck:
    name: typecheck
    runs-on: ubuntu-latest
    steps: [checkout, setup pnpm, setup node 20, install (cached), pnpm --filter api prisma generate, pnpm typecheck]

  test:
    name: test
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: { POSTGRES_USER: ci, POSTGRES_PASSWORD: ci, POSTGRES_DB: ci }
        ports: ['5432:5432']
        options: --health-cmd pg_isready ...
    env:
      DATABASE_URL: postgresql://ci:ci@localhost:5432/ci
    steps: [checkout, setup pnpm, setup node 20, install (cached), pnpm --filter api prisma migrate deploy, pnpm test]

  build:
    name: build
    runs-on: ubuntu-latest
    needs: [typecheck]
    steps: [checkout, setup pnpm, setup node 20, install (cached), pnpm -r build]
```

**Rationale do `build` depender de `typecheck`:** se tipos quebram, build vai quebrar com erro pior de ler — fail-fast com typecheck é mais rápido e barato.

**Rationale do `lint` e `test` paralelos a `typecheck`:** não dependem de `tsc` ter rodado (eslint tem seu próprio parser; jest usa ts-jest/swc). Rodar em paralelo corta tempo total.

### 3.3 Required checks (branch protection manual)

Pra proteger `main`:

- `lint`
- `typecheck`
- `test`
- `build`
- `commitlint` (vem do workflow `commitlint.yml` do `001`)

Release PR do release-please também é bloqueada por esses — garante que ninguém mergeia bump com código quebrado.

## 4. Matriz Node

Começa com Node 20 só. Estrutura preparada pra matrix se precisar validar 22 depois:

```yaml
strategy:
  matrix:
    node: [20]
runs-on: ubuntu-latest
```

## 5. Cache de dependências

- `actions/setup-node@v4` com `cache: 'pnpm'` cuida do cache do pnpm store automaticamente
- Chave implícita: hash do `pnpm-lock.yaml`
- Economia esperada: install de ~90s cai pra ~15s em cache hit
- `postinstall` do `apps/api` roda `prisma generate` — não cacheamos o client gerado (é pequeno e Prisma recomenda regenerar)

## 6. Service container Postgres (job `test`)

Testes e2e do `apps/api` precisam de DB real. Opções:

- **(A)** Service container do GitHub Actions (parte do runner, isolado por job)
- **(B)** Testcontainers no próprio Jest (sobe container na hora)

Decisão: **(A) pra CI, (B) pra dev local**. Rationale:
- Service container inicializa 1x por job, mais rápido que Testcontainers que sobe por teste
- Testcontainers continua útil local pra isolamento de teste individual (sem precisar Postgres rodando previamente)
- O código de teste é agnóstico: lê `DATABASE_URL` do env, não sabe se é container ou service

## 7. CODEOWNERS

```
# .github/CODEOWNERS
* @Felpasw
```

Auto-assigna `@Felpasw` como reviewer em todo PR. Enquanto projeto é solo, serve de proteção contra "merge sem self-review consciente".

## 8. PR template

`.github/pull_request_template.md`:

```markdown
## Resumo
<!-- O que mudou e por quê -->

## Task
<!-- BOT-N e link pro item em specs/NNN-slug/tasks.md -->

## Checklist
- [ ] Commits seguem Conventional Commits em inglês
- [ ] Subject do PR tem o tag `[BOT-N]` no final (vira o subject do squash merge)
- [ ] Testes adicionados/atualizados (TDD aplicado)
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build` passam localmente
- [ ] `tasks.md` da fase marcado conforme progresso

## Como testar
<!-- Passos reproduzíveis -->

## Screenshots (se UI)
```

## 9. ADR `docs/adr/0001-ci-pipeline.md`

Documenta:
- A decisão de usar GitHub Actions (vs CircleCI/BuildKite)
- Jobs paralelos com cache compartilhado via pnpm store
- Service container pra Postgres em CI, Testcontainers em dev
- Required checks pra branch protection
- Alternativas descartadas (ex: um único job sequencial — pior fail-fast)

## 10. Critérios de sucesso

- Workflow `ci.yml` roda e passa em um PR dummy que só mexe no README
- Jobs rodam em paralelo (verificável no gráfico do Actions)
- Cache hit no 2º run reduz tempo de install em pelo menos 70%
- Falha de lint num arquivo quebra o job `lint` sem impactar `typecheck`/`test`/`build` imediatamente (mas o PR fica bloqueado pelo check vermelho)
- Service container Postgres sobe healthy antes dos testes rodarem
- Teste e2e `health.e2e-spec.ts` passa no CI
- Branch protection, após configurada manualmente, exige todos os 5 required checks
- Release PR do release-please é bloqueada quando qualquer check tá vermelho
- CODEOWNERS auto-assigna `@Felpasw` em todo novo PR

## 11. Riscos e mitigações

| Risco | Mitigação |
|---|---|
| `prisma generate` precisa rodar antes de `typecheck` que importa `@prisma/client` | Passo explícito `pnpm --filter api prisma generate` antes de `pnpm typecheck` no job |
| Service container Postgres não tá pronto quando teste tenta conectar | `pg_isready` healthcheck no service + action espera healthy |
| Cache corrupto bloqueia install | Cache tem chave hash do lock — mudança no lock invalida; worst case, dev deleta cache pela UI |
| Jest em paralelo esgota memória do runner GitHub (ubuntu-latest = 7GB) | `--max-workers=2` por default; ajustar se necessário |
| Testcontainers tenta subir no CI mesmo com service container disponível | Guard por env var: `if (process.env.CI) use service container else use Testcontainers` no helper de teste |
| CI roda `pnpm -r build` e `apps/web` build falha por falta de env `NEXT_PUBLIC_API_URL` | `.env.ci` no `apps/web` com valor dummy válido só pra build passar |

## 12. Dependências

- **Depende de**: `001-release-management` (workflow `commitlint.yml` vem de lá, não duplicar) + `002-bootstrap` (scripts `lint`/`typecheck`/`test`/`build` precisam existir pra CI chamar)
- **Habilita**: branch protection confiável na `main`; release-please auto-merge seguro (checks precisam estar verdes antes do bot mergear a Release PR)
