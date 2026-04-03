import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createDeterministicPropertyConfig } from "@canton-dark/testkit";

import { runTrivialScenario } from "./index";

describe("sim-harness properties", () => {
  it("replays the same outputs for the same seed", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 1, max: 10_000 }), async (seed) => {
        expect(await runTrivialScenario(seed)).toEqual(await runTrivialScenario(seed));
      }),
      createDeterministicPropertyConfig({ numRuns: 25 })
    );
  });
});
