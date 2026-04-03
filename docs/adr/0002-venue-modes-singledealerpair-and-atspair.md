# 0002 Venue Modes: SingleDealerPair and ATSPair

## Status

Accepted

## Context and Problem Statement

The roadmap explicitly starts with `SingleDealerPair`, then extends into `ATSPair` with directed multi-dealer RFQ, and later conditional dark crossing. If the codebase treats those phases as minor configuration changes, critical constraints can be bypassed, especially around participant counts and operator scoping.

## Decision Drivers

- `SingleDealerPair` has a stricter market-structure constraint than `ATSPair`.
- `ATSPair` introduces additional routing and matching behavior without removing operator control.
- Phase sequencing should be visible in code and documentation so later work extends the model rather than replaces it implicitly.

## Considered Options

- Represent all venue modes as one loosely validated configuration object.
- Represent `SingleDealerPair` and `ATSPair` as explicit modes with dedicated invariants.
- Delay mode separation until directed multi-dealer behavior is implemented.

## Decision Outcome

Chosen option: "Represent `SingleDealerPair` and `ATSPair` as explicit modes with dedicated invariants."

`SingleDealerPair` must enforce one dealer only. `ATSPair` allows directed multi-dealer participation, but it remains operator-scoped and must preserve operator-owned access and risk controls. Phase 3 conditional dark crossing extends `ATSPair`; it does not reframe the product as a public venue or erase operator perimeter assumptions.

## Consequences

- Domain code must reject attempts to configure `SingleDealerPair` with zero dealers or multiple dealers.
- `ATSPair` features must carry explicit operator identifiers and policy hooks.
- Tests should treat venue mode changes as rule changes, not merely UI toggles.
