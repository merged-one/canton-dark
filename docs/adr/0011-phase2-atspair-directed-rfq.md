# 0011 Phase 2 ATSPair Directed RFQ Model

## Status

Accepted

## Context and Problem Statement

Phase 2 extends the backend and ledger model from `SingleDealerPair` into `ATSPair` with directed multi-dealer RFQ. That adds a dealer universe, per-RFQ invite sets, quote revision and withdrawal lineage, subscriber quote comparison, and configurable operator oversight scope. Without a concrete decision here, the repository could blur the single-dealer carve-out, leak quote economics across dealers or to blinded operators, or let memory and Daml models drift apart on what an ATSPair RFQ actually is.

## Decision Drivers

- `ATSPair` must remain operator-scoped and must not degrade into a public venue.
- The repository must preserve the stricter `SingleDealerPair` rule unchanged while adding Phase 2 behavior.
- Dealers must never see each other's quotes, and blinded operator oversight must not receive live quote ladders or raw quote economics.
- Directed invite-set changes must be deterministic, auditable, and blocked after the first dealer response unless policy explicitly allows earlier edits.
- Quote comparison and acceptance must use one documented tie-break rule across memory, query models, API, and Daml.

## Considered Options

- Stretch the Phase 1 single-dealer RFQ model with optional arrays and implicit privacy conventions.
- Introduce a generic multi-party RFQ model that treats dealer routing, operator oversight, and invite revision as loose adapter concerns.
- Add an explicit `ATSPair` Phase 2 model with its own dealer-universe, invite-set, oversight, quote-lineage, and read-scope rules while leaving `SingleDealerPair` intact.

## Decision Outcome

Chosen option: "Add an explicit `ATSPair` Phase 2 model with its own dealer-universe, invite-set, oversight, quote-lineage, and read-scope rules while leaving `SingleDealerPair` intact."

`PairInstance` is extended with `dealerIds`, `operatorOversightRole`, and `inviteRevisionPolicy`. `SingleDealerPair` still binds exactly one dealer and defaults to full oversight with locked invites. `ATSPair` binds a stable operator-owned dealer universe and lets each RFQ carry a separate directed `invitedDealerIds` set plus invitation versioning and first-response timestamps. That preserves the venue-mode boundary from ADR 0002 instead of weakening it into one generic pair configuration.

Phase 2 quote flow remains RFQ-only. Dealers respond through explicit invitations, may revise their own current quote, and may withdraw an open quote. Acceptance marks competing open quotes stale, and reject-all marks remaining open quotes stale. Quote ordering uses one deterministic policy everywhere: best price, then larger quantity, then earliest quote creation time, then lexicographic quote id.

Read scope is encoded in headless packages and mirrored in Daml packages. Subscriber quote ladders expose only the subscriber's RFQ quotes. Dealer history exposes only that dealer's invitations, quotes, revisions, and withdrawals. Blinded operator oversight receives RFQ and audit scope plus redacted quote status, and it does not receive live quote ladders. Full operator oversight may receive ladder-level quote economics. The Phase 2 Daml tree is split into `daml/phase2-ats-rfq` and `daml/phase2-ats-rfq-tests` so Phase 1 and Phase 2 ledger models stay explicit.

## Consequences

- Future ATSPair work must extend the directed RFQ vocabulary rather than bypassing it with generic routing shortcuts.
- Privacy regressions are testable at the projection and service layers because live ladders and quote economics are scoped before UI rendering.
- Invite-set policy is now an explicit product rule. Changing it requires coordinated updates to domain-core, query models, adapters, API contracts, and Daml tests.
- The deterministic tie-break policy is now part of the durable contract surface and must remain aligned across memory execution and on-ledger comparison flows.
