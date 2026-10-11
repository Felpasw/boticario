# ADR 0002 — Autenticação do endpoint de ingestão

- **Status**: Accepted
- **Date**: 2026-10-11
- **Owners**: @Felpasw

## Contexto

A API precisa receber eventos de conexão de Wi-Fi via `POST /connections`.
No cenário de produção esperado, esses eventos chegariam de um dispositivo
na loja (roteador MikroTik/UniFi ou similar) e não de um usuário humano
operando o dashboard. O MVP original resolveu a autenticação dessa rota
reusando o `AuthGuard` global baseado em sessão por cookie, o mesmo que
protege as rotas do dashboard.

A revisão apontou o descasamento: um roteador não mantém sessão de cookie
com um dashboard web. Qualquer integração real exigiria um fluxo separado.

Esta ADR trava a mudança do endpoint de ingestão para autenticação baseada
em chave compartilhada, mantendo o esquema de sessão por cookie para as
rotas consumidas pelo dashboard (`GET /connections` e `GET /metrics/*`).

## Opções consideradas

### Opção A — Manter cookie de sessão (status quo até esta ADR)

- Vantagens: zero código novo, zero superfície adicional, reusa a stack de
  auth já pronta.
- Desvantagens: inviável para o cenário real do produto (roteador não
  loga em dashboard). Testar o ingest exigia logar antes via navegador ou
  script simulando curl.
- Veredito: insuficiente mesmo para demo convincente, deixado explícito
  em revisão.

### Opção B — Chave única via env var + guard customizado (**escolhida**)

- Vantagens:
  - Fluxo real do produto fica viável: roteador manda `X-Ingest-Key:
    <segredo>` em todas as chamadas.
  - Rotação de chave = trocar env var + restart (sem migrations, sem
    código).
  - Zero superfície adicional: nenhuma tabela, nenhum endpoint de CRUD,
    nenhuma tela.
  - Comparação da chave usa `timingSafeEqual` para evitar timing attack
    por tamanho.
- Desvantagens:
  - Uma única chave: compromisso dela compromete todos os dispositivos
    de ingest. Mitigado em MVP mono-loja (só existe um dono/dispositivo
    conceitual).
  - Rotação propaga via restart, não é instantânea para o cliente.
- Veredito: ponto adequado da curva custo-benefício para o escopo atual
  (MVP mono-loja, sem roteador físico, foco em demo).

### Opção C — Tabela `ApiKey` com CRUD + UI de administração

- Vantagens:
  - Múltiplas chaves por dono (um por dispositivo).
  - Revogação imediata (flipar `revokedAt`).
  - Rotação sem downtime (chaves overlap).
  - Telemetria por chave (`lastUsedAt`, contador).
- Desvantagens:
  - Modelo + migration + repository + service + controller + guard +
    página do dashboard + testes.
  - Esforço estimado: 4-6h.
  - Nenhum valor adicional demonstrável no case do MVP (uma loja, um
    dono, um dispositivo lógico).
- Veredito: caminho correto em produção com múltiplas lojas ou com
  múltiplos devices por loja. Fora do escopo deste MVP.

## Decisão

Adotar a **Opção B**:

- Novo guard `IngestKeyGuard` em
  `apps/api/src/connections/infrastructure/guards/ingest-key.guard.ts`.
- Guard lê `INGEST_API_KEY` do `ConfigService` e compara com o header
  `X-Ingest-Key` do request usando `timingSafeEqual` sobre buffers de
  mesmo comprimento.
- Guard também lê `INGEST_USER_EMAIL`, resolve o `User` correspondente
  via `UsersService.findByEmail`, e injeta o user no `request.user` para
  que o controller continue usando `@CurrentUser()` sem conhecer o
  mecanismo de auth.
- O endpoint `POST /connections` recebe os decorators `@Public()`
  (desliga o `AuthGuard` global) e `@UseGuards(IngestKeyGuard)` (ativa o
  guard específico).
- Rotas de leitura (`GET /connections` e todas em `/metrics/*`) seguem
  intactas sob o `AuthGuard` por cookie — dashboard não muda.
- Variáveis `INGEST_API_KEY` e `INGEST_USER_EMAIL` entram no
  `.env.example` da API e são obrigatórias no boot.
- Rate limit do endpoint (`@Throttle` 1000/min) permanece aplicado.

## Consequências

### Imediatas

- Scripts e integradores externos passam a enviar `X-Ingest-Key` no
  header; o cookie não é mais aceito nessa rota.
- Teste manual via Swagger exige configurar o header na UI; alternativa
  é curl.
- Documentação de setup (`docs/rodando.md` e `README.md`) ganha a nova
  env var.
- Testes de smoke do commit da feature cobrem: sem key → 401, key
  errada → 401, key correta → 201, idempotência preserved com key
  correta, GET continua funcional com cookie.

### Follow-up (quando o produto escalar)

Migrar para a Opção C quando qualquer dos critérios abaixo for atingido:

- Mais de um dispositivo de ingest por loja (ex: roteador principal +
  roteador de backup).
- Necessidade de revogação instantânea de uma chave comprometida sem
  derrubar a API para rotação.
- Múltiplos donos/lojas (quebra a premissa mono-loja).

Mapa da migração:

1. Nova tabela `ApiKey { id, userId, hashedKey, name, createdAt,
   lastUsedAt, revokedAt }`.
2. Migration de dados: criar uma `ApiKey` por `User`, com hash da chave
   atual, nome `"legacy-env-key"`.
3. Trocar `IngestKeyGuard` para buscar na tabela ao invés da env.
4. Página `/settings/api-keys` no dashboard: listar, criar, revogar.
5. Após adoção, remover `INGEST_API_KEY` da env.

Mantido fora do escopo até a demanda real existir.
