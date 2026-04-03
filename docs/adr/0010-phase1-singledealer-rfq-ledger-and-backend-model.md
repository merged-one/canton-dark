# 0010 Phase 1 Single-Dealer RFQ Ledger and Backend Model

## Status

Accepted

## Context and Problem Statement

Phase 1 needs a complete end-to-end implementation for `SingleDealerPair` with one dealer and one subscriber RFQ flow. Earlier scaffolding defined generic kernels and adapter seams, but it did not yet lock down the concrete Phase 1 contract surface, the backend orchestration flow, or the Daml package split required for a durable single-dealer model. Without that decision, the repository could drift back toward generic marketplace behavior, blur the operator-owned perimeter, or leave the memory and Canton paths describing different business objects.

## Decision Drivers

- `SingleDealerPair` must bind exactly one dealer and preserve operator-owned access control.
- RFQ, quote, pause, and settlement progression rules must be deterministic in memory and representable on-ledger.
- Phase 1 needs a clean Daml package structure that separates shared types, production contracts, and Daml tests.
- The API, query models, demo seed, and adapter mappings must all describe the same contract vocabulary.
- Coverage gates must remain strict while negative-path behavior expands.

## Considered Options

- Keep a generic pair and RFQ model in TypeScript, defer the concrete single-dealer contract vocabulary and Daml package design to a later phase.
- Encode Phase 1 as a dedicated single-dealer RFQ model across domain-core, app-services, adapters, query models, API contracts, and Daml packages now.
- Push most of the concrete behavior into `apps/venue-api` and keep the lower packages as thin persistence helpers.

## Decision Outcome

Chosen option: "Encode Phase 1 as a dedicated single-dealer RFQ model across domain-core, app-services, adapters, query models, API contracts, and Daml packages now."

`packages/domain-core` owns the Phase 1 invariants for one dealer binding, subscriber entitlement checks, pause enforcement, quote expiry, idempotent RFQ cancel/reject behavior, single acceptance, and settlement progression. `packages/app-services` orchestrates the create-pair, grant-access, pause, RFQ, quote, acceptance, and settlement commands through the shared ledger and audit ports. `packages/adapters-memory` remains the deterministic execution path used by demo and test flows, while `packages/adapters-canton` now maps the Phase 1 source contracts and transactional contracts into a Canton-friendly transport vocabulary.

The Daml tree is split into `daml/core` for shared enums and helper records, `daml/phase1-singledealer` for production templates and choices, and `daml/phase1-singledealer-tests` for script-based happy and unhappy paths. The production Daml model keeps `OperatorApproval`, `RegulatoryAttestation`, `RulebookRelease`, `PauseState`, `PairInstance`, `AccessGrant`, `RFQSession`, `DealerQuote`, `ExecutionTicket`, and `SettlementInstruction` as first-class contracts, while the TypeScript model keeps the same concepts in application types and query projections.

## Consequences

- Phase 1 feature work should extend the single-dealer RFQ vocabulary instead of re-introducing generic dark-pool or multi-dealer abstractions.
- The memory path and Canton path now need to stay aligned on the same contract names and command semantics.
- Negative-path tests are a required part of feature work because pause, entitlement, expiry, and idempotency behavior are first-class product rules.
- Future phases that add fanout, delegation, or richer settlement behavior should add ADRs rather than weakening the Phase 1 operator-scoped model in place.
