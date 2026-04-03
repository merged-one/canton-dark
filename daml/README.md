# Daml Placeholders

The `daml/` tree is intentionally scaffolded but not wired into CI yet because the Daml toolchain is not present in this environment. The placeholders reserve package boundaries for later prompts:

- `daml/core` for shared ledger-facing templates and interfaces
- `daml/core-tests` for ledger-facing test fixtures and scenario coverage

Before enabling Daml builds, pin a real SDK version and replace the placeholder `sdk-version: 0.0.0`.
