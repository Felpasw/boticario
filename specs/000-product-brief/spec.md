# 000 — Product brief (Boticario)

> Esse arquivo é só o ponteiro curto. O brief longo vive no `README.md` da
> raiz — é lá que mora o vision/público/pillars/stack/roadmap/open questions.
> Mantém os dois sincronizados: mudou escopo? Edita o `README.md` primeiro,
> depois reflete em uma linha aqui se mudou a ordem de execução ou alguma
> decisão arquitetural grande.

## Resumo em uma frase

Sistema de gestão de loja (back-office + POS) com API NestJS e web em Next.js, versionado por package com `release-please`.

## Ordem de execução (prioridade zero → N)

1. **`001-release-management`** — release-please + commitlint + husky + CI. **Antes** de qualquer linha de código de produção. Motivo: cada commit daqui pra frente entra no changelog automático; se vier depois, o histórico anterior fica achatado em `0.1.0 initial`.
2. **`002-bootstrap`** (a criar) — `api/` (NestJS), `web/` (Next.js), `docker-compose.yml` com Postgres + Redis, Prisma inicializado, scripts de dev funcionando. Zero regra de negócio ainda.
3. **`003-auth`** (a criar) — email+password, JWT access+refresh, usuários e roles (owner/manager/operator/stock), guards no backend e middleware no front.
4. **Daí em diante** — ver §9 do `README.md` (Roadmap). Specs vão sendo criadas sob demanda, uma por bloco funcional.

## Decisões já locked

- **Monorepo pnpm**: `api/` (Nest) + `web/` (Next) na raiz, sem `apps/` wrapper (bate com `release-please-config.json` por package).
- **DB**: Postgres 16 + Prisma como source of truth.
- **Versionamento**: SemVer independente por package (`api-v0.X.Y`, `web-v0.X.Y`) via `release-please`.
- **Prefixo de ticket**: `BOT-N` global crescente. Branch `BOT-N/felpa-<slug>`. Commit tag `[BOT-N]` no fim do subject.
- **TDD**: obrigatório pra todo código de produção (seguindo o padrão do money-assistance). Isento só pra config, migrations puras, scaffold vazio e assets.

## Decisões em aberto

Lista completa em §10 do `README.md`. As que travam execução cedo:

- Auth: só JWT ou OAuth também? → decide **antes de `003-auth`**.
- Multi-store ready-model ou single-store? → decide **antes de `002-bootstrap`** (afeta o schema inicial).
- Fiscal (NFC-e/SAT) no MVP? → não bloqueia bootstrap, decide antes do spec de POS.

## Fora do escopo deste MVP

- Marketplace / storefront público.
- App mobile nativo (web responsivo é o fallback de inventário no chão).
- Deploy automatizado (vira spec próprio quando a infra for decidida).
- Integração com terminal de cartão (operador digita valor por enquanto, até decisão em §10).
