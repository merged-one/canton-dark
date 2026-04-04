# Canton Dark Phase 2 ATS RFQ

This package models `ATSPair` directed multi-dealer RFQ flow for Phase 2. It keeps
dealer invitations, firm quotes, quote revisions, quote withdrawals, subscriber quote
comparison, and settlement progression separate from the Phase 1 single-dealer package
so the single-dealer carve-out stays intact.

Build it with the repo-managed DPM toolchain:

- `pnpm test:daml`
- `pnpm test:canton-integration`
