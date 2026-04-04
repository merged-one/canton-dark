# Daml Packages

The Daml tree is split into seven packages:

- `daml/core` contains shared enums, data records, and rule helpers.
- `daml/phase1-singledealer` contains the production `SingleDealerPair` templates and choices.
- `daml/phase1-singledealer-tests` contains script-based happy and negative path coverage.
- `daml/phase2-ats-rfq` contains the production `ATSPair` directed multi-dealer RFQ templates.
- `daml/phase2-ats-rfq-tests` contains script-based multi-party Phase 2 coverage.
- `daml/phase3-dark-cross` contains the production `ATSPair` conditional dark-cross templates.
- `daml/phase3-dark-cross-tests` contains script-based Phase 3 dark-cross lifecycle coverage.

Use DPM and JDK 17+ for all local Daml work:

- `pnpm test:daml`
- `pnpm test:canton-integration`

For Canton 3.4+, `daml build` and `daml test` are legacy entrypoints. The repo resolves and runs `dpm build` and `dpm test` directly.
