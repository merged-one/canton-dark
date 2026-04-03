# 0001 Regulated Operator Factory

## Status

Accepted

## Context and Problem Statement

Canton Dark needs to support multiple venue modes over time while preserving a regulated operating model. The repository could drift toward generic marketplace metaphors or generic pool-factory abstractions if the foundational decision is not explicit. That drift would weaken operator accountability, blur permission boundaries, and invite product language that does not match the intended deployment model.

## Decision Drivers

- Regulated operators need durable ownership of venue creation, participant access, and supervisory controls.
- The roadmap spans multiple venue modes, so the factory abstraction must scale without implying public or permissionless operation.
- Documentation and code should encode the same operating assumptions to reduce architectural drift.

## Considered Options

- Model the system as a permissionless pool factory with optional operator overlays.
- Model the system as a regulated-operator factory with operator-scoped venue creation and governance.
- Avoid committing to a factory model until later phases.

## Decision Outcome

Chosen option: "Model the system as a regulated-operator factory with operator-scoped venue creation and governance."

Canton Dark is not a permissionless pool factory. Every venue instance exists inside an operator-owned perimeter. Venue provisioning, participant onboarding, and policy configuration are treated as operator acts. The repository structure reflects this by centering headless packages around operator-governed rules and keeping UI applications as thin adapters.

## Consequences

- Future feature proposals must explain how operator ownership remains intact.
- Shared abstractions should support multiple operator-scoped venues without creating public-pool semantics.
- Product and demo copy should avoid suggesting open participation or public-market semantics.
