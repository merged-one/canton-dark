# Architecture Overview

## Purpose

Canton Dark is structured as a regulated-operator factory, not a permissionless pool factory. The repository is intended to support a staged roadmap:

1. `SingleDealerPair` with dealer RFQ.
2. `ATSPair` with directed multi-dealer RFQ.
3. `ATSPair` with conditional dark crossing.

The factory shape matters because venue creation, venue access, and venue risk controls remain operator-owned from the start. The codebase should make those controls explicit rather than letting them blur into UI behavior or adapter wiring.

## Layering

- `packages/domain-core` holds the durable rule set for venue modes, read-scope policy, and ledger boundary decisions.
- `packages/app-services` coordinates domain rules into application-facing flows and query models.
- `packages/query-models` and `packages/api-contracts` define read-side and transport contracts.
- `packages/ui-sdk` and `packages/ui-kit` provide thin UI-facing helpers that adapt already-evaluated data.
- `packages/adapters-*` own infrastructure and integration details.
- `packages/sim-harness` owns deterministic scenario generation and replay.
- `apps/*` are edge adapters. They should compose services and SDKs rather than invent policy.

## On-Ledger Versus Off-Ledger

Shared cross-organization facts belong on-ledger so that independent participants can rely on them. Local caches, analytics, telemetry projections, and transient UI state stay off-ledger. This split should remain explicit in code and documentation because privacy, performance, and auditability requirements differ sharply across the boundary.

## Venue Modes

`SingleDealerPair` and `ATSPair` are separate operating modes with distinct control surfaces:

- `SingleDealerPair` must enforce one dealer only.
- `ATSPair` supports multiple directed dealers, but still within an operator-owned perimeter.
- Phase 3 conditional dark crossing extends `ATSPair`; it does not erase operator control or convert the venue into a public pool.

## Testing Strategy

The repo uses four verification lanes:

- Unit tests for deterministic module behavior and coverage enforcement.
- Property tests for replayable state-space checks with fixed seeds.
- Contract tests for transport shapes and adapter seams.
- Browser e2e tests for the thin application shell.

Coverage gates emphasize the headless rule-bearing packages first. Thin adapters still require high coverage, but they should remain small enough that this is practical.
