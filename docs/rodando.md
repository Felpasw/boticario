# Como rodar o projeto

Guia prático pra subir o Wi-Fi Insights localmente. Se algum passo
falhar, a seção de troubleshooting no fim cobre os erros mais comuns.

---

## Pré-requisitos

- **Node.js 20+** (`node --version` → `v20.x` ou maior)
- **pnpm 10+** (`pnpm --version`)
- **Docker + docker compose** (para o Postgres)

---

## Primeira execução

```sh
# 1. clona e entra no repo
git clone https://github.com/Felpasw/boticario.git
cd boticario

# 2. prepara os arquivos de ambiente
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# edita se precisar — os defaults funcionam pra dev local

# 3. sobe o Postgres (porta 5434 pra não bater com um Postgres do host)
docker compose up -d

# 4. instala as dependências do workspace
pnpm install

# 5. aplica as migrations do Prisma
pnpm --filter api db:migrate

# 6. cria o usuário admin
pnpm --filter api db:seed

# 7. popula ~5 mil conexões realistas em 8 semanas
pnpm --filter api db:seed:connections

# 8. sobe API (porta 3333) e web (porta 3000) em paralelo
pnpm dev
```

Pronto. Acessa http://localhost:3000, faz login com:

- `admin@boticario.local` / `change-me-dev`

---

## Serviços no ar

| Endereço                        | O que é                                       |
| ------------------------------- | --------------------------------------------- |
| `http://localhost:3000`         | Dashboard (Next.js)                           |
| `http://localhost:3000/login`   | Tela de login                                 |
| `http://localhost:3000/dashboard` | Painel com KPIs, heatmap, dwell, recorrentes |
| `http://localhost:3333`         | API (NestJS)                                  |
| `http://localhost:3333/health`  | Healthcheck (`{ status, db, timestamp }`)     |
| `http://localhost:3333/docs`    | Swagger UI com todas as rotas                 |

---

## Rodando os testes

Três suites independentes:

```sh
# Unit (shared + api + web via vitest)
pnpm test

# Api integration / e2e (NestJS supertest, usa Postgres)
pnpm --filter api test:e2e

# Browser e2e (Playwright headless chromium)
#   requer api + web rodando em background:
#     pnpm --filter api start   &
#     pnpm --filter web dev     &
pnpm --filter web e2e

# UI interativa do Playwright (ótima pra debug)
pnpm --filter web e2e:ui
```

Em caso de falha no Playwright, `apps/web/test-results/` guarda trace,
screenshot e vídeo. No CI isso vira o artifact `playwright-report`
anexado na run do GitHub Actions.

---

## Scripts úteis do workspace

| Comando                                  | O que faz                                        |
| ---------------------------------------- | ------------------------------------------------ |
| `pnpm dev`                               | API + web em modo watch                          |
| `pnpm build`                             | Build de todos os pacotes                        |
| `pnpm lint`                              | ESLint em todos os workspaces                    |
| `pnpm typecheck`                         | `tsc --noEmit` em todos os workspaces            |
| `pnpm --filter api db:migrate`           | `prisma migrate dev` (cria migration nova)       |
| `pnpm --filter api db:seed`              | Admin do seed                                    |
| `pnpm --filter api db:seed:connections`  | Conexões realistas de 8 semanas                  |
| `pnpm --filter api db:studio`            | Abre o Prisma Studio                             |
| `docker compose up -d`                   | Sobe Postgres                                    |
| `docker compose down -v`                 | Derruba Postgres e apaga volume (zera dados)     |

---

## Variáveis de ambiente

`apps/api/.env`:

```
NODE_ENV=development
PORT=3333
CORS_ORIGIN=http://localhost:3000
LOG_LEVEL=info
DATABASE_URL=postgresql://boticario:boticario@localhost:5434/boticario?schema=public

SEED_ADMIN_EMAIL=admin@boticario.local
SEED_ADMIN_PASSWORD=change-me-dev
SEED_ADMIN_NAME=Admin

MAC_HASH_SECRET=change-me-dev-secret

INGEST_API_KEY=change-me-dev-ingest-key
INGEST_USER_EMAIL=admin@boticario.local
```

`INGEST_API_KEY` é o segredo que o `POST /connections` espera no header
`X-Ingest-Key`; `INGEST_USER_EMAIL` resolve o `User` dono das conexões
inseridas. Ver `docs/adr/0002-ingest-authentication.md` pro racional.

`apps/web/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:3333
```

Trocar `MAC_HASH_SECRET` invalida a correlação entre os MACs já
hasheados e novos — útil pra rotação de secret, mas requer re-seed se
quiser dados coerentes.

---

## Troubleshooting

### "Error: connect ECONNREFUSED 127.0.0.1:5434"

Postgres não está rodando. Rode `docker compose up -d` e tente de novo.

### Métricas voltando tudo zerado após login

A sessão está OK, mas o seed não rodou. Rode
`pnpm --filter api db:seed:connections` e recarregue o dashboard.

### `/metrics/summary` dá 500 após mudar o schema

Esqueceu de aplicar migration. `pnpm --filter api db:migrate` resolve.
Em dev, se o estado do banco ficou torto, `docker compose down -v`
limpa tudo e recomeça o setup do zero.

### Dashboard mostra loop de requisições (centenas por segundo)

Isso aconteceu quando `useDateRange` recriava os defaults a cada
render. Já foi corrigido (`useMemo(() => defaults, [])`). Se voltar a
acontecer, provavelmente alguma query do TanStack está recebendo
`queryKey` com objeto novo a cada render — procurar por `new Date()`
dentro do hook.

### Playwright pede browser que não está instalado

`pnpm --filter web exec playwright install chromium` baixa só o
chromium (~120 MB). O `--with-deps` requer sudo pra instalar libs do
sistema; dispensável se o chromium abre normalmente.

### Rate limit batendo em desenvolvimento (`429`)

A API tem throttler global de 100 req/min. Se um teste de load local
estoura, espera 60s ou reinicia a API (zera a contagem em memória).

---

## Estrutura de pastas (visão rápida)

```
boticario/
├── apps/
│   ├── api/            # NestJS + Prisma
│   │   ├── prisma/     # schema + migrations + seeds
│   │   ├── src/
│   │   │   ├── auth/
│   │   │   ├── connections/
│   │   │   ├── metrics/
│   │   │   └── users/
│   │   └── test/       # supertest e2e
│   └── web/            # Next.js (app router)
│       ├── e2e/        # Playwright specs
│       └── src/
│           ├── app/
│           ├── components/
│           ├── hooks/
│           └── services/
├── packages/
│   └── shared/         # schemas Zod + types
├── docs/
│   ├── adr/            # Architecture Decision Records
│   ├── decisions.md    # resumo executivo das decisões
│   └── rodando.md      # este arquivo
└── specs/              # product brief + specs técnicas (por feature)
```
