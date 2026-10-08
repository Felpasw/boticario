# 000 — Product brief (Boticario Wi-Fi Insights)

> Esse arquivo é só o ponteiro curto. O brief longo vive no `README.md` da
> raiz — é lá que mora o vision/pergunta-do-dono/pillars/stack/data model/
> endpoints/roadmap. Mantém os dois sincronizados: mudou escopo? Edita o
> `README.md` primeiro, depois reflete em uma linha aqui se mudou a ordem de
> execução ou alguma decisão arquitetural grande.

## Contexto

Desafio técnico Grupo Boticário: construir um painel pra o dono de uma loja ter visibilidade sobre os acessos ao Wi-Fi de visitantes. Dados simulados via endpoint de cadastro — sem integração com roteador real.

## Resumo em uma frase

Painel de ingestão + analytics + notificações sobre conexões de Wi-Fi de visitantes, API NestJS + Next.js, versionado por package com `release-please`.

## Ordem de execução

1. **`001-release-management`** — release-please + commitlint + husky. **Antes** de qualquer código. Motivo: cada commit daqui pra frente entra no changelog automático; se vier depois, o histórico anterior fica achatado em `0.1.0 initial`.
2. **`002-bootstrap`** — monorepo pnpm (`apps/api` NestJS + `apps/web` Next.js + `packages/shared`), docker-compose com Postgres, Prisma init, tsconfig/eslint/prettier bases, scripts `pnpm dev` paralelos. Zero código de domínio ainda.
3. **`003-ci-pipeline`** — GitHub Actions com jobs paralelos (lint, typecheck, test, build, commitlint) rodando em PR e push `main`. Required checks pro branch protection.
4. **`004-auth`** (a criar) — users, sessions, cookie-based auth, login/register/logout endpoints e páginas.
5. **`005-wifi-insights`** (a criar) — Store/Device/Connection/Notification + ingestion + analytics + notifications + SSE + dashboard + simulador. Working draft bruto vive em `pinto[.md` na raiz enquanto a spec não existe.

## Decisões já locked

- **Monorepo pnpm** com `apps/api` (Nest) + `apps/web` (Next) + `packages/shared` (DTOs + Zod schemas, internal, não publica).
- **DB**: Postgres 16 + Prisma como source of truth. Zero Redis.
- **Notificações**: tudo in-process. `TRAFFIC_PEAK`/`NEW_RECORD` inline no `POST /connections`; `LOW_TRAFFIC_DAY`/`DAILY_SUMMARY` via `@nestjs/schedule` cron 08:00 fuso da loja; dedupe via `dedupeKey` unique na tabela.
- **Auth**: Passport local (email+senha) + session cookie `HttpOnly SameSite=Lax Secure`; session store no **Postgres** (tabela `sessions`); senha com `argon2id`. Logout invalida sessão real.
- **MAC**: nunca persiste. Só `HMAC-SHA256(mac, MAC_HASH_SECRET)` no `Device.macHash`.
- **Testes**: Jest (api + web unit/integration) + Testing Library (web) + Playwright (E2E). Testcontainers pra Postgres real nos testes de repository.
- **Versionamento**: SemVer independente por package — só `apps/api` e `apps/web`. `packages/shared` é internal, não versiona separado.
- **Deploy**: Vercel (web) + Fly.io ou Railway standard (api — **always-on obrigatório** por causa dos crons). Neon (Postgres). Zero Upstash.
- **Prefixo de ticket**: `BOT-N` global crescente. Branch `BOT-N/felpa-<slug>`. Commit tag `[BOT-N]` no fim do subject.
- **TDD**: obrigatório pra todo código de produção. Isento só pra config, migrations puras, scaffold vazio e assets.

## Decisões em aberto

Lista completa em §10 do `README.md`. As que travam execução cedo:

- **Insights textuais**: função determinística ou LLM? → decide **antes de `005-wifi-insights`**. Default: determinístico.
- **Rate limit no `POST /connections`**: por IP + exceção pro simulador, ou endpoint separado sem limit? → decide **antes de `005-wifi-insights`**.
- **Deploy da API**: Fly.io machine ou Railway standard? → decide **antes da task de deploy** (parte do `003-ci-pipeline` ou spec próprio).

## Fora do escopo deste MVP

- Multi-tenant com gestão de permissões cruzadas (data model já carrega `storeId` + `ownerId`, mas não existe RBAC).
- Integração real com roteador / RADIUS / captive portal.
- Entrega de notificação por email ou push (só in-app via SSE).
- Deploy automatizado pelo CI (release-please cuida da versão; deploy continua manual via painel do provedor por enquanto).
- Publicação do `packages/shared` em registry (internal only).
