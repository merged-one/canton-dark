import { describe, expect, it } from "vitest";

import { runBootstrapSimulation } from "./index";

describe("runBootstrapSimulation", () => {
  it("produces deterministic output for a seed and draft", () => {
    const input = {
      seed: 424242,
      draft: {
        mode: "SingleDealerPair" as const,
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        marketingLabel: "Canton Dark Pair"
      }
    };

    expect(runBootstrapSimulation(input)).toEqual(runBootstrapSimulation(input));
  });

  it("reflects rejected venue status for invalid drafts", () => {
    const result = runBootstrapSimulation({
      seed: 7,
      draft: {
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        marketingLabel: "Canton Dark Pair"
      }
    });

    expect(result.venueStatus).toBe("rejected");
    expect(result.replayCommand).toBe("pnpm test:property:replay --seed 7");
  });
});
