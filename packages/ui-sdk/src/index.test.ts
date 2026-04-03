import { describe, expect, it } from "vitest";

import type { HealthResponse } from "@canton-dark/api-contracts";

import { mountVenueHealth, renderVenueHealthHtml } from "./index";

const healthyResponse: HealthResponse = {
  service: "venue-api",
  generatedAt: "2026-04-02T00:00:00.000Z",
  venue: {
    title: "SingleDealerPair bootstrap",
    status: "healthy",
    detail: "Operator operator-1 has 1 directed dealer configuration(s).",
    summary: {
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      ledgerFacts: ["Shared RFQ state"],
      offLedgerFacts: ["Operator analytics"]
    },
    violations: []
  }
};

describe("ui-sdk", () => {
  it("renders the health card to HTML", () => {
    const html = renderVenueHealthHtml(healthyResponse);

    expect(html).toContain("SingleDealerPair bootstrap");
    expect(html).toContain("No policy violations.");
    expect(html).toContain("tone-ok");
  });

  it("mounts violations using escaped HTML", () => {
    const target = document.createElement("div");

    mountVenueHealth(target, {
      ...healthyResponse,
      venue: {
        ...healthyResponse.venue,
        status: "rejected",
        violations: ["DISALLOWED_USER_FACING_TERM: Avoid <unsafe> labels."]
      }
    });

    expect(target.textContent).toContain("Avoid <unsafe> labels.");
    expect(target.innerHTML).not.toContain("<unsafe>");
    expect(target.innerHTML).toContain("tone-alert");
  });
});
