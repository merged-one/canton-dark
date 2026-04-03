import { describe, expect, it } from "vitest";

import { createHealthReply, handleRequest, parseVenueDraftFromUrl } from "./app";

describe("venue-api", () => {
  it("builds a deterministic health response", () => {
    const response = createHealthReply(() => new Date("2026-04-02T00:00:00.000Z"));

    expect(response.service).toBe("venue-api");
    expect(response.venue.status).toBe("healthy");
    expect(response.venue.summary.mode).toBe("SingleDealerPair");
    expect(response.generatedAt).toBe("2026-04-02T00:00:00.000Z");
  });

  it("parses venue validation input from the request URL", () => {
    const draft = parseVenueDraftFromUrl(
      new URL(
        "http://127.0.0.1:4301/validate?mode=ATSPair&operatorId=operator-9&dealers=dealer-a,dealer-b"
      )
    );

    expect(draft).toEqual({
      mode: "ATSPair",
      operatorId: "operator-9",
      dealers: ["dealer-a", "dealer-b"],
      marketingLabel: "Canton Dark Pair"
    });
  });

  it("falls back to the bootstrap defaults when validation params are omitted", () => {
    const draft = parseVenueDraftFromUrl(new URL("http://127.0.0.1:4301/validate"));

    expect(draft).toEqual({
      mode: "SingleDealerPair",
      operatorId: "operator-demo",
      dealers: ["dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });
  });

  it("reports validation failures for invalid venue drafts", () => {
    const response = handleRequest(
      "/validate?mode=SingleDealerPair&operatorId=operator-9&dealers=dealer-a,dealer-b"
    );

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      ok: false,
      violations: [
        "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER: SingleDealerPair venues must configure exactly one dealer."
      ]
    });
  });

  it("returns a health response from the route handler", () => {
    const response = handleRequest("/health");

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      service: "venue-api",
      generatedAt: "2026-04-02T00:00:00.000Z",
      venue: {
        title: "SingleDealerPair bootstrap",
        status: "healthy",
        detail: "Operator operator-demo has 1 directed dealer configuration(s).",
        summary: {
          pairId: "draft-preview",
          mode: "SingleDealerPair",
          operatorId: "operator-demo",
          dealers: ["dealer-alpha"],
          paused: false,
          rulebookVersion: "draft",
          activeParticipantCount: 2,
          ledgerFacts: ["Shared RFQ state", "Shared execution state"],
          offLedgerFacts: [
            "Operator query cache",
            "Operator analytics",
            "Telemetry projection",
            "Transient UI state"
          ]
        },
        violations: []
      }
    });
  });

  it("returns a not-found response for unknown routes", () => {
    const response = handleRequest("/missing");

    expect(response).toEqual({
      status: 404,
      body: {
        message: "Not found"
      }
    });
  });
});
