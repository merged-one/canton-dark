# 0004 Privacy, Observers, Informees, and Read Scope

## Status

Accepted

## Context and Problem Statement

Dark venue workflows involve different visibility rights for operators, subscribers, dealers, and technical services. A naive read model could over-share sensitive information, while an overly narrow model could block necessary supervision or reconciliation. The repository needs a durable rule that privacy is modeled as read-scope policy, not as ad hoc UI hiding.

## Decision Drivers

- Sensitive workflow facts should only be visible to parties with a clear operational or supervisory need.
- Operators require enough scope to own venue governance and risk controls.
- UI code must not become the system of record for privacy decisions.

## Considered Options

- Let each application decide what fields to hide.
- Encode read-scope policy in headless packages and expose already-scoped query models.
- Keep read scope implicit until Daml observer and informee details are implemented.

## Decision Outcome

Chosen option: "Encode read-scope policy in headless packages and expose already-scoped query models."

Privacy is treated as a core domain concern. Observer and informee semantics should be reflected through headless policy modules and read-model shaping, not left to presentation code. Applications may present less information than they receive, but they must not rely on UI-only filtering to satisfy privacy requirements.

## Consequences

- Query model packages should distinguish between canonical facts and view-specific projections.
- UI tests should assert that already-scoped data is rendered correctly rather than re-implementing scope policy.
- Future Daml templates and Canton adapters should align with the same read-scope vocabulary.
