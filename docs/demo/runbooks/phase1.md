# Phase 1 Demo Runbook

## Purpose

Phase 1 demonstrates the `SingleDealerPair` lifecycle: operator provisioning, subscriber RFQ entry, dealer quoting, subscriber acceptance, and operator settlement oversight.

## Prerequisites

- `pnpm install`
- `pnpm doctor:demo`

## One-Command Start

```bash
pnpm demo:phase1
```

This starts the venue API plus all four local apps, writes prefixed service logs to `artifacts/demo/phase1`, and seeds the stack into `phase1-ready`.

If the stack is already running, reseed it with:

```bash
pnpm demo:phase1:seed
```

## Recommended Click Path

1. Open the operator console from the demo orchestrator and confirm the seeded pair and subscriber access grant.
2. Open the subscriber terminal and submit an RFQ for the seeded pair.
3. Open the dealer workbench and submit a firm quote.
4. Return to the subscriber terminal, refresh, and accept the quote.
5. Refresh the operator and dealer views to confirm execution and settlement visibility.

## What Good Looks Like

- The pair stays in `SingleDealerPair` mode with exactly one dealer.
- The subscriber sees a single quote ladder for the pair.
- The dealer sees only its own invitation and quote state.
- The operator sees execution and settlement progression after acceptance.

## Verification Commands

```bash
pnpm test:e2e:phase1
pnpm sim:replay --seed 424242 --phase phase1
```
