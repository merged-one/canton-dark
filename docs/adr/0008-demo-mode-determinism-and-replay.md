# 0008 Demo Mode Determinism and Replay

## Status

Accepted

## Context and Problem Statement

Demo and simulation environments are often allowed to become loosely deterministic because they are not production systems. In this repository that would be a mistake: demos are part of how venue behavior is explained, verified, and regression-tested while the roadmap evolves.

## Decision Drivers

- Demos should illustrate the same architectural and policy assumptions as production code.
- Failures found in simulations need to be replayable for debugging and review.
- Deterministic demos improve documentation, CI reliability, and stakeholder confidence.

## Considered Options

- Treat demo mode as presentation-only and accept non-deterministic behavior.
- Make demo mode deterministic, seedable, and replayable through the same headless packages used elsewhere.
- Build an entirely separate demo stack with reduced fidelity.

## Decision Outcome

Chosen option: "Make demo mode deterministic, seedable, and replayable through the same headless packages used elsewhere."

Demo flows should use injected seeds, clocks, and scenario inputs. `packages/sim-harness` is the canonical home for replayable simulation logic. Demo applications may wrap the harness for usability, but they should not introduce hidden randomness or alternate policy interpretations.

## Consequences

- Every simulation scenario should be reproducible from captured inputs.
- Replay instructions should be easy to surface in logs, test output, and CI artifacts.
- Demo-specific shortcuts must still respect the same venue-mode, privacy, and operator-control rules as the rest of the repository.
