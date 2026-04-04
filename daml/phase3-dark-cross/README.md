# Canton Dark Phase 3 Dark Cross

This package adds conditional dark crossing on top of the Phase 2 `ATSPair`
ledger model. Candidate selection stays off-ledger. The on-ledger surface keeps
only submitted dark interest, lock state, match proposals, execution, and
settlement facts.

Build it with the repo-managed DPM toolchain:

- `pnpm test:daml`
- `pnpm test:canton-integration`
