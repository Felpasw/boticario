# 004 — Auth (PLAN)

> Status: **planning only**. Decisões ficam aqui; execução vai pra `tasks.md`.

## 1. Objetivo

Entregar login/logout funcionais com cookie de sessão HttpOnly, user via seed (sem register), guard global protegendo tudo, e a infra de front (`userStore` + `authService` + `useAuth`) pronta pra o `005-wifi-insights` plugar o dashboard autenticado em cima.

## 2. Fluxo esperado end-to-end

1. Dev roda `pnpm --filter api db:seed` → cria `admin@boticario.local`
2. Browser abre `/` → shell detecta sem cookie → `redirect('/login')`
3. User preenche form → `authService.login()` → `POST /auth/login`
4. API valida com argon2, cria session row, seta cookie `boticario_session`, devolve `{ user }`
5. `AuthHooks.use()` recebe sucesso → `userStoreActions.setUser(data.user)` → navega pra `/`
6. Shell valida cookie no server → user hidrata via `/me` (ou do próprio store persistido) → renderiza nav + logout
7. Clica logout → `authService.logout()` → DELETE session + cookie limpo → `userStore.clearUser()` → `redirect('/login')`

## 3. Decisões técnicas (travadas)

### 3.1 Cookie-session vs JWT HttpOnly — DECIDIDO: cookie-session

- **Session (opaque id em DB)**: logout invalida de verdade; revogação simples
- **JWT HttpOnly**: stateless, mas revogação exige blacklist (volta a ter DB)

Decisão: **session**. Pros do stateless somem quando logout real é requisito.

### 3.2 Passport local — DECIDIDO: SIM, mas use-case faz o trabalho

Passport local serve como padrão NestJS, mas a lógica de validação (hash check + session create) vive no **use-case** `login-with-password.use-case.ts`. Strategy só injeta o use-case e chama. Rationale: use-case é testável sem mock de Passport; strategy fica fina.

### 3.3 argon2id — DECIDIDO

- Melhor que bcrypt pra password hashing (ganhou PHC 2015)
- Memória-hard: resistente a GPU attacks
- Params default do `argon2` lib (`memoryCost: 65536, timeCost: 3, parallelism: 4`) são razoáveis — ajusta se seed demorar demais
- Rehash policy: skip por ora (user único de seed; se virar multi-user depois, adiciona)

### 3.4 Session id — DECIDIDO: `randomBytes(32).toString('hex')`

- 64 chars hex = 256 bits de entropia — inviável de brute-force
- Opaque (não carrega metadata) → zero vulnerabilidade de tampering
- Lookup O(1) pelo PK em `Session`

### 3.5 Rolling session — DECIDIDO: bumpa se faltar < 1 dia

- Usuário ativo nunca expira (bate 1x/dia, mantém sessão)
- Usuário inativo expira em 7 dias
- Implementação: no AuthGuard, após achar session válida, se `expiresAt - now < 24h` → `UPDATE sessions SET expires_at = now + 7d` + re-emite cookie
- Sem contador de "último uso" (desnecessário pro escopo)

### 3.6 Guard global via `APP_GUARD` — DECIDIDO

Alternativa: guard explícito em cada controller com `@UseGuards(AuthGuard)`. Decisão: **global + whitelist via `@Public()`**. Rationale:
- Default seguro: rota nova nasce protegida sem precisar lembrar
- `@Public()` em `/health` e `/auth/login` é explícito e visível no diff
- Padrão idêntico ao `money-assistance`

### 3.7 Error envelope global — DECIDIDO

`AllExceptionsFilter` registrado via `APP_FILTER` padroniza erro em todas as rotas. Mapeia erros de domain (`InvalidCredentialsError`, `UserNotFoundError`...) pra statusCode + código de erro específico.

Formato (seção 7 do `spec.md`):
```json
{ "statusCode": 401, "error": "INVALID_CREDENTIALS", "message": "...", "timestamp": "...", "path": "..." }
```

### 3.8 Zod schemas no `shared` — DECIDIDO

Request/response schemas de `/auth/login` em `packages/shared/src/schemas/auth.ts`. Consumidos:
- **api**: via `ZodValidationPipe` em `@Body()`
- **web**: via `zodResolver` do RHF no `LoginForm` + tipos inferidos nos services

Single source of truth → impossível front e back divergirem.

### 3.9 Front: shell protegido via Server Component — DECIDIDO

Alternativa: client-side redirect no `useEffect`. Decisão: **Server Component que lê cookie via `next/headers`**. Rationale:
- Sem flash de UI protegida renderizando antes do redirect
- SSR amigável, melhor SEO (irrelevante aqui mas é side-effect gratuito)
- Chamada `/me` opcional pra re-hidratar user em caso de store desatualizado

### 3.10 User hydration no front — DECIDIDO: persist no Zustand + lazy fetch de `/me`

- `userStore` com `persist` middleware (localStorage) carrega user ao abrir app
- Se store vazio mas cookie presente → fetch `/me` (endpoint simples que devolve `{ user }` baseado no `@CurrentUser()`)
- Se store cheio mas cookie expirou → `/me` devolve 401 → logout → redirect login

**Nota:** endpoint `GET /me` ou `GET /auth/me` adiciona 1 rota a mais no total. **Minha pref: incluir** (3 rotas em `/auth/*` ao invés de 2) — custo zero, benefício alto de re-hidratação. Confirmar antes de implementar.

## 4. Mapeamento de scopes de commit

| Área | Scope |
|---|---|
| Prisma schema (User/Session + migrations) | `feat(api):` |
| Módulos `users/` e `auth/` no backend | `feat(api):` |
| Guard, filter, decorators em `@common/` | `feat(api):` |
| Seed de admin | `chore(api):` ou `feat(api):` dependendo do caso |
| Shared schemas Zod de auth | `feat(shared):` |
| `userStore`, `authService`, `useAuth` no web | `feat(web):` |
| Páginas `/login` + layout `(app)` | `feat(web):` |
| Componentes `LoginForm`, `LogoutButton` | `feat(web):` |

## 5. Ordem de execução das tasks

```
BOT-22 (Prisma: User + Session + migration)
  └─ BOT-23 (shared: schemas Zod de auth)
       └─ BOT-24 (api: users module com port + repo)
            └─ BOT-25 (api: argon2 hasher + sessions repo + session id generator)
                 └─ BOT-26 (api: auth module — use-cases + controller + Passport local + DTO)
                      └─ BOT-27 (api: AuthGuard global + @Public() + @CurrentUser() + AllExceptionsFilter)
                           └─ BOT-28 (api: seed de admin via SEED_ADMIN_EMAIL/PASSWORD)
                                └─ BOT-29 (web: userStore Zustand + authService + useAuth hook)
                                     └─ BOT-30 (web: /login page + LoginForm + AuthTemplate)
                                          └─ BOT-31 (web: (app)/layout com shell protegido + LogoutButton)
```

10 tasks (BOT-22..BOT-31). Toda `[S]` sequencial — camadas se empilham.

## 6. Bundles de commit sugeridos

- **Bundle A** (`feat(api): add user and session models with auth foundations`): BOT-22 + BOT-23 + BOT-24
- **Bundle B** (`feat(api): add password login and session management`): BOT-25 + BOT-26
- **Bundle C** (`feat(api): protect routes with global auth guard`): BOT-27
- **Bundle D** (`chore(api): seed demo admin user`): BOT-28
- **Bundle E** (`feat(web): add user store, auth service and useAuth hook`): BOT-29
- **Bundle F** (`feat(web): add login page and protected shell`): BOT-30 + BOT-31

6 bundles / 6 PRs. Granularidade boa pra review.

## 7. Riscos arquiteturais

### 7.1 Guard global quebra `/health` se não for whitelistado

Mitigação: BOT-27 inclui `@Public()` no `HealthController` como parte da task. Teste e2e do `002-bootstrap` continua passando (`GET /health` sem cookie).

### 7.2 Testcontainers em testes de auth demora

argon2 é CPU-bound. Mitigação: nos testes unit, mock `IPasswordHasher`. Nos e2e, usar params argon2 mais baixos via config override (`memoryCost: 1024` em test env).

### 7.3 Cookie SameSite=Lax bloqueia POST cross-site, mas em dev os ports diferem (3000 ↔ 3333)

Same-site é baseado no eTLD+1, não em porta. `localhost:3000` e `localhost:3333` são same-site. OK.

### 7.4 Rolling session em concorrência (2 requests simultâneos no mesmo cookie)

Dois `UPDATE sessions SET expires_at = ...` concorrentes. Last-write-wins é aceitável (ambos avançam, só um ganha). Sem lock pra manter simples.

### 7.5 Logout "falha" se sessão já expirou

Opções: 204 idempotente (reset cookie no cliente dá o mesmo efeito) ou 401. Decisão: **204**, logout é operação cliente — cookie limpo é o resultado desejado independente do server.

## 8. Fora do escopo deste spec

- Register / signup público
- Password reset / email verification
- MFA / passkeys
- Roles / RBAC complexo
- Refresh token
- Rate limit (vem em `005` com throttler global aplicado em `/auth/login` e `/connections`)
- Sweep job de sessões expiradas
- Audit log de login (deferred)

## 9. Decisões em aberto (confirmar antes de BOT-29)

1. **`GET /auth/me` existe?** Minha pref: sim (barato, útil pra re-hidratação). Vira 3 rotas em `/auth/*` ao invés de 2.

## 10. Próximo passo

Validar `tasks.md`, decidir aberta em §9, abrir branch `BOT-22/felpa-auth-prisma-models`, começar pela Bundle A.
