import { describe, expect, it } from "vitest";

import {
  classifyFactLocation,
  evaluateVenueConfiguration,
  isUserFacingLabelAllowed
} from "./index";

describe("evaluateVenueConfiguration", () => {
  it("accepts a valid SingleDealerPair configuration and normalizes dealers", () => {
    const decision = evaluateVenueConfiguration({
      mode: "SingleDealerPair",
      operatorId: " operator-1 ",
      dealers: [" dealer-alpha ", "dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });

    expect(decision).toEqual({
      isValid: true,
      normalized: {
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        marketingLabel: "Canton Dark Pair"
      },
      violations: []
    });
  });

  it("rejects disallowed labels and missing operator ids", () => {
    const decision = evaluateVenueConfiguration({
      mode: "ATSPair",
      operatorId: " ",
      dealers: ["dealer-alpha"],
      marketingLabel: "Operator stock market mirror"
    });

    expect(decision.violations).toEqual([
      {
        code: "OPERATOR_ID_REQUIRED",
        message: "Each venue configuration must identify the owning operator."
      },
      {
        code: "DISALLOWED_USER_FACING_TERM",
        message: "User-facing labels must avoid the terms 'exchange' and 'stock market'."
      }
    ]);
  });

  it("rejects SingleDealerPair when more than one dealer is configured", () => {
    const decision = evaluateVenueConfiguration({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-a", "dealer-b"],
      marketingLabel: "Canton Dark Pair"
    });

    expect(decision.isValid).toBe(false);
    expect(decision.violations).toContainEqual({
      code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      message: "SingleDealerPair venues must configure exactly one dealer."
    });
  });

  it("rejects ATSPair when no dealer is configured", () => {
    const decision = evaluateVenueConfiguration({
      mode: "ATSPair",
      operatorId: "operator-1",
      dealers: [],
      marketingLabel: "Canton Dark ATS"
    });

    expect(decision.isValid).toBe(false);
    expect(decision.violations).toContainEqual({
      code: "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER",
      message: "ATSPair venues must configure at least one directed dealer."
    });
  });
});

describe("supporting rules", () => {
  it("classifies shared facts on-ledger and local state off-ledger", () => {
    expect(classifyFactLocation("shared-rfq-state")).toBe("on-ledger");
    expect(classifyFactLocation("local-analytics")).toBe("off-ledger");
    expect(classifyFactLocation("query-cache")).toBe("off-ledger");
    expect(classifyFactLocation("ui-state")).toBe("off-ledger");
  });

  it("checks user-facing labels for banned terms", () => {
    expect(isUserFacingLabelAllowed("Canton Dark Pair")).toBe(true);
    expect(isUserFacingLabelAllowed("dealer exchange console")).toBe(false);
  });
});
