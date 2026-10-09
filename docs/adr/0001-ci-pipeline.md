# ADR 0001 — CI pipeline

- **Status**: Accepted
- **Date**: 2026-10-09
- **Owners**: @Felpasw

## Context

The repository hosts a pnpm monorepo (`apps/api` on NestJS + Prisma, `apps/web` on Next.js, `packages/shared` on TypeScript + Zod). Every change should run through automated lint, type checking, tests and build before landing on `main`. The CI output also feeds the `release-please` versioning flow set up in spec `001`, so broken checks must block merges that would otherwise trigger a release.

The goals for this spec are:

- Fast feedback on every pull request (goal: 5 min end to end on cache hits).
- Deterministic environments (pinned Node, pinned pnpm, fresh service containers).
- A clear boundary between hard requirements (merge-blocking) and nice-to-haves (coverage, Playwright) so the pipeline can evolve without rewriting the workflow.
- Zero cost beyond the GitHub Actions free tier for a solo-maintained public repo.

## Decision

### Platform: GitHub Actions

- Already available on the hosting platform; zero new accounts or billing.
- Native integration with `release-please-action@v4`, `pnpm/action-setup@v4`, service containers and branch protection.
- YAML-first config lives next to the code and is reviewed as part of each PR.

### Four parallel jobs: `lint`, `typecheck`, `test`, `build`

- `lint`, `typecheck` and `test` run in parallel; `build` gates on `typecheck` (`needs: [typecheck]`) so a broken type does not pay the Next build cost twice.
- Rationale for keeping `lint` and `test` out of the `needs` chain: they do not depend on `tsc` having run and ESLint uses its own parser; serializing them would only add latency.
- Each job runs on `ubuntu-latest` with Node 20 and the pnpm version taken from the root `packageManager` field.

### Postgres as a service container in `test`

- The health module e2e test (and every future module in `004`/`005`) talks to a real Prisma client. Mocking the database divergence would silently drift from the production migration path.
- Service containers initialise once per job and are faster than Testcontainers in CI (which re-provisions per test). Dev local keeps Testcontainers for finer-grained isolation when the repository tests land in `005`.
- Credentials are `ci/ci/ci` and the DSN is `postgresql://ci:ci@localhost:5432/ci?schema=public`. Nothing persistent, nothing shared with the docker-compose developer database.

### Prisma client generated inside the pipeline

- `pnpm --filter api prisma generate` runs before `typecheck` and inside the `test` job. The generated client is in `.gitignore`, so CI must materialise it. The shared package is also built up-front so the api can import the inferred types.

### Required checks for branch protection: `lint`, `typecheck`, `test`, `build`, `commitlint`

- `commitlint` already comes from spec `001`.
- Branch protection is turned on **manually via the GitHub UI** (BOT-21). The repository does not automate this because the GitHub Settings API requires an elevated token and the setup is a one-time action.

### Coverage, Playwright and deploy stay out of this spec

- Playwright E2E lands with `005-wifi-insights` when a login + dashboard exist to drive.
- Coverage publication (Codecov/Coveralls) needs a stable set of modules first; today the only test is the health smoke.
- Deployment lives in its own spec once the product scope is complete.

## Alternatives considered

- **CircleCI, GitLab CI, Buildkite**. Rejected: no benefit over Actions for a solo public repo, extra billing or infra, no `release-please-action` native integration.
- **Single sequential job**. Rejected: one broken check would delay feedback for every other check; the free tier runs each job in a fresh VM anyway so parallelism is free.
- **Testcontainers in CI**. Rejected: service container is 2–3× faster when the whole suite boots a single container; keeping Testcontainers for local dev preserves the "closer to prod" story.
- **Automating branch protection via Terraform or the API**. Rejected: the setup runs once, the token footprint would outweigh the benefit, and the ADR + the task flag `[HUMANO]` are enough to prevent drift.
- **Running tests inside `services.postgres` of a bigger compose**. Rejected: GitHub-provided service containers already handle lifecycle and healthchecks; shipping docker-compose into the runner would add moving parts for zero gain.

## Consequences

- Every PR must pass lint, typecheck, test and build (and commitlint from spec `001`) before merging — enforced once branch protection lands.
- Future work that adds integration tests outside the api (web unit, Playwright) will extend the `test` job or add new jobs; the pattern (`pnpm install --frozen-lockfile` + task-specific steps) scales without rewriting the shared setup.
- Should a job routinely exceed 5 minutes, revisit the cache strategy (step cache for `.next`, `apps/api/dist`) before splitting into more jobs.
- When Playwright joins (spec `005`), it needs the full stack running; expect a dedicated `e2e` job with `needs: [build]` that boots api + web in the background.
- Branch protection is only effective once BOT-21 is done. Until then, the merge rules depend on humans reading the status checks before clicking merge.
