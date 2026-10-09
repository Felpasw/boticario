# 001 — Release management (SPEC)

> Status: **specification only**. Nenhuma implementação ainda. Companion a
> `plan.md` (abordagem) e `tasks.md` (quebra executável).

## 1. Resumo

Adotar `release-please` (Google) pra automatizar versionamento e publicação de releases do monorepo `boticario`. Cada merge em `main` cria ou atualiza uma **Release PR** (uma por package). Ao mergear a Release PR, uma tag `apps/api-v0.X.Y` ou `apps/web-v0.X.Y` é criada e um GitHub Release com o CHANGELOG como body é publicado.

**Baseado no padrão do `money-assistance`** (`~/Documentos/money-assistance/specs/001-release-management/tasks.md`).

## 2. Escopo

**Dentro**

- Conventional Commits enforcement (local via Husky + CI via workflow).
- `release-please` config + manifest + workflow.
- Workflow de preview de versão em PRs.
- `commitlint` + `husky` no `pnpm install`.
- Changelogs iniciais `apps/api/CHANGELOG.md` e `apps/web/CHANGELOG.md`.

**Fora**

- Branch protection rules (configuração manual no GitHub — documentada mas não automatizada aqui).
- Deploy automatizado (release-please só versiona; deploy vive em outro spec).
- Publicação em npm registry (projeto é interno).
- Versionamento do `packages/shared` (é internal, consumido via workspace link, não publica).
- Pipeline de testes/lint/build do CI — isso vive em `003-ci-pipeline`.

## 3. Convenções

### 3.1 Formato de commit (Conventional Commits)

```
<type>(<scope>): <subject> [BOT-N]

<optional body>

<optional footer>
```

Scope esperado: `api`, `web`, `shared`, `ci`, `release`, `repo`.

| Type       | SemVer impact | Changelog section |
| ---------- | ------------- | ----------------- |
| `feat`     | minor         | ✨ Features       |
| `fix`      | patch         | 🐛 Correções      |
| `perf`     | patch         | ⚡ Performance    |
| `refactor` | none          | 🔨 Refactoring    |
| `revert`   | varia         | ⏪ Reverts        |
| `docs`     | none (hidden) | 📝 Docs           |
| `chore`    | none (hidden) | 🧹 Chores         |
| `test`     | none (hidden) | 🧪 Testes         |
| `build`    | none (hidden) | 📦 Build          |
| `ci`       | none (hidden) | 🤖 CI             |
| `style`    | none (hidden) | 🎨 Style          |

**Breaking changes:** `feat!:` ou `BREAKING CHANGE:` no footer. Enquanto `0.x`, por convenção SemVer, breaking bumpa minor (major só a partir de `1.0.0`). Config `bump-minor-pre-major: true` no release-please garante isso.

**Trailer `[BOT-N]`**: `release-please` ignora, mas fica no changelog como rastro visual.

### 3.2 Idioma

Default do projeto: **pt-BR** nos specs/docs/PR descriptions, **inglês** no README e no changelog (que é gerado automaticamente a partir do subject). Commit subject segue inglês pra output limpo do release-please.

## 4. Configuração do release-please

### 4.1 Estratégia: multi-package (independente por package)

Cada package versiona separado. `apps/api` e `apps/web` têm seu próprio `CHANGELOG.md`, suas tags (`apps/api-v0.X.Y`, `apps/web-v0.X.Y`) e sua Release PR.

Rationale: `api` e `web` podem evoluir em cadências diferentes (fix de layout no web não deve bumpar api; adição de endpoint não deve bumpar web). O padrão replica o `money-assistance`.

### 4.2 Config (`release-please-config.json`)

```json
{
  "$schema": "https://raw.githubusercontent.com/googleapis/release-please/main/schemas/config.json",
  "separate-pull-requests": false,
  "changelog-sections": [
    { "type": "feat", "section": "✨ Features" },
    { "type": "fix", "section": "🐛 Correções" },
    { "type": "perf", "section": "⚡ Performance" },
    { "type": "refactor", "section": "🔨 Refactoring" },
    { "type": "revert", "section": "⏪ Reverts" },
    { "type": "docs", "section": "📝 Docs", "hidden": true },
    { "type": "chore", "section": "🧹 Chores", "hidden": true },
    { "type": "test", "section": "🧪 Testes", "hidden": true },
    { "type": "build", "section": "📦 Build", "hidden": true },
    { "type": "ci", "section": "🤖 CI", "hidden": true },
    { "type": "style", "section": "🎨 Style", "hidden": true }
  ],
  "packages": {
    "apps/api": {
      "release-type": "node",
      "package-name": "api",
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true
    },
    "apps/web": {
      "release-type": "node",
      "package-name": "web",
      "changelog-path": "CHANGELOG.md",
      "bump-minor-pre-major": true
    }
  }
}
```

### 4.3 Manifest (`.release-please-manifest.json`)

```json
{
  "apps/api": "0.1.0",
  "apps/web": "0.1.0"
}
```

Baseline `0.1.0` em ambos (não `0.0.x` — projeto já é usável, só não é 1.0 estável).

### 4.4 Release PR

- Uma única PR agrupa os bumps de ambos os packages (`separate-pull-requests: false`).
- Título: `chore(main): release` (padrão do bot).
- Body: changelog agrupado por package e por tipo.
- Atualiza a cada merge novo em `main` — não cria uma segunda enquanto a atual estiver aberta.

### 4.5 Auto-merge

**Fora deste spec** (depende de branch protection manual + required checks do `003-ci-pipeline`). Documentar como pré-requisito no `plan.md`.

## 5. Workflows

### 5.1 `.github/workflows/release-please.yml`

- Triggers: `push` em `main`, `workflow_dispatch` (manual).
- Action: `googleapis/release-please-action@v4`.
- Permissions: `contents: write`, `pull-requests: write`.
- Comportamento: após merge em `main`, abre/atualiza Release PR; ao mergear, cria tags `apps/api-v0.X.Y`/`apps/web-v0.X.Y` + GitHub Releases.

### 5.2 `.github/workflows/version-preview.yml`

- Triggers: `pull_request` em qualquer branch pra `main`.
- Action: `googleapis/release-please-action@v4` em modo preview (`skip-github-release: true`, `skip-tag: true`).
- Comportamento: comenta no PR a versão-alvo prevista (ex.: "esse merge vai bumpar `api` de 0.1.0 → 0.2.0 (feat)"). Atualiza a cada push.

### 5.3 `.github/workflows/commitlint.yml`

- Triggers: `pull_request`.
- Valida todos os commits do PR contra `commitlint.config.mjs`.
- Defesa em profundidade — se alguém pular o hook local (`--no-verify`), CI pega.

## 6. Enforcement local

- **Husky** instala Git hooks no `pnpm install` (via `prepare` script na raiz).
- **commitlint** hook (`commit-msg`) valida todo commit contra `@commitlint/config-conventional`.
- `commitlint.config.mjs` espelhando o `money-assistance`:
  ```js
  export default {
    extends: ['@commitlint/config-conventional'],
    rules: {
      'subject-case': [0],
      'header-max-length': [2, 'always', 100],
      'body-max-line-length': [0],
      'footer-max-line-length': [0],
    },
  };
  ```

## 7. Changelogs iniciais

`apps/api/CHANGELOG.md` e `apps/web/CHANGELOG.md` nascem com:

```markdown
# Changelog

## 0.1.0 (YYYY-MM-DD)

### 🎉 Initial baseline

Primeira versão rastreada automaticamente pelo release-please.
```

## 8. Critérios de sucesso

A fase está pronta quando **tudo abaixo** é verdade:

- `pnpm install` instala o hook do husky e um commit fora do padrão é rejeitado localmente.
- Um PR com commit convencional recebe comentário do bot de preview com o bump previsto.
- Após merge do PR em `main`, uma Release PR é criada/atualizada com o changelog correto por package.
- Um segundo PR mergeado atualiza a mesma Release PR (não cria uma nova).
- Mergear a Release PR cria as tags corretas (`apps/api-v0.X.Y` ou `apps/web-v0.X.Y` conforme os commits) e os GitHub Releases com o changelog como body.

## 9. Riscos e mitigações

| Risco                                                       | Mitigação                                                                                                                                                                 |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/api` ou `apps/web` ainda não existe quando BOT-1 roda | Stub mínimo de `package.json` (`{ "name": "api", "version": "0.1.0", "private": true }`) só pra release-please não quebrar; bootstrap preenche o resto em `002-bootstrap` |
| Commit legado (pré-BOT-1) polui changelog                   | release-please só pega commits pós-tag. Baseline `0.1.0 initial` cobre tudo que veio antes                                                                                |
| Alguém commita sem seguir formato via web UI do GitHub      | `commitlint.yml` em CI bloqueia                                                                                                                                           |
| Release PR fica esquecida aberta                            | Sem drama — se atualiza a cada merge; merge quando quiser cortar release                                                                                                  |
| Secret do `GITHUB_TOKEN` sem permissão de PR                | Workflow usa `permissions: contents: write + pull-requests: write` no job                                                                                                 |

## 10. Pré-requisitos pra fases seguintes

- `003-ci-pipeline` precisa referenciar os workflows criados aqui (não duplica o `commitlint.yml`).
- Branch protection em `main` só vale a pena ligar depois que o CI de testes do `003` estiver verde — senão trava merges durante o bootstrap.
