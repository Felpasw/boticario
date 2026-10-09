# 001 — Release management (PLAN)

> Status: **planning only**. Esse documento descreve a abordagem antes de abrir
> a branch de trabalho. Decisões ficam aqui; execução vai pra `tasks.md`.

## 1. Objetivo

Entregar, antes de qualquer linha de código de domínio, um pipeline de versionamento automático que:

- Transforma todo commit convencional em entrada de changelog por package
- Abre/atualiza uma Release PR a cada merge em `main`
- Publica tag + GitHub Release ao mergear a Release PR
- Bloqueia commits fora do padrão localmente e em CI

Referência direta: `~/Documentos/money-assistance/` — padrão que já roda e que a gente quer espelhar.

## 2. Fluxo esperado end-to-end

1. Dev abre branch `BOT-N/felpa-<slug>` a partir de `main`.
2. Commits em inglês seguindo Conventional Commits:
   - `feat(api): ...` → minor bump em `apps/api`
   - `fix(web): ...` → patch bump em `apps/web`
   - `feat!: ...` ou `BREAKING CHANGE:` footer → major (mas enquanto `0.x`, vira minor por `bump-minor-pre-major`)
   - `chore:`, `docs:`, `refactor:`, `test:`, `ci:` → sem bump
3. PR da feature branch → `main`, squash-merged. Subject do squash tem que ser Conventional Commit válido (PR template lembra disso).
4. Push em `main` dispara `release-please.yml`:
   - **Cria** nova Release PR (`chore(main): release`) se nenhuma estiver aberta
   - **Atualiza** a Release PR existente — recalcula o bump e append no changelog
5. Release PR acumula mudanças até alguém decidir cortar release.
6. Mergeia a Release PR → release-please cria as tags `apps/api-v0.X.Y` / `apps/web-v0.X.Y` + GitHub Releases com o changelog como body.

## 3. Ferramenta — **DECIDIDO: `release-please`**

Mesma escolha do `money-assistance`. Pros:

- Suporte nativo pra "PR que se auto-atualiza a cada merge"
- Monorepo-friendly via `release-please-config.json` com múltiplos packages
- Compatível com Conventional Commits sem config extra
- Já battle-tested num projeto irmão — zero risco de refazer errado

Descartados (pro registro):

- `changesets` — exige arquivo de changeset por PR (fricção extra, padrão diferente do que queremos)
- `semantic-release` — publica direto no push, sem PR intermediária (não bate com a necessidade de Release PR auto-mergeable + revisável)

## 4. Estratégia de monorepo — **DECIDIDO: multi-package independente**

### Por que não single-release

Opções consideradas:

- **Single release** (uma versão pro repo todo): simples, mas qualquer fix em `web` bumparia `api` junto — ruim pra ler changelog e pra tag history
- **Multi-package independente**: `api` e `web` têm versões, tags e changelogs separados — espelha o padrão do `money-assistance`

Decisão: **multi-package**. `packages/shared` é internal e **não** versiona — ele é consumido via workspace link (`"shared": "workspace:*"`), e qualquer mudança nele é refletida em quem consumir no próximo build.

### Config

- `release-please-config.json`: declara `apps/api` e `apps/web` como packages, release-type `node`, `bump-minor-pre-major: true`.
- `.release-please-manifest.json`: baseline `{ "apps/api": "0.1.0", "apps/web": "0.1.0" }`.
- `separate-pull-requests: false`: uma Release PR agrupa os bumps dos dois packages.

## 5. Scopes e mapeamento pra packages

Convencionamos:

| Scope do commit                 | Package afetado     | Vira changelog em                                                                                                                                              |
| ------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `api`                           | `apps/api`          | `apps/api/CHANGELOG.md`                                                                                                                                        |
| `web`                           | `apps/web`          | `apps/web/CHANGELOG.md`                                                                                                                                        |
| `shared`                        | `packages/shared`   | **nenhum changelog** (shared é internal). Mas se consumido por api e/ou web, autor deve commitar junto com um `feat(api)` ou `feat(web)` que reflita o impacto |
| `ci`, `release`, `repo`, `docs` | nenhum (repo-level) | não aparece em changelog publicado (hidden)                                                                                                                    |

## 6. Dependência de `shared` sem versionar

Risco: alguém faz `feat(shared): add FooDto`, mas nenhum commit `feat(api)` ou `feat(web)` acompanha. Resultado: shared ganha código novo, nenhum consumer bumpa, o novo DTO só aparece no próximo release de quem usar.

Mitigação: PR template lembra que mudança em `shared` precisa de commit `feat/fix` no consumer imediato quando ele passar a usar. Code review (CODEOWNERS) pega se escapar.

## 7. Enforcement local (Husky + commitlint)

- `pnpm install` roda o `prepare` script que instala o hook do husky.
- `.husky/commit-msg` roda `pnpm commitlint --edit $1`.
- `commitlint.config.mjs` estende `@commitlint/config-conventional` com as mesmas relaxações do `money-assistance` (`subject-case: [0]`, `header-max-length: 100`, body/footer sem limite).
- Dev pode pular com `--no-verify`, mas o `commitlint.yml` em CI pega — defesa em profundidade.

## 8. Interação com `003-ci-pipeline`

- `001` cria **apenas** os workflows de release: `release-please.yml`, `version-preview.yml`, `commitlint.yml`.
- `003` cria o workflow `ci.yml` com lint/typecheck/test/build.
- Branch protection em `main` só liga depois que `003` tá verde — senão trava merges durante o bootstrap em `002`.
- Required checks pra Release PR auto-mergeable: lista final decidida no `003`.

## 9. Branch protection (manual, GitHub UI)

Documentado como pré-requisito, **não automatizado** aqui. Setup esperado após `003`:

- Require PR before merging
- Require status checks to pass (jobs do `003`: `lint`, `typecheck`, `test`, `build`, `commitlint`)
- Require branches up to date before merging
- Allow **squash merge only** (linear history + subject limpo pro Conventional Commits)
- Enable **auto-merge**
- Restrict direct push (owner only, break-glass)

## 10. First-run considerations

- Primeiro commit (`d313285`) é o skeleton — anterior ao release-please. Não vai pro changelog, o que é correto (release-please só pega commits pós-tag/pós-manifest).
- Primeiro PR de `feat` após BOT-4 vai gerar a primeira Release PR com bump `0.1.0 → 0.2.0` no package afetado.
- Baseline no manifest (`"apps/api": "0.1.0"`) + entrada "0.1.0 initial baseline" no CHANGELOG cobrem o período pré-automation.

## 11. Riscos e mitigações

| Risco                                                 | Mitigação                                                                                                                      |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `apps/api` e `apps/web` não existem quando BOT-1 roda | Criar stubs mínimos de `package.json` (`{ "name": "api", "version": "0.1.0", "private": true }`) só pra release-please parsear |
| Devs commitando pelo web UI pulam o hook              | `commitlint.yml` em CI bloqueia o merge                                                                                        |
| Release PR fica desatualizada por semanas             | Sem drama — ela auto-atualiza. Pode mergear quando quiser                                                                      |
| Permissão insuficiente no `GITHUB_TOKEN`              | Workflow declara `permissions: contents: write, pull-requests: write` no job                                                   |
| Alguém força push na Release PR                       | Branch protection na `main` + proibição de force-push resolvem (parte de `003` + manual)                                       |

## 12. Tasks breakdown proposal (vai pro `tasks.md`)

Após aprovação, as tasks ficam:

1. **BOT-1** `[S]` — config + manifest + stubs de package + changelogs iniciais
2. **BOT-2** `[S]` — workflow `release-please.yml`
3. **BOT-3** `[S]` — workflow `version-preview.yml`
4. **BOT-4** `[S]` — commitlint + husky + workflow `commitlint.yml` (CI)
5. **BOT-5** `[S] [DEFERRED]` — `docs/RELEASING.md` (deferred enquanto solo)

Legenda: `[S]` = sequencial (cada task depende da anterior), `[DEFERRED]` = adiado.

## 13. Fora do escopo deste spec

- Branch protection (manual via GitHub UI, documentada apenas)
- Pipeline de lint/test/build (fica em `003-ci-pipeline`)
- Deploy automatizado após release
- Publicação em npm/GitHub Packages
- Changelog em docs site (CHANGELOG por package no repo basta)

## 14. Próximo passo

Validar o `tasks.md`, abrir branch `BOT-1/felpa-release-please-setup`, executar sequencialmente.
