# Phase 3 Demo Runbook

## Purpose

Phase 3 demonstrates conditional dark crossing on `ATSPair`: subscriber dark-order entry, operator proposal generation, bilateral acceptance, expiry handling, and dark-cross execution visibility.

## Prerequisites

- `pnpm install`
- `pnpm doctor:demo`

## One-Command Start

```bash
pnpm demo:phase3
```

This starts the local stack, writes logs to `artifacts/demo/phase3`, and seeds the stack into `phase3-ready`.

If the stack is already running, reseed it with:

```bash
pnpm demo:phase3:seed
```

## Recommended Click Path

1. Open the demo orchestrator and confirm the seeded proposal, buy order, and sell order ids.
2. Open the first subscriber terminal and confirm that only the buy-side order and lock are visible.
3. Open the second subscriber terminal and confirm that only the sell-side order and lock are visible.
4. Use the API or the seeded role views to accept the proposal from both subscribers.
5. Execute the proposal from the operator context, then refresh both subscriber views to confirm dark-cross execution and settlement state.
6. Reseed Phase 3 and advance the demo clock to demonstrate proposal expiry and lock release.

## What Good Looks Like

- Unauthorized subscribers cannot read dark-order or proposal state.
- Each subscriber sees exactly one local order and one local lock for the seeded proposal.
- A proposal cannot execute twice and cannot be accepted after expiry.
- Expired or rejected proposals release both locks deterministically.

## Verification Commands

```bash
pnpm test:e2e:phase3
pnpm sim:replay --seed 424242 --phase phase3
pnpm sim:replay --seed 424242 --campaign no_late_accept_after_expiry
```
