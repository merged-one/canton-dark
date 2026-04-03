# 0007 Operator-Owned Risk Controls and Vendor Boundary

## Status

Accepted

## Context and Problem Statement

The platform will likely integrate with vendors, infrastructure providers, and possibly dealer-facing tools. Without a clear boundary, external integrations can start to own risk decisions or access-control logic that should remain under operator authority.

## Decision Drivers

- Operators need accountable control over venue access, throttles, limits, and exception handling.
- Vendors may supply technology, but they should not become the effective owner of venue policy.
- The codebase should make it easy to swap integrations without rewriting core controls.

## Considered Options

- Let vendor adapters implement whatever controls their products support.
- Keep operator-owned risk and access policy in headless packages, with adapters treated as replaceable execution details.
- Defer the vendor boundary until real integrations are present.

## Decision Outcome

Chosen option: "Keep operator-owned risk and access policy in headless packages, with adapters treated as replaceable execution details."

Operator-owned access and risk controls are part of the core product boundary. Adapters may execute decisions, emit telemetry, or translate to integration formats, but they must not become the source of truth for who may participate or what limits apply. This rule applies especially to `ATSPair`, where directed multi-dealer behavior increases the temptation to bury policy in integration code.

## Consequences

- `packages/app-services` should depend on abstract ports and policy results, not vendor-specific semantics.
- Adapter packages should be replaceable without changing the meaning of venue rules.
- Reviews should treat risk logic added to infrastructure packages as an architectural defect unless explicitly justified.
