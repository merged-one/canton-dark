import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createDeterministicPropertyConfig } from "@canton-dark/testkit";

import { runSimulationCampaign } from "./index";

describe("sim-harness properties", () => {
  it("keeps unauthorized visibility scoped across seeded campaigns", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "unauthorized_visibility",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 10 })
    );
  });

  it("prevents double execution across seeded campaigns", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "no_double_execution",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });

  it("blocks late accepts after expiry across seeded campaigns", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "no_late_accept_after_expiry",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });

  it("blocks paused-pair match creation across seeded campaigns", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "no_match_on_paused_pair",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });

  it("replays the same outputs for the same seed", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "deterministic_replay_from_seed",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });

  it("releases locks correctly across terminal outcomes", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "lock_release_correctness",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });

  it("keeps retry behavior idempotent across seeded campaigns", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 5_000 }), async (seed) => {
        const result = await runSimulationCampaign({
          campaign: "idempotent_retries",
          seed
        });

        expect(result.invariants[0]?.passed).toBe(true);
      }),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });
});
