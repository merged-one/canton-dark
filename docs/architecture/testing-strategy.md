# Testing Strategy

## Objectives

- Keep every rule module deterministic and replayable.
- Make regressions obvious through high coverage and seeded property campaigns.
- Separate fast rule validation from browser and ledger-facing smoke coverage.

## Test Layers

- Unit tests validate deterministic rules, reducers, adapters, and transport seams.
- Property tests validate invariants under seeded random campaigns and replayable failure output.
- Contract tests validate typed API contracts and app-service boundaries.
- Browser e2e tests validate that the thin apps still compose the headless system correctly.
- Daml script packages cover on-ledger happy and negative paths when DPM and JDK 17 are available.

## Determinism Rules

- Inject clocks, seeds, and external IO.
- Persist replayable simulation output from seeds rather than relying on nondeterministic logs.
- Use `pnpm test:property:replay --seed <seed>` or `pnpm sim:replay --seed <seed>` to reproduce failures.
- Keep long-running simulation sweeps in a separate nightly lane so the pull-request path stays fast enough to use continuously.

## Simulation Invariants

- `unauthorized_visibility`
- `no_double_execution`
- `no_late_accept_after_expiry`
- `no_match_on_paused_pair`
- `deterministic_replay_from_seed`
- `lock_release_correctness`
- `idempotent_retries`

## Coverage Policy

- `packages/domain-core`, `packages/app-services`, `packages/sim-harness`, and `packages/testkit` target `100/100/100/100`.
- Adapters, apps, contracts, query models, telemetry, and UI packages target at least `95/95/95/95`.
- Repo-wide unit coverage must stay at `98%` or higher.
- Aggregate exclusions are explicit in [coverage.allowlist.json](/Users/charlesdusek/Code/canton-dark/coverage.allowlist.json).

## Command Map

- `pnpm quality`
- `pnpm unit-and-property`
- `pnpm contract-tests`
- `pnpm e2e-smoke`
- `pnpm nightly-simulation`
- `pnpm test:daml`
- `pnpm test:canton-integration`
- `pnpm ci:verify`
- `pnpm ci:full`

## Daml Tooling

- Canton 3.4+ uses DPM as the supported CLI for package install, build, sandbox, and test workflows.
- Repo scripts resolve `dpm` plus a JDK 17 runtime directly, so local verification does not depend on shell-specific aliases.
- `daml-assistant` style commands remain legacy-only and should not be introduced into scripts or CI.
