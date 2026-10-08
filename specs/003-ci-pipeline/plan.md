# 003 — CI pipeline (PLAN)

> Status: **planning only**. Decisões ficam aqui; execução vai pra `tasks.md`.

## 1. Objetivo

Garantir que todo commit que entra em `main` passou por lint, typecheck, test e build dos três packages, com feedback rápido (< 5 min total) e required checks que bloqueiam merges quebrados — inclusive a Release PR do release-please.

## 2. Fluxo esperado end-to-end

1. Dev abre PR a partir de `BOT-N/felpa-<slug>` pra `main`.
2. GitHub dispara 5 workflows:
   - `ci.yml` → `lint`, `typecheck`, `test`, `build` (deste spec)
   - `commitlint.yml` → valida commits do PR (do `001`)
   - `version-preview.yml` → comenta o bump previsto (do `001`)
3. Dev revisa, corrige se algo quebrou, pede review (CODEOWNERS auto-assigna).
4. Com todos os checks verdes + review aprovada, PR é squash-merged em `main`.
5. Push em `main` dispara `release-please.yml` → abre/atualiza Release PR.
6. Release PR também passa por `ci.yml` + `commitlint.yml` — só auto-merge quando tudo verde.

## 3. Decisões técnicas

### 3.1 GitHub Actions como provider — DECIDIDO

Pros:
- Integração nativa com GitHub (status checks, PR comments, branch protection)
- Grátis pra repos públicos; free tier generoso pra privados
- Service containers resolvem Postgres sem Testcontainers no CI
- Ecossistema maduro de actions (`actions/setup-node`, `pnpm/action-setup`, etc.)

Descartados:
- **CircleCI**: config em YAML mais verboso, outra conta pra gerenciar
- **BuildKite**: hospedar runners próprios é overkill
- **Self-hosted GitHub runners**: desnecessário no volume do projeto

### 3.2 Jobs paralelos vs sequencial — DECIDIDO: paralelo

Opções:
- **Único job sequencial** (`install → lint → typecheck → test → build`): simples, mas falha de lint faz você esperar o install completar, e falha de teste faz você esperar lint rodar
- **Jobs paralelos** com cache de install compartilhado: feedback mais rápido do primeiro erro (fail-fast efetivo), tempo total menor

Decisão: **paralelo**. Preço: 4 jobs rodam em paralelo (contam no quota do runner), mas o cache de install evita que cada um reinstale do zero.

### 3.3 Setup Node + pnpm — DECIDIDO: `actions/setup-node@v4` com `cache: 'pnpm'`

Alternativa: `pnpm/action-setup@v4` + `actions/setup-node@v4` sem cache. Decisão: usar o cache integrado do setup-node — menos uma action, cache funciona out-of-the-box.

Ordem:
```yaml
- uses: pnpm/action-setup@v4
  with: { version: 9 }
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'pnpm'
- run: pnpm install --frozen-lockfile
```

### 3.4 `prisma generate` como passo explícito — DECIDIDO

`postinstall` do `apps/api` já roda `prisma generate` automaticamente, mas:
- `--frozen-lockfile` pula postinstall em algumas versões/configs
- Fail-fast: se generate falhar, melhor falhar no step dele que num typecheck confuso

Decisão: step explícito `pnpm --filter api prisma generate` antes de `typecheck`, `test` e `build` nos jobs que precisam.

### 3.5 Service container Postgres pro job `test` — DECIDIDO

Testes e2e precisam de DB real. Service container é mais rápido que Testcontainers:

```yaml
services:
  postgres:
    image: postgres:16-alpine
    env:
      POSTGRES_USER: ci
      POSTGRES_PASSWORD: ci
      POSTGRES_DB: ci
    ports: ['5432:5432']
    options: >-
      --health-cmd pg_isready
      --health-interval 10s
      --health-timeout 5s
      --health-retries 5
```

Testes rodam com `DATABASE_URL=postgresql://ci:ci@localhost:5432/ci`. Antes dos testes: `prisma migrate deploy` aplica migrations.

### 3.6 Required checks — DECIDIDO: 5 checks

Pra branch protection da `main`:

- `lint`
- `typecheck`
- `test`
- `build`
- `commitlint`

Todos obrigatórios. Nenhum opcional. Nenhum "advisory".

### 3.7 Coverage — DECIDIDO: ADIADO

Opções:
- Publicar coverage no Codecov/Coveralls agora
- Rodar coverage local no CI mas não publicar
- Esperar até ter código de domínio pra medir

Decisão: **esperar**. Coverage de `health` endpoint é 100% trivial — métrica sem valor até `004-auth`/`005-wifi-insights`. Quando valer, adiciona workflow separado e revisita.

### 3.8 E2E Playwright no CI — DECIDIDO: ADIADO

Playwright entra junto com o primeiro merge que tem UI real pra testar (`004-auth` já tem login/register, mas quem decide se o E2E vale a pena é o spec do `004`). Esse spec deixa só o lugar reservado: quando Playwright entrar, vira um job novo em `ci.yml`.

### 3.9 Branch protection — DECIDIDO: MANUAL

Opções:
- Configurar via GitHub API no CI (requer token admin)
- Deixar manual via GitHub UI, documentar no ADR

Decisão: **manual**. Rationale:
- Configuração acontece 1x e dura. Automatizar algo que roda 1x é desperdício de complexidade
- Token admin em CI = risco de segurança sem contrapartida
- ADR serve de documentação pro próximo dev (ou pra você em 6 meses)

## 4. Mapeamento de scripts

CI chama scripts que `002-bootstrap` definiu:

| Job CI | Script root chamado | O que roda por package |
|---|---|---|
| `lint` | `pnpm lint` | `eslint . --max-warnings=0` em cada package |
| `typecheck` | `pnpm typecheck` | `tsc --noEmit` em cada package |
| `test` | `pnpm test` | `jest` em apps/api + apps/web + packages/shared |
| `build` | `pnpm -r build` | `nest build` em api, `next build` em web, `tsc` em shared (ordem topológica garantida pelo pnpm) |

Scripts têm que existir e estar verdes **antes** desse spec entrar — garantia dada pelo checklist de encerramento do `002-bootstrap`.

## 5. Ordem de execução das tasks

```
BOT-15 (ci.yml base: install + lint + typecheck)
  └─ BOT-16 (ci.yml job test com service container Postgres)
       └─ BOT-17 (ci.yml job build dependendo de typecheck)
            └─ BOT-18 (CODEOWNERS)
                 └─ BOT-19 (PR template)
                      └─ BOT-20 (ADR 0001-ci-pipeline)
                           └─ BOT-21 (dry-run end-to-end + habilitar branch protection manual)
```

Toda task `[S]`. BOT-21 é `[HUMANO]` porque habilitar branch protection é via GitHub UI.

## 6. Bundles de commit

- **Bundle A** (`ci(repo): add ci pipeline`): BOT-15 + BOT-16 + BOT-17 — workflow completo numa PR só
- **Bundle B** (`chore(repo): add codeowners and pr template`): BOT-18 + BOT-19
- **Bundle C** (`docs(repo): add adr 0001-ci-pipeline`): BOT-20
- **Bundle D** (`[HUMANO]`): BOT-21 — não gera commit, só documenta no `tasks.md` quando foi habilitado

## 7. Interação com `001-release-management`

- `001` entrega: `release-please.yml`, `version-preview.yml`, `commitlint.yml`
- `003` entrega: `ci.yml` + `CODEOWNERS` + PR template + ADR
- `ci.yml` **não** duplica `commitlint` — reusa o workflow do `001`
- Required checks pra branch protection somam os checks dos dois specs

## 8. Riscos arquiteturais

### 8.1 Falha intermitente de service container

Service container pode demorar pra ficar healthy. Mitigação: `health-cmd pg_isready` + retries. Se mesmo assim flakar, fallback é Testcontainers (que já funciona em dev).

### 8.2 Cache "poisoning"

Cache stale pode esconder quebra de dep. Mitigação: `pnpm install --frozen-lockfile` garante que o lock bate; cache é só do store (binário), não dos `node_modules` resolvidos.

### 8.3 Prisma Client fora de sincronia

Se dev commita schema sem regenerar, CI vai regenerar e pode descobrir incompatibilidade. Isso é bom (pega o problema cedo), mas pode confundir reviewer que roda local sem regenerar. Mitigação: documento no PR template "rode `pnpm --filter api prisma generate` depois de mudar schema".

### 8.4 GitHub Actions quota

Repo pessoal com Actions grátis tem limite de minutos/mês. Mitigação: cache de install + jobs otimizados mantêm uso baixo. Se chegar perto do limite, revisita.

## 9. Fora do escopo deste spec

- Deploy automatizado
- Coverage publicado
- E2E Playwright headless (vem com `004-auth` ou `005-wifi-insights`)
- Linter de SQL/migrations
- Secret scanning / Dependabot (configuração do GitHub, não precisa de workflow custom)
- Dockerfile builds no CI (vira spec quando deploy entrar)

## 10. Tasks breakdown proposal (vai pro `tasks.md`)

1. **BOT-15** `[S]` — `ci.yml` base com `install`, `lint`, `typecheck`
2. **BOT-16** `[S]` — job `test` com service container Postgres + migrate deploy
3. **BOT-17** `[S]` — job `build` depende de `typecheck`
4. **BOT-18** `[S]` — `.github/CODEOWNERS`
5. **BOT-19** `[S]` — `.github/pull_request_template.md`
6. **BOT-20** `[S]` — ADR `docs/adr/0001-ci-pipeline.md`
7. **BOT-21** `[S] [HUMANO]` — habilitar branch protection na `main` via GitHub UI, documentar no ADR

## 11. Próximo passo

Validar o `tasks.md`, abrir branch `BOT-15/felpa-ci-workflow`, começar pela bundle A.
