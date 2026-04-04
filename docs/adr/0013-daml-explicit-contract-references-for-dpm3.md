# 0013 Daml Explicit Contract References for DPM 3

## Status

Accepted

## Context and Problem Statement

The repository now targets the supported DPM-based Daml 3.4 toolchain. The earlier Daml packages relied on contract keys and implicit current-state lookup from logical identifiers. That pattern is not supported on the DPM 3 path, and keeping a second legacy toolchain would split the repository into two operational modes. The repo needs one supported Daml path that preserves the existing venue concepts without reintroducing hidden state lookup.

## Decision Drivers

- The repository should use one supported Daml toolchain path only.
- Pair, RFQ, quote, and dark-cross flows still need deterministic current-state access.
- The operator-owned access perimeter must stay explicit when pair visibility expands to granted participants.
- Replay and demo ergonomics are more important than preserving deprecated lookup mechanics.

## Considered Options

- Keep the legacy assistant-based Daml path alongside DPM and route builds/tests by environment.
- Replace contract keys with explicit contract references and pair-scoped visibility state under DPM 3.
- Remove most Daml package behavior and treat the ledger tree as documentation-only scaffolding.

## Decision Outcome

Chosen option: "Replace contract keys with explicit contract references and pair-scoped visibility state under DPM 3."

The Daml scripts, build tooling, and repo doctor now assume DPM 3.4 as the supported path. Production templates no longer depend on contract keys or `lookupByKey`. Instead, choices receive the current contract ids they need explicitly, and pair contracts carry participant visibility state so granted subscribers can read the current pair lifecycle without hidden lookup paths.

Phase 1 and Phase 2 pair contracts now evolve their visible participant set through access-grant choices. That keeps pair-scoped pause and venue metadata available to newly entitled parties under the explicit-reference model. The Daml script lane remains focused on flows that stay reliable under this supported architecture. Richer idempotency and long-seed invariant coverage continue to live in the TypeScript unit, property, and simulation suites.

## Consequences

- New Daml work should pass current contract ids through choices rather than adding logical-id lookup shortcuts.
- Access and visibility changes should be modeled as explicit pair-state evolution, not as implicit observer magic.
- The Daml script lane is now a compatibility and contract-surface check for the supported DPM path, while exhaustive lifecycle hardening remains centered in the TypeScript test matrix.
