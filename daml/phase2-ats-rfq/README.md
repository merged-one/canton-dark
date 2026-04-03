# Canton Dark Phase 2 ATS RFQ

This package models `ATSPair` directed multi-dealer RFQ flow for Phase 2. It keeps
dealer invitations, firm quotes, quote revisions, quote withdrawals, subscriber quote
comparison, and settlement progression separate from the Phase 1 single-dealer package
so the single-dealer carve-out stays intact.

The local environment used for this prompt does not include the Daml SDK, so this package
was reconciled against the TypeScript domain model and script tests but could not be
compiled or executed here.
