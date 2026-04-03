# 0009 Headless Kernel, Ports, and Deterministic Simulation Base

## Status

Accepted

## Context and Problem Statement

The repository needs a durable base that supports both a fast in-memory path and a Canton-backed path without re-encoding product rules in frontends or infrastructure adapters. Earlier scaffolding established the package layout, but it did not yet define the full kernel entities, port contracts, deterministic in-memory adapters, replayable simulation flow, or transport/runtime contract layer needed for later roadmap phases.

## Decision Drivers

- Venue rules and workflow invariants must remain in headless packages.
- Memory and Canton execution paths must share the same application port surface.
- Simulation and demo flows must be deterministic, seedable, and replayable.
- Frontends and edge apps must stay thin and consume projections/contracts instead of domain internals.

## Considered Options

- Continue growing one-off bootstrap helpers inside apps and adapters until later phases require extraction.
- Establish a headless domain kernel, explicit application ports, replaceable adapters, query projections, runtime API contracts, telemetry, and deterministic simulation utilities now.
- Put most orchestration and invariants into the API app, using packages mostly as shared type containers.

## Decision Outcome

Chosen option: "Establish a headless domain kernel, explicit application ports, replaceable adapters, query projections, runtime API contracts, telemetry, and deterministic simulation utilities now."

`packages/domain-core` is the source of truth for pair modes, access control, RFQ/quote/execution flow, dark-order/match flow, pause behavior, and typed invariants. `packages/app-services` defines the orchestration surface and the ports for time, ids, ledger persistence, projections, risk, settlement, audit, notifications, and reference prices. `packages/adapters-memory` and `packages/adapters-canton` implement those ports behind deterministic in-memory behavior and a clean Canton transport boundary respectively. `packages/query-models`, `packages/api-contracts`, `packages/telemetry`, and `packages/sim-harness` provide the read side, runtime transport layer, structured correlation/logging, and replayable simulation base that later phases will extend.

## Consequences

- Later feature work should land in the existing headless packages instead of introducing new policy into apps or adapters.
- Demo and property-test scenarios can exercise the same application flows through deterministic memory ports and replay metadata.
- Canton-specific transport work can evolve inside `packages/adapters-canton` without changing domain or service semantics.
- Boundary tests and lint rules now need to remain strict so UI packages and apps do not regress into direct domain imports.
