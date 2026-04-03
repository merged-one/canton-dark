import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createDeterministicPropertyConfig } from "@canton-dark/testkit";

import { runPhase1DemoScenario } from "./index";

describe("sim-harness properties", () => {
  it("replays the same outputs for the same seed", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10_000 }), async (seed) => {
        expect(await runPhase1DemoScenario(seed)).toEqual(await runPhase1DemoScenario(seed));
      }),
      createDeterministicPropertyConfig({ numRuns: 25 })
    );
  });
});
