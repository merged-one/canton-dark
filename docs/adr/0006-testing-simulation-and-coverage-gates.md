# 0006 Testing, Simulation, and Coverage Gates

## Status

Accepted

## Context and Problem Statement

The repository is intended to evolve through multiple phases while keeping operator policy and privacy behavior stable. That requires tests that are deterministic, easy to replay, and strict enough to prevent silent erosion in the rule-bearing packages.

## Decision Drivers

- Headless rule modules are the highest-risk area for behavioral drift.
- Property tests and simulations need deterministic seeds to support replay.
- Coverage targets should reflect the differing criticality of domain rules versus thin adapters.

## Considered Options

- Use best-effort tests and informal manual verification.
- Enforce strict coverage and deterministic replay only in CI.
- Build deterministic unit, property, contract, and e2e lanes with explicit coverage gates.

## Decision Outcome

Chosen option: "Build deterministic unit, property, contract, and e2e lanes with explicit coverage gates."

The repository will maintain:

- 100% lines, branches, functions, and statements for `packages/domain-core`, `packages/app-services`, `packages/sim-harness`, and future critical rule modules.
- 95% or better for thin adapters and UI applications.
- A repo-wide target of 98% or higher, excluding generated code, type-only files, and tiny wiring shims.

Property tests must run with deterministic seeds and support replay commands. Contract tests verify package and transport seams. Browser e2e tests confirm that the thin adapter layer still composes the headless system correctly.

## Consequences

- Every new rule module should arrive with direct unit coverage.
- Coverage regressions should fail quickly during local verification and CI.
- Simulation utilities should expose deterministic seeds, clocks, and replay metadata rather than relying on ambient randomness.
