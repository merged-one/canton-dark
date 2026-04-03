# Canton Dark Agent Guide

## Mission

- Treat this repository as a regulated-operator factory for Canton Dark venues.
- Optimize for deterministic behavior, replayable tests, and durable architectural decisions.
- Read [docs/architecture/overview.md](docs/architecture/overview.md) and the relevant ADRs before changing package boundaries or venue behavior.

## Non-Negotiable Product Rules

- Canton Dark is not a permissionless pool factory.
- `SingleDealerPair` must enforce exactly one dealer.
- `ATSPair` is operator-scoped and must preserve operator-owned access control and operator-owned risk controls.
- Never use the phrases `exchange` or `stock market` in user-facing copy, tests that assert UI text, or API examples intended for users.
- Shared cross-organization facts belong on-ledger. Local caches, analytics, telemetry projections, and transient UI state stay off-ledger.

## Architecture Rules

- Frontends are thin adapters only. Put business rules in `packages/domain-core`, orchestration in `packages/app-services`, and deterministic scenario logic in `packages/sim-harness`.
- UI applications may depend on `@canton-dark/ui-sdk`, `@canton-dark/ui-kit`, `@canton-dark/api-contracts`, and `@canton-dark/query-models`. They must not import `@canton-dark/domain-core` or adapters directly.
- `packages/app-services` may define ports, but concrete adapters live in `packages/adapters-*`.
- `apps/venue-api` may orchestrate services and adapters, but it should not grow product rules that belong in headless packages.

## Testing Rules

- Keep unit tests deterministic. Inject clocks, seeds, and external IO.
- Use `packages/testkit` for fast-check seeds and replay metadata.
- Maintain 100% line, branch, function, and statement coverage for `packages/domain-core`, `packages/app-services`, `packages/sim-harness`, and any critical rule module added later.
- Maintain at least 95% coverage for thin adapters and UI packages.
- Keep repo-wide coverage at 98% or higher, excluding generated code, type-only files, and tiny wiring shims.

## Workflow

- Start by reading the existing files and reconciling with them instead of duplicating structure.
- Prefer `pnpm` workspace commands and `turbo` pipelines over ad hoc per-package invocation.
- After substantive changes, run `pnpm lint`, `pnpm typecheck`, and the smallest relevant test command before broad verification.
- Document lasting architectural changes with a MADR entry in `docs/adr`.

## Common Commands

- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:property`
- `pnpm test:property:replay --seed 424242 --path <failure-path>`
- `pnpm test:contract`
- `pnpm test:e2e`
- `pnpm ci:verify`
