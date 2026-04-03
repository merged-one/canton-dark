# Canton Dark

Canton Dark is a TypeScript monorepo for a regulated-operator factory that will evolve through:

1. `SingleDealerPair` with dealer RFQ.
2. `ATSPair` with directed multi-dealer RFQ.
3. `ATSPair` with conditional dark crossing.

The repo is organized so that business rules live in headless packages, frontends stay thin, and deterministic verification is the default.

## Commands

- `pnpm install`
- `pnpm lint`
- `pnpm typecheck`
- `pnpm test`
- `pnpm test:unit`
- `pnpm test:property`
- `pnpm test:property:replay --seed 424242 --path <failure-path>`
- `pnpm test:contract`
- `pnpm test:e2e`
- `pnpm ci:verify`

## Key Locations

- `apps/` thin applications and adapters
- `packages/` headless domain, service, simulation, SDK, and adapter packages
- `daml/` ledger-model placeholders
- `docs/architecture/overview.md` system overview
- `docs/adr/` architectural decisions
- `AGENTS.md` durable instructions for coding agents
