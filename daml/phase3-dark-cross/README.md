# Canton Dark Phase 3 Dark Cross

This package adds conditional dark crossing on top of the Phase 2 `ATSPair`
ledger model. Candidate selection stays off-ledger. The on-ledger surface keeps
only submitted dark interest, lock state, match proposals, execution, and
settlement facts.

The local environment used for this prompt does not include the Daml SDK, so this
package was reconciled against the TypeScript domain model and script tests but
could not be compiled or executed here.
