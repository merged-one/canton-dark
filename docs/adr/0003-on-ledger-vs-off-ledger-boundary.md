# 0003 On-Ledger vs Off-Ledger Boundary

## Status

Accepted

## Context and Problem Statement

Canton Dark will need both shared facts that multiple organizations rely on and local data used for responsiveness, analytics, and presentation. Without a clear boundary, teams will either overuse the ledger for local concerns or allow cross-organization facts to drift into private stores where auditability and consistency are weaker.

## Decision Drivers

- Ledger storage should be reserved for facts that need shared agreement across organizational boundaries.
- Local responsiveness, analytics, and UI state benefit from cheaper and more flexible off-ledger handling.
- The boundary must be legible in both code and architecture documentation.

## Considered Options

- Put nearly all state on-ledger for maximum consistency.
- Put nearly all state off-ledger for implementation speed.
- Split state deliberately: shared cross-org facts on-ledger; local caches, analytics, and UI state off-ledger.

## Decision Outcome

Chosen option: "Split state deliberately: shared cross-org facts on-ledger; local caches, analytics, and UI state off-ledger."

Shared cross-organization facts go on-ledger. Local caches, analytics, and UI state stay off-ledger. Query models and transport contracts may straddle the boundary, but they must make it obvious whether a datum is canonical shared state or an operator-local projection.

## Consequences

- Domain and service packages should expose explicit classification helpers when boundary questions arise.
- Adapter packages may maintain caches and projections, but they should not silently redefine shared facts.
- ADRs and implementation plans should call out any new data category that challenges the current boundary.
