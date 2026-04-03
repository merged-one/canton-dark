import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createDeterministicPropertyConfig } from "@canton-dark/testkit";

import { runBootstrapSimulation } from "./index";

describe("runBootstrapSimulation properties", () => {
  it("replays the same result for the same input", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 10_000 }),
        fc.uniqueArray(fc.string({ minLength: 1, maxLength: 8 }), { minLength: 1, maxLength: 3 }),
        (seed, dealers) => {
          const draft = {
            mode: dealers.length === 1 ? ("SingleDealerPair" as const) : ("ATSPair" as const),
            operatorId: "operator-prop",
            dealers,
            marketingLabel: "Canton Dark Replay"
          };

          expect(runBootstrapSimulation({ seed, draft })).toEqual(
            runBootstrapSimulation({ seed, draft })
          );
        }
      ),
      createDeterministicPropertyConfig({ numRuns: 25 })
    );
  });

  it("rejects invalid SingleDealerPair dealer counts", () => {
    fc.assert(
      fc.property(
        fc.uniqueArray(fc.constantFrom("dealer-a", "dealer-b", "dealer-c"), {
          minLength: 0,
          maxLength: 3
        }),
        (dealers) => {
          const result = runBootstrapSimulation({
            seed: 77,
            draft: {
              mode: "SingleDealerPair",
              operatorId: "operator-prop",
              dealers,
              marketingLabel: "Canton Dark Replay"
            }
          });

          expect(result.venueStatus).toBe(dealers.length === 1 ? "healthy" : "rejected");
        }
      ),
      createDeterministicPropertyConfig({ numRuns: 20 })
    );
  });
});
