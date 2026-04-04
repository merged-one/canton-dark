# Canton Dark

Canton Dark is a TypeScript monorepo for a regulated-operator factory that will evolve through:

1. `SingleDealerPair` with dealer RFQ.
2. `ATSPair` with directed multi-dealer RFQ.
3. `ATSPair` with conditional dark crossing.

The repo is organized so that business rules live in headless packages, frontends stay thin, and deterministic verification is the default.

## Toolchain

- Node `24+`
- `pnpm 10.32.1`
- JDK `17+`
- DPM `3.4.x` for all Daml build and test commands

The Canton 3.4 line deprecates `daml-assistant` style `daml build` and `daml test` workflows for new work. This repo uses `dpm` instead.

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
- `pnpm test:e2e:smoke`
- `pnpm demo:phase1`
- `pnpm demo:phase2`
- `pnpm demo:phase3`
- `pnpm sim:replay --seed 424242`
- `pnpm doctor:repo`
- `pnpm doctor:demo`
- `pnpm ci:verify`
- `pnpm ci:full`

## Key Locations

- `apps/` thin applications and adapters
- `packages/` headless domain, service, simulation, SDK, and adapter packages
- `daml/` ledger-model placeholders
- `docs/architecture/overview.md` system overview
- `docs/architecture/testing-strategy.md` deterministic test and coverage policy
- `docs/architecture/dependency-rules.md` enforced package-boundary rules
- `docs/demo/runbooks/` phase-by-phase demo instructions
- `docs/adr/` architectural decisions
- `AGENTS.md` durable instructions for coding agents
