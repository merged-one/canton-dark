# Dependency Rules

## Architectural Boundary

- `packages/domain-core` owns durable business rules and must not depend on any `@canton-dark/*` package.
- `packages/app-services` orchestrates domain behavior and may define ports, but not adapter implementations.
- `packages/adapters-*` implement ports and may not become the source of policy.
- `packages/sim-harness` exercises the system through public service boundaries and seeded deterministic environments.
- `packages/ui-sdk` and `packages/ui-kit` stay presentation-focused and must not import domain or adapter packages.
- `apps/*` stay thin and compose SDKs, contracts, and query models rather than inventing product rules.

## Allowed Frontend Dependencies

- UI apps may depend on `@canton-dark/ui-sdk`, `@canton-dark/ui-kit`, `@canton-dark/api-contracts`, and `@canton-dark/query-models`.
- UI apps must not import `@canton-dark/domain-core`, `@canton-dark/app-services`, or `@canton-dark/adapters-*`.

## Allowed Backend Dependencies

- `apps/venue-api` may orchestrate `app-services`, `api-contracts`, `sim-harness`, and adapter packages.
- `apps/venue-api` must not import UI packages.
- `packages/app-services` may depend on `domain-core`, `query-models`, `api-contracts`, and `testkit`.

## Enforcement

- ESLint import restrictions in [eslint.config.mjs](/Users/charlesdusek/Code/canton-dark/eslint.config.mjs) enforce these boundaries in CI.
- ADRs [0005](/Users/charlesdusek/Code/canton-dark/docs/adr/0005-frontends-as-thin-adapters.md), [0007](/Users/charlesdusek/Code/canton-dark/docs/adr/0007-operator-owned-risk-controls-and-vendor-boundary.md), and [0009](/Users/charlesdusek/Code/canton-dark/docs/adr/0009-headless-kernel-ports-and-deterministic-simulation-base.md) define the durable rationale.
- New package boundaries or dependency exceptions require an ADR update before the code change lands.
