# 0005 Frontends as Thin Adapters

## Status

Accepted

## Context and Problem Statement

The repository will eventually contain operator, subscriber, and dealer interfaces. If those applications accumulate business rules, the same venue logic will fragment across multiple codepaths, making regulated behavior harder to audit and deterministic testing harder to maintain.

## Decision Drivers

- Business logic should be testable without browsers or UI frameworks.
- Multiple frontends will need the same rule outcomes rendered differently.
- Thin applications are easier to replace, automate, and regression-test.

## Considered Options

- Allow each frontend to own its own business rules as long as the API is stable.
- Keep frontends as thin adapters over headless packages and service contracts.
- Push most logic into the API application and keep packages minimal.

## Decision Outcome

Chosen option: "Keep frontends as thin adapters over headless packages and service contracts."

Business rules belong in `packages/domain-core`, `packages/app-services`, and other headless libraries. UI packages may format, present, and compose already-evaluated data, but they must not become the source of venue policy. This includes product language: user-facing UI must not use the words `exchange` or `stock market`.

## Consequences

- Import boundary rules should prevent UI applications from reaching directly into domain modules.
- A rule added for one application should generally land in a headless package first.
- UI regressions can be validated through focused adapter tests plus browser smoke tests.
