import { describe, expect, it } from "vitest";

import { buildVenueHealthReadModel, buildVenueHealthResponse } from "./index";

describe("buildVenueHealthReadModel", () => {
  it("builds a healthy read model for a valid venue", () => {
    const readModel = buildVenueHealthReadModel({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });

    expect(readModel).toEqual({
      title: "SingleDealerPair bootstrap",
      status: "healthy",
      detail: "Operator operator-1 has 1 directed dealer configuration(s).",
      summary: {
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        ledgerFacts: ["Shared RFQ state"],
        offLedgerFacts: ["Operator query cache", "Operator analytics", "Transient UI state"]
      },
      violations: []
    });
  });

  it("surfaces violations for invalid venues", () => {
    const readModel = buildVenueHealthReadModel({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha", "dealer-beta"],
      marketingLabel: "Canton Dark Pair"
    });

    expect(readModel.status).toBe("rejected");
    expect(readModel.detail).toBe("1 venue policy issue(s) require remediation before launch.");
    expect(readModel.violations).toEqual([
      "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER: SingleDealerPair venues must configure exactly one dealer."
    ]);
  });
});

describe("buildVenueHealthResponse", () => {
  it("wraps the read model in the API response contract", () => {
    const response = buildVenueHealthResponse(
      {
        mode: "ATSPair",
        operatorId: "operator-2",
        dealers: ["dealer-alpha", "dealer-beta"],
        marketingLabel: "Canton Dark ATS"
      },
      () => new Date("2026-04-02T00:00:00.000Z")
    );

    expect(response.service).toBe("venue-api");
    expect(response.generatedAt).toBe("2026-04-02T00:00:00.000Z");
    expect(response.venue.status).toBe("healthy");
  });

  it("uses the default clock when one is not provided", () => {
    const response = buildVenueHealthResponse({
      mode: "SingleDealerPair",
      operatorId: "operator-4",
      dealers: ["dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });

    expect(Number.isNaN(Date.parse(response.generatedAt))).toBe(false);
    expect(response.venue.summary.operatorId).toBe("operator-4");
  });
});
