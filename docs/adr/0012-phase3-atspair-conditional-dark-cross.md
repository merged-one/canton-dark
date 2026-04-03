# 0012 Phase 3 ATSPair Conditional Dark Cross

## Status

Accepted

## Context and Problem Statement

Phase 3 extends `ATSPair` beyond directed RFQ into non-displayed conditional dark crossing. The repository needs a minimum viable dark-cross lifecycle that preserves the existing RFQ model from Phase 2, keeps matching logic off-ledger, and places only shared execution facts on-ledger. Without a concrete decision, the codebase could drift toward a displayed book, weaken pair-scoped operator controls, or let app-services and Daml diverge on how lock, proposal, expiry, and settlement state are meant to work.

## Decision Drivers

- Phase 3 must be additive to `ATSPair`; the directed RFQ flow remains intact.
- Candidate selection and prioritization must stay off-ledger, while committed shared facts remain on-ledger.
- Dark interest must stay non-displayed and must not leak across unrelated subscribers.
- An order must not be matched twice, and lock release must be deterministic under expiry and rejection.
- Operator-owned controls must remain explicit, especially around proposal creation and execution.
- The MVP should stay simple: pair-local only, no public book, no cross-pair routing, and full-fill only.

## Considered Options

- Model Phase 3 as a general dark-book engine with on-ledger candidate discovery and routing.
- Reuse the Phase 2 RFQ contracts by stretching them with optional dark-cross fields and implicit lock behavior.
- Add a separate Phase 3 dark-cross package that reuses `ATSPair` pair state and access grants, keeps matching off-ledger, and records only dark-order, lock, proposal, execution, and settlement facts on-ledger.

## Decision Outcome

Chosen option: "Add a separate Phase 3 dark-cross package that reuses `ATSPair` pair state and access grants, keeps matching off-ledger, and records only dark-order, lock, proposal, execution, and settlement facts on-ledger."

Phase 3 introduces explicit dark-cross concepts in both the headless model and the Daml tree:

- `DarkOrder` records subscriber-owned non-displayed interest for one pair and one instrument.
- `OrderLock` records the lock window for one order and one proposal.
- `MatchProposal` records the operator-created conditional match, bilateral responses, deterministic expiry, and execution linkage.
- `ExecutionTicket` and `SettlementInstruction` record only committed shared execution and settlement facts.

Matching stays off-ledger in `packages/app-services`. The app service is responsible for candidate selection, ordering, idempotent submission handling, and pair-local serialization around lock creation. On-ledger logic is intentionally narrower: validate pair scope, enforce pause-state blocking for new dark orders and match creation, hold lock state, record accept or reject outcomes, and record execution and settlement facts.

The lock model is dual-layer by design. `OrderLock` is the durable shared lock fact, while `DarkOrder` also moves into a locked state that references the active lock and proposal identifiers. That makes double-match prevention explicit in both the app-layer memory model and the Daml lifecycle. When a proposal is rejected or expires, the orders return to an open state and the lock contracts move to released or expired terminal states. When a proposal executes, the orders move to executed and the locks move to released with an executed reason.

Proposal creation and execution remain operator-controlled. Subscriber counterparties may accept or reject their own proposal. Settlement progression may be delegated to a named settlement delegate that holds the existing `progress_settlement` entitlement. This preserves the operator-owned control boundary from earlier ADRs while still allowing delegated post-trade workflow.

Phase 3 stays full-fill only for MVP. A proposal is valid only when the buy and sell interest refer to the same pair, the same instrument, distinct subscribers, matching quantities, and crossing prices. The deterministic crossing price is the midpoint of the locked buy and sell limits. The tie-break and candidate ordering stay off-ledger and must remain consistent with the TypeScript domain model and tests.

## Consequences

- The RFQ lifecycle remains untouched, and future dark-cross work must extend Phase 3 instead of retrofitting RFQ contracts.
- Lock state is now a durable architectural concept. Any future partial-fill or parent-child logic must explicitly revisit both `DarkOrder` and `OrderLock`.
- Pair pause state now gates both RFQ and dark-cross entry points, which keeps venue-wide operator controls coherent.
- Settlement delegation is allowed only after execution facts exist; proposal creation and execution remain operator-owned.
- The Daml tree now includes `daml/phase3-dark-cross` and `daml/phase3-dark-cross-tests`, and future ledger changes for dark crossing should land there instead of in the Phase 2 package.
