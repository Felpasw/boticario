# Workflow de desenvolvimento com IA

Como o projeto foi tocado em pareceria com Claude Code (CLI). Este
documento descreve a estrutura `specs/NNN-slug/`, os três arquivos que
compõem cada feature (`spec.md`, `plan.md`, `tasks.md`), e as
convenções que mantêm o agente alinhado com as expectativas do time.

> Objetivo: tornar reprodutível a cadência que funcionou aqui. Qualquer
> dev (ou outro agente) deveria conseguir pegar uma spec nova e levar
> da redação ao PR seguindo o mesmo rito.

---

## 1. Por que spec-driven?

Trabalhar com LLM sem contexto estruturado degrada rápido:

- Sem **spec**, o agente infere escopo e acaba entregando features que
  não eram pedidas (ou pior, decide por ele mesmo o shape de uma API
  pública).
- Sem **plan**, cada chamada reabre decisões já tomadas (ORM? ORM só pra
  leitura? Qual timezone? Qual pattern de hooks?).
- Sem **tasks**, não há granularidade pra commit coerente — vira "faz a
  feature inteira" com PR gigante.

Separar nos três artefatos resolve isso porque cada um responde uma
pergunta diferente:

| Arquivo    | Pergunta que responde                               |
| ---------- | --------------------------------------------------- |
| `spec.md`  | **O quê?** Escopo, requisitos, contratos, formato   |
| `plan.md`  | **Como?** Decisões técnicas travadas, arquitetura   |
| `tasks.md` | **Em qual ordem?** Quebra em bundles commitáveis    |

---

## 2. Estrutura por feature

Cada feature vive em `specs/NNN-slug/` onde:

- `NNN` é um número de 3 dígitos zero-padded, sequencial (001, 002, …).
  Reflete ordem de execução, não prioridade.
- `slug` é kebab-case descrevendo o escopo (`auth`, `wifi-insights`,
  `ci-pipeline`).

```
specs/
├── 000-product-brief/   # vision + requisitos de alto nível (não tem tasks)
├── 001-release-management/
│   ├── spec.md
│   ├── plan.md
│   └── tasks.md
├── 002-bootstrap/
│   └── ...
├── 003-ci-pipeline/
├── 004-auth/
└── 005-wifi-insights/
```

A spec `000-product-brief` é especial: define o produto como um todo,
sem tasks. Serve como contexto permanente lido antes de qualquer
feature nova.

---

## 3. Os três arquivos

### 3.1 `spec.md` — o entregável

Descreve **o que precisa existir** quando a spec for considerada
concluída. Inclui:

- **Resumo**: 1 parágrafo capturando a essência.
- **Escopo (Dentro / Fora)**: lista explícita do que entra e do que
  deliberadamente não entra. Protege contra scope creep.
- **Contratos públicos**: schemas Zod, shape de requests/responses,
  nomes de rotas, DTOs. Isto é o único lugar onde o shape da API é
  canônico.
- **Requisitos não-funcionais**: performance (SLO), segurança
  (criptografia, rate limit), observabilidade (logs, tracing).
- **Modelo de dados**: tabelas, relações, constraints.
- **Casos de borda**: validações, erros, idempotência.

Rule of thumb: se duas pessoas lessem a spec, elas construiriam o mesmo
produto. Se há margem pra interpretação, falta precisão.

### 3.2 `plan.md` — as decisões

Enquanto a spec diz **o que**, o plan trava **como**. Inclui:

- **Decisões técnicas travadas**: cada uma com rationale breve. Ex: "SQL
  raw em vez de Prisma Client porque precisamos de `PERCENTILE_CONT` e
  `DATE_TRUNC AT TIME ZONE`." Isso evita que o agente reabra a decisão
  em cada bundle.
- **Riscos conhecidos**: o que pode dar errado, com mitigação.
- **Fluxo end-to-end esperado**: do input do usuário até a response, pra
  ter uma régua de "fiz tudo que é preciso?".
- **Bundles sugeridos**: agrupamento conceitual das tasks em grupos
  commitáveis (ver §4).

O plan é o lugar certo pra documentar "pensei em X e Y, escolhi X por
Z" — assim o agente futuro (ou um reviewer) entende sem precisar
reconstruir o raciocínio.

### 3.3 `tasks.md` — a quebra executável

Lista de `T-NNN-XX` (três dígitos da spec + dois da task) organizadas
em fases. Cada task tem:

- **Tag(s)**: `[T]` (TDD obrigatório), `[S]` (sequencial), `[P]`
  (paralelizável), `[HUMANO]`, `[OPS]`, `🛑 HARD STOP`.
- **Checkbox**: `[ ]` pendente, `[x]` concluído com hash do commit.
- **Descrição**: arquivos a criar/editar, comportamento esperado,
  testes a escrever, validação.

Exemplo:

```md
- [x] **BOT-37** [S] [T] — Funções puras + `TimezoneConfig`: ✅ commit `2a4e1e8`
  - `apps/api/src/@common/config/timezone.config.ts`:
    - Classe injetável que lê `APP_TIMEZONE` do `ConfigService`
    - Expõe `get(): string`
  - `apps/api/src/metrics/domain/services/period-resolver.ts`:
    - `resolvePeriod({ from?, to? }): { from, to, prevFrom, prevTo }`
  - Testes unit cobrindo defaults + prev-period calc + erros
  - Validação: todos passam
```

A checkbox virar `[x]` só após o commit — o hash fica rastreável no
`git log` por meio da tag `[BOT-N]` no subject do commit.

---

## 4. Bundles

Um bundle agrupa 1-N tasks relacionadas num único commit coerente.
Exemplos reais deste projeto:

| Bundle | Tasks               | Escopo                                           |
| ------ | ------------------- | ------------------------------------------------ |
| A      | BOT-32, BOT-33      | Prisma models + schemas Zod compartilhados       |
| B      | BOT-37, BOT-38, BOT-39 | Metrics module inteiro (puras + repo + endpoints) |
| C      | BOT-34, BOT-35, BOT-36 | Connections module (hash + POST + GET)        |
| D      | BOT-41              | Seed realista + migration de `timestamptz`       |
| E      | BOT-42..45          | Services + hooks + dashboard wiring              |
| F      | BOT-40              | Rate limiter + Swagger `/docs`                   |
| G      | BOT-47              | Playwright E2E                                   |
| H      | BOT-48              | CI job de E2E                                    |

Regra: **bundle é a unidade de review**. Reviewer prefere um PR
"módulo metrics completo" do que 5 PRs atômicos "só port", "só repo",
"só use-case".

---

## 5. Convenções que mantêm o agente alinhado

### 5.1 Branch

Formato obrigatório: `TAG-N/felpa-<slug>`.

- Prefixo = ticket (`BOT-32`, `GDX-75`).
- `felpa-` literal depois da `/`.
- Slug em kebab-case.

Exemplos válidos: `BOT-32/felpa-wifi-insights`,
`GDX-75/felpa-refactor-email`.

Isso é regex-ável (`^[A-Z]+-\d+/felpa-[a-z0-9-]+$`) — hooks de CI podem
rejeitar branch fora do padrão.

### 5.2 Commit

- Subject em inglês (ver `CLAUDE.md`), tag `[BOT-N]` no fim.
- Rodapé lista as tasks fechadas:

```
feat(api): add metrics module with 5 SQL-backed endpoints

Adds GET /metrics/{summary,heatmap,timeseries,dwell-distribution,top-recurring}
behind the auth guard, serving the dashboard with real aggregated data.

[...]

T-005-01 Metrics module scaffolding [BOT-37]
T-005-02 Period resolver and alerts evaluator [BOT-38]
T-005-03 Prisma metrics repository and endpoints [BOT-39]
```

### 5.3 `CLAUDE.md` como contrato

Dois arquivos — ambos lidos pelo agente a cada sessão:

- `~/.claude/CLAUDE.md` (global): tom informal pt-BR, estilo de código,
  Clean Arch, regra de "backend define shape e agregação, frontend não
  faz `.map`/`.reduce`", branch naming, commit flow.
- `./CLAUDE.md` (projeto, ignorado no git): overrides locais —
  "commits em inglês", "sem `Co-Authored-By: Claude`".

É aqui que ficam as regras duras: proibições, workflows obrigatórios,
decisões não-negociáveis. Mudança nessas regras rebota em toda sessão
futura automaticamente.

### 5.4 TDD onde `[T]` aparece

Task com `[T]` exige **teste vermelho antes do código de produção**. O
agente mostra o teste falhando no chat, depois implementa. Isso dá
pontos de verificação intermediária e evita "escrevi tudo, nenhum
teste pegou nada".

### 5.5 Stage, não commit

Fim de cada ciclo o agente faz `git add <arquivos>` e **para**. Nunca
`git commit` sem `ok` explícito do dev humano no chat para aquele
bundle específico. "ok" anterior não vale pro próximo — cada bundle
precisa de aprovação nova.

---

## 6. Fluxo típico de uma feature

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Dev escreve `spec.md` (humano, revisão por par)           │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 2. Dev + agente escrevem `plan.md` (decisões técnicas)       │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 3. Dev + agente escrevem `tasks.md` (bundles numerados)      │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 4. Loop por bundle:                                          │
│    a. Agente abre task, escreve teste vermelho se [T]        │
│    b. Agente implementa, roda typecheck + lint + test        │
│    c. Agente faz `git add` e para                            │
│    d. Dev revisa diff, dá "ok"                               │
│    e. Agente commita com tag [BOT-N], marca task como [x]    │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│ 5. Último commit → PR → CI roda lint/typecheck/unit/e2e      │
└─────────────────────────────────────────────────────────────┘
```

Qualquer desvio (bug novo, mudança de escopo, ADR necessário) atualiza
o artefato correspondente antes do próximo bundle. Spec/plan/tasks são
documentos vivos até a feature fechar — depois disso viram arquivo
histórico que fica no repo pra referência.

---

## 7. Como ler as specs atuais

Pra entender o Wi-Fi Insights do zero, a ordem recomendada é:

1. `specs/000-product-brief/spec.md` — contexto do produto, personas,
   requisitos macro
2. `specs/005-wifi-insights/spec.md` — contratos (schemas, rotas, DTOs)
3. `specs/005-wifi-insights/plan.md` — por que das escolhas técnicas
4. `specs/005-wifi-insights/tasks.md` — ordem de execução
5. `docs/decisions.md` — resumo executivo das decisões arquiteturais
6. `docs/rodando.md` — como subir local e testar

Specs anteriores (`001`..`004`) fornecem o scaffolding (release-please,
pnpm workspace, CI, auth) e podem ser lidas sob demanda.

---

## 8. Lições que escalam

Padrões que fugiram do script neste projeto e que vale repetir:

- **Bundle grande > PR fatiado** quando as peças só fazem sentido
  juntas (port + impl + endpoint). Reviewer prefere coerência a
  atomicidade pedante.
- **Loop de requisições é bug previsível**. Sempre memoize defaults
  quando a referência do objeto participa de query key.
- **Formatter puro é util**, não component. `apps/web/src/utils/
  formatters.ts` concentra tudo; componente só importa e chama.
