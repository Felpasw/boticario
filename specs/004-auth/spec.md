# 004 — Auth (SPEC)

> Status: **specification only**. Companion a `plan.md` (abordagem) e `tasks.md` (quebra).

## 1. Resumo

Autenticação de usuário via **cookie de sessão HttpOnly** com session store no **Postgres**. Usuário vem via **seed** (sem endpoint de register). Rotas: `POST /auth/login` e `POST /auth/logout`. Guard global protege tudo que não for whitelistado. Front com `services/auth.service.ts` + `hooks/useAuth.ts` + `stores/userStore.ts` (Zustand com persist) — padrão molecular herdado do `money-assistance`.

## 2. Escopo

**Dentro**

- Models Prisma: `User`, `Session`
- Módulo `apps/api/src/users/` com `users.service.ts` + `UsersRepository` (port + Prisma adapter)
- Módulo `apps/api/src/auth/` com `auth.controller.ts` + `auth.service.ts` + use-cases + Passport local strategy + argon2 hasher + sessions repository
- `AuthGuard` global aplicado via `APP_GUARD` com decorator `@Public()` pra whitelistar `/health` e `/auth/login`
- DTOs em `shared/` (Zod schemas): `LoginRequestSchema`, `LoginResponseSchema`, `AuthUserSchema`
- Cookie de sessão: `HttpOnly`, `SameSite=Lax`, `Secure` em prod, path `/`, maxAge 7 dias com rolling update
- Seed de usuário demo (`admin@boticario.local` / senha configurável via env)
- Front:
  - `src/stores/userStore.ts` (Zustand com persist)
  - `src/services/auth.service.ts` (classe implementando `IAuthService`)
  - `src/hooks/useAuth.ts` (classe `AuthHooks` com `use(): AuthHooksResult`)
  - `src/app/(auth)/login/page.tsx` (login form com React Hook Form + Zod resolver usando schema do `shared`)
  - `src/app/(app)/layout.tsx` (shell protegido — redireciona pra `/login` se não logado)
  - Componente `atoms/LogoutButton` + `molecules/LoginForm` + `templates/AuthTemplate`
- Testes:
  - **api**: unit do use-case de login (sucesso/erro de credencial/senha errada); e2e `/auth/login` com Testcontainers (200 com cookie `set-cookie`, 401 em credencial inválida, 429 após rate limit)
  - **web**: smoke render do `LoginForm`; unit do `AuthHooks.use()` com queryClient mock + axios mock

**Fora**

- Register / signup (user vem só via seed)
- OAuth / Google login
- Email verification / password reset
- MFA / passkeys
- Roles / RBAC (owner tem 1 store e pronto — ver `005-wifi-insights`)
- Refresh token endpoint (sessão rolling resolve, sem token separado)
- Rate limit por endpoint (vem no `005` com `@nestjs/throttler` global)

## 3. Prisma schema

```prisma
model User {
  id           String    @id @default(uuid())
  email        String    @unique
  name         String
  passwordHash String
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt
  sessions     Session[]
  stores       Store[]   // declarado em 005
}

model Session {
  id        String   @id              // opaque, randomBytes(32).toString('hex')
  userId    String
  createdAt DateTime @default(now())
  expiresAt DateTime
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId])
  @@index([expiresAt])
}
```

Decisões:

- `Session.id` opaque (64 chars hex) — vai dentro do cookie `boticario_session`
- `onDelete: Cascade` em `Session.user` — se user for deletado, sessões somem
- Index em `expiresAt` pro job futuro de limpeza (sweep de sessões expiradas — adiado, não blocker)
- Nenhum `refreshToken` separado — sessão rolling (atualiza `expiresAt` em todo request autenticado se faltar < 1 dia pra expirar)

## 4. Estrutura do backend

### `apps/api/src/users/`

```
users/
  users.module.ts
  users.service.ts
  users.controller.ts        # (vazio por ora, módulo exposto só pra DI)
  domain/
    ports/
      users-repository.ts    # interface IUsersRepository
    errors/
      user-not-found.error.ts
      email-already-registered.error.ts  # usado por seed
  infrastructure/
    repositories/
      prisma-users.repository.ts
```

### `apps/api/src/auth/`

```
auth/
  auth.module.ts
  auth.controller.ts
  auth.service.ts
  dto/
    login.dto.ts             # class validation da entrada (pipe Zod via shared)
    logout.dto.ts
  application/
    use-cases/
      login-with-password.use-case.ts
      logout.use-case.ts
    types/
      login.ts
      logout.ts
  domain/
    errors/
      invalid-credentials.error.ts
      session-expired.error.ts
    services/
      session-id-generator.ts   # randomBytes wrapper (puro)
    ports/
      password-hasher.ts        # interface IPasswordHasher
      sessions-repository.ts    # interface ISessionsRepository
  infrastructure/
    argon2-password-hasher.ts   # impl do IPasswordHasher
    repositories/
      prisma-sessions.repository.ts
    guards/
      auth.guard.ts             # extrai cookie, valida, injeta user no request
    decorators/
      public.decorator.ts       # @Public() pra whitelistar rotas
      current-user.decorator.ts # @CurrentUser() injeta user autenticado
```

### `apps/api/src/@common/` (adições)

- `infrastructure/pipes/zod-validation.pipe.ts` — pipe genérico que valida body contra schema Zod do `shared`

## 5. Endpoints

### `POST /auth/login`

- **Body**: `{ email, password }` (validado via `LoginRequestSchema` do `shared`)
- **Sucesso (200)**:
  - Cria session row (`id` = randomBytes(32).toString('hex'), `expiresAt` = now + 7d)
  - Seta cookie `boticario_session=<id>` (HttpOnly, SameSite=Lax, Secure em prod, maxAge 7d)
  - Body: `{ user: { id, email, name } }`
- **Erros**:
  - `400` — validação de payload (Zod)
  - `401 INVALID_CREDENTIALS` — email não existe OU senha errada (mesmo erro pros dois cenários pra evitar user enumeration)

### `POST /auth/logout`

- **Body**: vazio
- **Sucesso (204)**:
  - Lê cookie, deleta session row, limpa cookie com `maxAge: 0`
  - Sem body
- **Erros**:
  - `401 UNAUTHORIZED` — sem cookie / cookie inválido (idempotente — reset do cookie no cliente vale igual)

### Rolling session (middleware/guard)

- Em todo request autenticado: se `session.expiresAt - now < 1 day`, bumpa pra `now + 7d` + re-emite cookie
- Idempotente, sem side-effect visível pro user

## 6. Guard global

`AuthGuard` registrado via `APP_GUARD` no `AppModule`. Fluxo:

1. Lê cookie `boticario_session`
2. Se rota tem `@Public()` → libera sem validar
3. Senão: carrega session row via `ISessionsRepository.findActiveById(id)`
4. Se não existe / expirou → `401 UNAUTHORIZED`
5. Carrega user via `IUsersRepository.findById(session.userId)`
6. Anexa `request.user = user`; aplica rolling se necessário
7. Libera

Decoradores:

- `@Public()` → marca rota como não-autenticada (metadata `IS_PUBLIC_KEY`)
- `@CurrentUser()` → `createParamDecorator` que extrai `request.user`

## 7. Error envelope (padrão pro projeto todo)

Todas as rotas devolvem o mesmo formato em erro:

```json
{
  "statusCode": 401,
  "error": "INVALID_CREDENTIALS",
  "message": "email ou senha inválidos",
  "timestamp": "2026-10-08T14:05:00Z",
  "path": "/auth/login"
}
```

- Implementado via `AllExceptionsFilter` em `src/@common/infrastructure/filters/all-exceptions.filter.ts`
- Registrado via `APP_FILTER` no `AppModule`
- Erros tipados do domain (`InvalidCredentialsError`, etc) mapeiam pra statusCode/error específicos via `switch` no filter

## 8. Frontend

### `src/stores/userStore.ts`

Zustand com `persist` (localStorage), nome `"boticario:user-store"`. Exporta `useUserStore` + `userStoreActions`.

```ts
interface UserState {
  user: AuthUser | null;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}
```

### `src/services/auth.service.ts`

```ts
class AuthService implements IAuthService {
  async login(credentials: LoginCredentials): Promise<LoginResponse> {
    const { data } = await api.post<LoginResponse>('/auth/login', credentials);
    return data;
  }
  async logout(): Promise<void> {
    await api.post('/auth/logout', {});
  }
}
export default new AuthService();
```

Tipos em `src/services/interfaces/auth.interface.ts` reusando os schemas do `shared` (`z.infer<typeof LoginRequestSchema>` etc).

### `src/hooks/useAuth.ts`

```ts
export const AUTH_QUERY_KEYS = { all: ['auth'] as const };

class AuthHooks implements IAuthHooks {
  use(): AuthHooksResult {
    const queryClient = useQueryClient();

    const login = useMutation<LoginResponse, unknown, LoginCredentials>({
      mutationFn: (creds) => authService.login(creds),
      onSuccess: (data) => userStoreActions.setUser(data.user),
    });

    const logout = useMutation<void, unknown, void>({
      mutationFn: () => authService.logout(),
      onSuccess: () => {
        userStoreActions.clearUser();
        queryClient.clear();
      },
    });

    return { login, logout };
  }
}

export default new AuthHooks();
```

### Páginas

- `src/app/(auth)/login/page.tsx` — form com RHF + `zodResolver(LoginRequestSchema)`, mutation do `useAuth().login`, redirect pra `/` em sucesso, exibe erro de credential inline
- `src/app/(app)/layout.tsx` — Server Component que lê cookie no server (`cookies()` do `next/headers`); se não houver, `redirect('/login')`; renderiza o shell com nav + `<LogoutButton />`
- `src/app/(app)/page.tsx` — redireciona pra `/dashboard` (ou dashboard direto aqui, decisão do 005)

### Componentes (Atomic Design)

- `atoms/LogoutButton` — botão que chama `useAuth().logout.mutate()` + `router.push('/login')`
- `molecules/LoginForm` — form controlado por RHF, exibe erros, loading state no submit
- `templates/AuthTemplate` — layout centrado da tela de login (card + logo)

## 9. Variáveis de ambiente novas

### `apps/api/.env.example`

```
SESSION_COOKIE_SECRET=change-me   # usado pra assinar cookie (futuro — por enquanto só opaque id)
SEED_ADMIN_EMAIL=admin@boticario.local
SEED_ADMIN_PASSWORD=change-me-dev
```

## 10. Critérios de sucesso

- `pnpm --filter api db:seed` cria o usuário admin
- `POST /auth/login` com credencial correta devolve 200 + cookie `boticario_session`
- `POST /auth/login` com senha errada devolve `401 INVALID_CREDENTIALS` (mesmo erro de email inexistente)
- `POST /auth/logout` com cookie válido devolve 204 + cookie limpo
- `GET /health` responde sem autenticação (via `@Public()`)
- Qualquer outra rota sem cookie devolve `401 UNAUTHORIZED`
- Rolling session: request autenticado com `expiresAt` próximo bumpa a sessão (verificável no DB)
- Página `/login` renderiza, submete com credencial correta e redireciona pra `/`
- Página protegida sem cookie redireciona pra `/login`
- Logout limpa `userStore` + queryClient + redireciona
- Testes passam: unit do login use-case (3 cenários), e2e do /auth/login + /auth/logout, smoke render do LoginForm

## 11. Riscos e mitigações

| Risco                                                                           | Mitigação                                                                                      |
| ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| User enumeration via timing diferente entre "email não existe" e "senha errada" | Sempre rodar `argon2.verify` com hash dummy quando email não existe (constant-time)            |
| Session fixation (atacante planta cookie antes do login)                        | `POST /auth/login` sempre gera novo id de sessão, ignora cookie existente                      |
| CSRF em POST /auth/logout (que muda estado)                                     | SameSite=Lax no cookie bloqueia cross-site; CORS restrito a `NEXT_PUBLIC_API_URL` reforça      |
| Cookie XSS roubando sessão                                                      | `HttpOnly` impede JS de ler; `Secure` em prod impede HTTP; CSP no front como defesa extra      |
| Sessões ficam no DB pra sempre e crescem                                        | Index em `expiresAt` + sweep job no futuro (deferred — não blocker enquanto user único é demo) |
| Front não consegue bater em `/auth/login` cross-origin em dev                   | CORS do api lista `http://localhost:3000` + axios com `withCredentials: true`                  |

## 12. Dependências

- **Depende de**: `002-bootstrap` (NestJS + Next + Prisma + shared package já de pé; axios + queryClient + stores vazios prontos pra receber `userStore`)
- **Habilita**: `005-wifi-insights` (rotas vão exigir user autenticado via `@CurrentUser()` pra pegar o `storeId` dele)
