# Phase 2 Demo Runbook

## Purpose

Phase 2 demonstrates `ATSPair` with directed multi-dealer RFQ, blinded operator oversight, invitation-set control, and quote comparison from the subscriber perspective.

## Prerequisites

- `pnpm install`
- `pnpm doctor:demo`

## One-Command Start

```bash
pnpm demo:phase2
```

This starts the local stack, writes logs to `artifacts/demo/phase2`, and seeds the stack into `phase2-ready`.

If the stack is already running, reseed it with:

```bash
pnpm demo:phase2:seed
```

## Recommended Click Path

1. Open the subscriber terminal and create a directed RFQ that invites all seeded dealers.
2. Open all three dealer workbenches and submit distinct prices.
3. Refresh the subscriber terminal and confirm that all invited quotes appear with deterministic ranking.
4. Refresh the operator console and confirm that blinded oversight shows RFQ progress without exposing live quote economics.
5. Accept the best quote from the subscriber view and refresh every role.

## What Good Looks Like

- Uninvited dealers see no invitation for the RFQ.
- Each dealer sees only its own quote and invitation history.
- The operator sees redacted oversight while the RFQ is active.
- The subscriber sees deterministic quote comparison and can accept exactly one live quote.

## Verification Commands

```bash
pnpm test:e2e:phase2
pnpm sim:replay --seed 424242 --campaign unauthorized_visibility
```
