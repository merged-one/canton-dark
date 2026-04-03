# Daml Packages

The Daml tree is split into five packages:

- `daml/core` contains shared enums, data records, and rule helpers.
- `daml/phase1-singledealer` contains the production `SingleDealerPair` templates and choices.
- `daml/phase1-singledealer-tests` contains script-based happy and negative path coverage.
- `daml/phase2-ats-rfq` contains the production `ATSPair` directed multi-dealer RFQ templates.
- `daml/phase2-ats-rfq-tests` contains script-based multi-party Phase 2 coverage.

The local environment used for this prompt does not include the Daml SDK, so these packages
were written and reconciled against the TypeScript model but could not be compiled or executed
here.
