import { describe, expect, it } from "vitest";

import type { HealthResponse } from "@canton-dark/api-contracts";

import { buildVenueHealthResponse } from "./index";

describe("app-services transport contract", () => {
  it("matches the published health response shape", () => {
    const response = buildVenueHealthResponse(
      {
        mode: "SingleDealerPair",
        operatorId: "operator-3",
        dealers: ["dealer-alpha"],
        marketingLabel: "Canton Dark Pair"
      },
      () => new Date("2026-04-02T00:00:00.000Z")
    ) satisfies HealthResponse;

    expect(response.venue.summary.operatorId).toBe("operator-3");
    expect(response.venue.summary.mode).toBe("SingleDealerPair");
  });
});
