# CI pipeline (BOT-15 … BOT-21)

> **Depende de `001-release-management` e `002-bootstrap` concluídos.** `001` fornece `commitlint.yml`; `002` fornece os scripts `pnpm lint/typecheck/test/build` que esse workflow vai chamar.
>
> Companion a `spec.md` (o quê) e `plan.md` (como/decisões/riscos).

## Decisões (recap do `plan.md`)

- GitHub Actions, 4 jobs paralelos (`lint`, `typecheck`, `test`, `build`), cache do pnpm store
- Node 20 fixo (matriz pronta pra expandir)
- Service container Postgres pro job `test`, Testcontainers continua em dev
- 5 required checks pra branch protection (`lint`, `typecheck`, `test`, `build`, `commitlint`)
- Branch protection ligada manualmente via GitHub UI (não automatizada)
- Coverage e Playwright adiados pra quando houver código de domínio
- ADR documentando as decisões em `docs/adr/0001-ci-pipeline.md`

## Convenções

- Todas `[S]` sequenciais (`plan.md` §5)
- Scope dos commits: `ci(repo):` pra workflows, `chore(repo):` pra CODEOWNERS/PR template, `docs(repo):` pro ADR
- Bundles sugeridos no `plan.md` §6

---

## Fase 0 — Workflow de CI

- [ ] **BOT-15** [S] — `ci.yml` base com `lint` e `typecheck`:
  - `.github/workflows/ci.yml`
  - Triggers: `pull_request` em `main`, `push` em `main`
  - Setup shared steps: `actions/checkout@v4`, `pnpm/action-setup@v4` (version 9), `actions/setup-node@v4` (node 20, cache: 'pnpm'), `pnpm install --frozen-lockfile`
  - Job `lint`: `pnpm lint`
  - Job `typecheck`: `pnpm --filter api prisma generate` → `pnpm typecheck`
  - Validação: PR dummy mexendo no README dispara ambos os jobs; ambos verdes

- [ ] **BOT-16** [S] — Job `test` com Postgres:
  - Adiciona job `test` ao `ci.yml`
  - `services.postgres`: image `postgres:16-alpine`, user/pass/db `ci/ci/ci`, porta `5432:5432`, healthcheck `pg_isready`
  - Steps: setup shared + `pnpm --filter api prisma generate` + `pnpm --filter api prisma migrate deploy` (com `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci`) + `pnpm test`
  - Validação: PR dummy dispara `test`; `health.e2e-spec.ts` passa contra o service container

- [ ] **BOT-17** [S] — Job `build`:
  - Adiciona job `build` ao `ci.yml` com `needs: [typecheck]`
  - Steps: setup shared + `pnpm --filter api prisma generate` + `pnpm -r build`
  - `apps/web` precisa de `NEXT_PUBLIC_API_URL` pra build passar — definir env dummy no job (`NEXT_PUBLIC_API_URL: http://localhost:3333`)
  - Validação: PR dummy dispara `build` só depois de `typecheck` passar; build verde

---

## Fase 1 — Convenções de repo

- [ ] **BOT-18** [S] — `.github/CODEOWNERS`:
  - Conteúdo: `* @Felpasw`
  - Validação: próximo PR mostra `@Felpasw` auto-assigned como reviewer

- [ ] **BOT-19** [S] — `.github/pull_request_template.md`:
  - Seções: Resumo, Task (`BOT-N` + link), Checklist (CC em inglês, tag `[BOT-N]`, testes TDD, lint/typecheck/test/build local verde, `tasks.md` atualizado), Como testar, Screenshots (opcional)
  - Validação: próximo PR nasce com o template preenchido pelo GitHub

---

## Fase 2 — Documentação e lock

- [ ] **BOT-20** [S] — ADR `docs/adr/0001-ci-pipeline.md`:
  - Formato padrão: Context / Decision / Alternatives considered / Consequences
  - Documenta: escolha de GitHub Actions, jobs paralelos, service container vs Testcontainers, required checks pra branch protection, decisão de manter branch protection manual
  - Lista alternativas descartadas: CircleCI, job sequencial único, API pra branch protection, publicar coverage agora

- [ ] **BOT-21** [S] [HUMANO] — Habilitar branch protection em `main` (GitHub UI):
  - Settings → Branches → Add rule → `main`
  - Marcar:
    - Require a pull request before merging (1 approval, dismiss stale approvals on new commits)
    - Require status checks to pass before merging + require branches up to date
      - Checks obrigatórios: `lint`, `typecheck`, `test`, `build`, `commitlint`
    - Require linear history
    - Require conversation resolution before merging
    - **Allow squash merge only** (desabilitar merge commit e rebase)
    - **Allow auto-merge**
    - Restrict push (só admin, break-glass)
    - **Não** permitir force push nem deletion
  - Atualizar o ADR `0001-ci-pipeline.md` com a data em que foi habilitada + screenshot (opcional)

---

## Checklist de encerramento

- [ ] PR com só `README.md` touch dispara `ci.yml` → todos os 4 jobs verdes em < 5 min
- [ ] Cache hit no 2º run reduz tempo do step de install em pelo menos 70%
- [ ] Teste e2e `health.e2e-spec.ts` passa contra o service container Postgres
- [ ] Falha de lint num arquivo quebra `lint` sem afetar `typecheck`/`test`/`build` imediatamente
- [ ] Falha de typecheck bloqueia o job `build` (via `needs`)
- [ ] CODEOWNERS auto-assigna `@Felpasw` em todo novo PR
- [ ] PR template aparece pré-preenchido ao criar PR novo
- [ ] Branch protection ligada em `main` com 5 required checks
- [ ] Push direto em `main` por não-admin é rejeitado
- [ ] Release PR do release-please é bloqueada quando algum check tá vermelho
- [ ] ADR `0001-ci-pipeline.md` commitado e aponta pra data de habilitação da branch protection

## Fora do escopo (vai pra specs seguintes)

- Deploy automatizado após release
- Coverage publicado (Codecov/Coveralls)
- Playwright E2E headless (vem com `004-auth` ou `005-wifi-insights`)
- Linter de SQL/migrations
- Dockerfiles de prod + build no CI
- Dependabot/Renovate (configuração fora de workflow custom)
