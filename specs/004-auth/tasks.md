# Auth (BOT-22 … BOT-31)

> **Depende de `002-bootstrap` concluído** (NestJS + Prisma + Next.js + shared package + queryClient + axios + Zustand prontos).
>
> Companion a `spec.md` (o quê) e `plan.md` (como/decisões/riscos).

## Decisões (recap do `plan.md`)

- Cookie-session (opaque id de 64 chars hex) + session store em Postgres, zero JWT
- argon2id com params default (ajustável em test env pra `memoryCost: 1024`)
- Passport local strategy fina delegando pra use-case `login-with-password`
- Rolling session: bumpa `expiresAt` se faltar < 24h
- Guard global via `APP_GUARD` + `@Public()` em `/health` e `/auth/login` + `/auth/me`
- Error envelope padronizado via `AllExceptionsFilter`
- User via seed (`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`), zero register
- Front: Zustand com persist + axios com `withCredentials` + classe `AuthHooks` com `use()` método (padrão `money-assistance`)

## Convenções

- Todas `[S]` sequenciais (`plan.md` §5)
- Scope: `feat(api):` pra api, `feat(shared):` pra schemas Zod, `feat(web):` pra front, `chore(api):` pra seed
- Bundles sugeridos no `plan.md` §6

---

## Fase 0 — Schema + shared

- [x] **BOT-22** [S] [T] — ✅ commit `258cd62` — Prisma: models `User` + `Session`:
  - Edita `apps/api/prisma/schema.prisma` adicionando `User` e `Session` (ver `spec.md` §3)
  - `pnpm --filter api prisma migrate dev --name add_user_and_session`
  - Teste: cria smoke test de integração em `apps/api/test/users.integration-spec.ts` que `prisma.user.create` + `prisma.session.create` + queries básicas (via Testcontainers)
  - Validação: migration aplica sem erro; teste passa; `prisma generate` atualiza client

- [x] **BOT-23** [S] [T] — ✅ commit `fa02261` — Shared: schemas Zod de auth:
  - Cria `packages/shared/src/schemas/auth.ts`:
    - `LoginRequestSchema` = `z.object({ email: z.string().email(), password: z.string().min(1) })`
    - `AuthUserSchema` = `z.object({ id: z.string().uuid(), email: z.string().email(), name: z.string() })`
    - `LoginResponseSchema` = `z.object({ user: AuthUserSchema })`
  - Exports em `packages/shared/src/index.ts`
  - Teste: `packages/shared/src/schemas/auth.test.ts` valida payloads válidos/inválidos via Vitest
  - `pnpm -r build` builda shared OK
  - Validação: `apps/api` e `apps/web` conseguem importar `{ LoginRequestSchema }` de `shared`

---

## Fase 1 — Backend: users + auth infra

- [x] **BOT-24** [S] [T] — ✅ commit `93e6886` — Módulo `users/`:
  - `apps/api/src/users/`:
    - `domain/ports/users-repository.ts` — interface `IUsersRepository` com `findByEmail`, `findById`, `create`
    - `domain/errors/user-not-found.error.ts`, `email-already-registered.error.ts`
    - `infrastructure/repositories/prisma-users.repository.ts` — impl via `PrismaService`
    - `users.service.ts` — fachada injetando o port
    - `users.module.ts` — bindings DI (`provide: 'IUsersRepository', useClass: PrismaUsersRepository`)
  - Testes:
    - Unit: `prisma-users.repository.spec.ts` com Testcontainers (CRUD básico)
  - Validação: `pnpm --filter api test` passa; módulo importável de outros módulos

- [x] **BOT-25** [S] [T] — ✅ commit `012e7b0` — Password hasher + sessions repo + id generator:
  - `apps/api/src/auth/infrastructure/argon2-password-hasher.ts` — impl de `IPasswordHasher` (`hash(plain)`, `verify(plain, hash)`)
  - `apps/api/src/auth/domain/ports/password-hasher.ts` — interface
  - `apps/api/src/auth/domain/ports/sessions-repository.ts` — interface `ISessionsRepository` com `create`, `findActiveById`, `deleteById`, `renewExpiration`
  - `apps/api/src/auth/infrastructure/repositories/prisma-sessions.repository.ts` — impl
  - `apps/api/src/auth/domain/services/session-id-generator.ts` — função pura `generateSessionId(): string` usando `crypto.randomBytes(32).toString('hex')`
  - Testes:
    - Unit: `argon2-password-hasher.spec.ts` (hash + verify round-trip)
    - Unit: `session-id-generator.spec.ts` (comprimento 64, hex válido, 2 chamadas geram ids diferentes)
    - Integration: `prisma-sessions.repository.spec.ts` com Testcontainers
  - Validação: todos os testes passam

- [x] **BOT-26** [S] [T] — ✅ commit `b543435` (bundled with BOT-27) — Auth module com use-cases + controller:
  - `apps/api/src/auth/application/use-cases/login-with-password.use-case.ts`:
    - Recebe `{ email, password }`, resolve user via `IUsersRepository.findByEmail`
    - **Se não existe**: roda `argon2.verify(password, DUMMY_HASH)` pra timing constante → lança `InvalidCredentialsError`
    - **Se existe**: verifica senha; se falha, lança `InvalidCredentialsError`
    - Em sucesso: cria session via `ISessionsRepository.create({ id: generateSessionId(), userId, expiresAt: now + 7d })`
    - Retorna `{ user, sessionId, expiresAt }`
  - `apps/api/src/auth/application/use-cases/logout.use-case.ts`:
    - Recebe `{ sessionId }`, roda `ISessionsRepository.deleteById(sessionId)` (idempotente)
  - `apps/api/src/auth/dto/login.dto.ts` — validação via `ZodValidationPipe` com `LoginRequestSchema`
  - `apps/api/src/auth/auth.controller.ts`:
    - `POST /auth/login` → chama use-case, seta cookie `boticario_session` (HttpOnly, SameSite=Lax, Secure se NODE_ENV=production, maxAge 7d), devolve `{ user }` + status 200
    - `POST /auth/logout` → chama use-case, limpa cookie com `maxAge: 0`, devolve 204
    - `GET /auth/me` → devolve `{ user }` com `@CurrentUser()` (requer auth)
  - `apps/api/src/auth/auth.module.ts` — bindings DI, imports `UsersModule`, exports `AuthService` + guards
  - Testes:
    - Unit: `login-with-password.use-case.spec.ts` (3 cenários: sucesso, email inexistente, senha errada — mock de repos + hasher)
    - Unit: `logout.use-case.spec.ts`
    - E2E: `apps/api/test/auth.e2e-spec.ts` com Testcontainers (login 200 + cookie; login 401 com credential ruim; logout 204; `/auth/me` 200 autenticado / 401 sem cookie)
  - Validação: todos os testes passam; manual via `curl -c cookies.txt :3333/auth/login -d ...` funciona

- [x] **BOT-27** [S] [T] — ✅ commit `b543435` — Guard global + decorators + exception filter:
  - `apps/api/src/auth/infrastructure/guards/auth.guard.ts` — lê cookie, resolve session + user, renova se faltar < 24h, injeta `request.user`
  - `apps/api/src/auth/infrastructure/decorators/public.decorator.ts` — `export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)`
  - `apps/api/src/auth/infrastructure/decorators/current-user.decorator.ts` — `createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest().user)`
  - `apps/api/src/@common/infrastructure/filters/all-exceptions.filter.ts` — padroniza error envelope (ver `spec.md` §7)
  - `apps/api/src/app.module.ts` — registra `APP_GUARD: AuthGuard` + `APP_FILTER: AllExceptionsFilter`
  - Marca `@Public()` em `HealthController.getHealth()`, `AuthController.login()` (login não pode exigir cookie)
  - Testes:
    - Unit: `auth.guard.spec.ts` (whitelist via @Public, rejeita sem cookie, rejeita com cookie inválido, renova se expiresAt < 24h)
    - E2E: `apps/api/test/health.e2e-spec.ts` continua passando (/health sem cookie)
    - E2E: nova rota dummy protegida devolve 401 sem cookie
  - Validação: `pnpm --filter api test` + `test:e2e` passam

- [x] **BOT-28** [S] — ✅ commit `ed3d1b6` — Seed de admin:
  - `apps/api/prisma/seed.ts`:
    - Lê `SEED_ADMIN_EMAIL` + `SEED_ADMIN_PASSWORD` do env
    - `prisma.user.upsert({ where: { email }, create: { email, name: 'Admin', passwordHash: await argon2.hash(password) }, update: {} })`
    - Idempotente: rodar 2x não quebra
  - `apps/api/package.json` adiciona `"prisma": { "seed": "ts-node prisma/seed.ts" }` + script `"db:seed": "prisma db seed"`
  - `.env.example` ganha `SEED_ADMIN_EMAIL=admin@boticario.local`, `SEED_ADMIN_PASSWORD=change-me-dev`
  - Validação: `pnpm --filter api db:seed` cria user; roda 2x sem erro; `curl :3333/auth/login` com essas credenciais funciona

---

## Fase 2 — Frontend

- [x] **BOT-29** [S] [T] — ✅ commit `3e11545` — `userStore` + `authService` + `useAuth`:
  - `apps/web/src/stores/userStore.ts`:
    - Zustand com `persist` middleware, nome `"boticario:user-store"`
    - State: `{ user: AuthUser | null }` (tipo importado do `shared`)
    - Exports: `useUserStore` + `userStoreActions = { setUser, clearUser }`
  - `apps/web/src/services/interfaces/auth.interface.ts`:
    - Tipos derivados dos schemas do shared via `z.infer<...>`: `LoginCredentials`, `LoginResponse`
    - Interface `IAuthService { login, logout, me }`
  - `apps/web/src/services/auth.service.ts`:
    - `class AuthService implements IAuthService` com `login(creds)`, `logout()`, `me()`
    - Cada método chama `api.post/get` correspondente
    - `export default new AuthService()`
  - `apps/web/src/hooks/interfaces/useAuth.interface.ts`:
    - `AuthHooksResult = { login: UseMutationResult<...>, logout: UseMutationResult<...>, me: UseQueryResult<...> }`
    - `IAuthHooks = { use: () => AuthHooksResult }`
  - `apps/web/src/hooks/useAuth.ts`:
    - `export const AUTH_QUERY_KEYS = { all: ['auth'] as const, me: ['auth', 'me'] as const }`
    - `class AuthHooks implements IAuthHooks` com `use()` chamando `useMutation`/`useQuery` em ordem fixa
    - `onSuccess` do login chama `userStoreActions.setUser`; `onSuccess` do logout chama `userStoreActions.clearUser` + `queryClient.clear()`
    - `export default new AuthHooks()`
  - Testes:
    - `userStore.test.ts` — set/clear + persist smoke
    - `auth.service.test.ts` — mock axios e verifica calls
    - `useAuth.test.tsx` — renderiza hook via `renderHook` com `QueryClientProvider`, mock axios, dispara login + verifica store atualizado
  - Validação: `pnpm --filter web test` passa

- [x] **BOT-30** [S] [T] — ✅ commits `7be14a1` (ui primitives + animated atoms) + `cb7802c` (landing + login) — `/login` page + `LoginForm` + `AuthTemplate`:
  - `apps/web/src/components/templates/AuthTemplate.tsx` — layout centralizado com card
  - `apps/web/src/components/molecules/LoginForm.tsx`:
    - RHF + `zodResolver(LoginRequestSchema)` do shared
    - Campos email + password, botão submit
    - Chama `authHooks.use().login.mutate(values, { onSuccess: () => router.push('/'), onError: setErrorMsg })`
    - Exibe loading state no submit (`login.isPending`)
    - Exibe erro inline quando `login.error`
  - `apps/web/src/app/(auth)/layout.tsx` — layout sem shell (só pros páginas públicas)
  - `apps/web/src/app/(auth)/login/page.tsx` — monta `<AuthTemplate><LoginForm /></AuthTemplate>`
  - Testes:
    - `LoginForm.test.tsx` — render + validação (email inválido mostra erro, submit vazio bloqueado, submit válido chama o service)
  - Validação: `pnpm --filter web dev`, browser em `/login`, submete admin + senha → navega pra `/`

- [x] **BOT-31** [S] [T] — ✅ commit `4d947bd` — `(app)/layout` protegido + `LogoutButton`:
  - `apps/web/src/app/(app)/layout.tsx` — Server Component:
    - Lê cookie `boticario_session` via `cookies()` do `next/headers`
    - Se ausente → `redirect('/login')`
    - (Opcional) fetch pra `GET /auth/me` com forward do cookie pra validar + hidratar user
    - Renderiza shell com nav + `<LogoutButton />` + children
  - `apps/web/src/components/atoms/LogoutButton.tsx`:
    - `'use client'` + chama `authHooks.use().logout.mutate(undefined, { onSuccess: () => router.push('/login') })`
    - Loading state via `logout.isPending`
  - `apps/web/src/app/(app)/page.tsx` — placeholder "Dashboard em breve" (vai ser substituído em `005`)
  - Testes:
    - `LogoutButton.test.tsx` — click dispara mutation; store é limpo
    - E2E manual: logado em `/`, click logout → redirect pra `/login` + não consegue voltar pra `/` sem logar
  - Validação: `pnpm --filter web dev` + fluxo manual (login → navegar → logout → bloqueado)

---

## Checklist de encerramento

- [ ] `pnpm --filter api db:seed` cria admin idempotentemente
- [ ] `POST /auth/login` com credencial válida devolve 200 + cookie `boticario_session`
- [ ] `POST /auth/login` com senha errada ou email inexistente devolve `401 INVALID_CREDENTIALS` (mesmo erro)
- [ ] `POST /auth/logout` devolve 204 + cookie limpo (idempotente)
- [ ] `GET /auth/me` devolve `{ user }` autenticado / 401 sem cookie
- [ ] `GET /health` continua respondendo sem autenticação
- [ ] Qualquer rota não whitelistada devolve 401 sem cookie
- [ ] Rolling session bumpa `expiresAt` quando < 24h
- [ ] `/login` renderiza, submete, redireciona pra `/`
- [ ] `/` sem cookie redireciona pra `/login`
- [ ] Logout limpa `userStore` + queryClient + redireciona pra `/login`
- [ ] Error envelope consistente em todas as rotas (statusCode, error, message, timestamp, path)
- [ ] `pnpm lint` + `pnpm typecheck` + `pnpm test` + `pnpm build` passam
- [ ] CI do `003` continua verde

## Fora do escopo (vai pra `005` ou spec próprio)

- Modelos `Store`, `Device`, `Connection` (em `005-wifi-insights`)
- Rate limit no `/auth/login` (vem com `@nestjs/throttler` global em `005`)
- Sweep job de sessões expiradas (deferred)
- Audit log de login (deferred)
