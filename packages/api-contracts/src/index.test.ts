import { describe, expect, it } from "vitest";

import {
  ContractValidationError,
  createPairRequestSchema,
  generateOpenApiDocument,
  grantAccessRequestSchema,
  markSettlementProgressionRequestSchema,
  openRfqRequestSchema,
  parseCreatePairRequest,
  parseHealthResponse,
  pausePairRequestSchema,
  rejectRfqRequestSchema,
  submitQuoteRequestSchema
} from "./index";

describe("api-contract runtime schemas", () => {
  it("parses valid request and response payloads", () => {
    expect(
      parseCreatePairRequest({
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      })
    ).toEqual({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      rulebookVersion: "v1",
      rulebookSummary: "initial"
    });
    expect(
      parseHealthResponse({
        service: "venue-api",
        generatedAt: "2026-04-02T00:00:00.000Z",
        venue: {
          title: "SingleDealerPair health",
          status: "healthy",
          detail: "healthy",
          summary: {
            pairId: "pair-1",
            mode: "SingleDealerPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            paused: false,
            rulebookVersion: "v1",
            activeParticipantCount: 3,
            ledgerFacts: ["RFQ sessions"],
            offLedgerFacts: ["Operator analytics"]
          },
          violations: []
        }
      })
    ).toEqual({
      service: "venue-api",
      generatedAt: "2026-04-02T00:00:00.000Z",
      venue: {
        title: "SingleDealerPair health",
        status: "healthy",
        detail: "healthy",
        summary: {
          pairId: "pair-1",
          mode: "SingleDealerPair",
          operatorId: "operator-1",
          dealers: ["dealer-alpha"],
          paused: false,
          rulebookVersion: "v1",
          activeParticipantCount: 3,
          ledgerFacts: ["RFQ sessions"],
          offLedgerFacts: ["Operator analytics"]
        },
        violations: []
      }
    });
  });

  it("throws typed validation errors for invalid payloads", () => {
    expect(() =>
      parseCreatePairRequest({
        mode: "SingleDealerPair",
        dealerId: "dealer-alpha",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      })
    ).toThrow(new ContractValidationError("$.operatorId", "is required"));
    expect(() =>
      parseHealthResponse({
        service: "venue-api",
        generatedAt: "2026-04-02T00:00:00.000Z",
        venue: {
          title: "SingleDealerPair health",
          status: "invalid",
          detail: "healthy",
          summary: {
            pairId: "pair-1",
            mode: "SingleDealerPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            paused: false,
            rulebookVersion: "v1",
            activeParticipantCount: 3,
            ledgerFacts: ["RFQ sessions"],
            offLedgerFacts: ["Operator analytics"]
          },
          violations: []
        }
      })
    ).toThrow(expect.objectContaining({ path: "$.venue.status" }));
  });

  it("covers optional and scalar validation branches", () => {
    expect(
      pausePairRequestSchema.parse({
        state: "active"
      })
    ).toEqual({
      state: "active"
    });
    expect(
      grantAccessRequestSchema.parse({
        subjectId: "subscriber-1",
        role: "subscriber"
      })
    ).toEqual({
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    expect(
      rejectRfqRequestSchema.parse({
        reason: "manual hold"
      })
    ).toEqual({
      reason: "manual hold"
    });
    expect(() => openRfqRequestSchema.parse("bad")).toThrow(
      new ContractValidationError("$", "expected object")
    );
    expect(() =>
      grantAccessRequestSchema.parse({
        subjectId: 1,
        role: "subscriber"
      })
    ).toThrow(expect.objectContaining({ path: "$.subjectId" }));
    expect(() =>
      markSettlementProgressionRequestSchema.parse({
        status: "bad"
      })
    ).toThrow(expect.objectContaining({ path: "$.status" }));
    expect(() =>
      openRfqRequestSchema.parse({
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: "bad"
      })
    ).toThrow(expect.objectContaining({ path: "$.quantity" }));
    expect(() =>
      parseHealthResponse({
        service: "venue-api",
        generatedAt: "2026-04-02T00:00:00.000Z",
        venue: {
          title: "SingleDealerPair health",
          status: "healthy",
          detail: "healthy",
          summary: {
            pairId: "pair-1",
            mode: "SingleDealerPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            paused: "no",
            rulebookVersion: "v1",
            activeParticipantCount: 3,
            ledgerFacts: ["RFQ sessions"],
            offLedgerFacts: ["Operator analytics"]
          },
          violations: []
        }
      })
    ).toThrow(expect.objectContaining({ path: "$.venue.summary.paused" }));
    expect(() =>
      submitQuoteRequestSchema.parse({
        price: 1,
        quantity: 1,
        expiresAt: 1
      })
    ).toThrow(expect.objectContaining({ path: "$.expiresAt" }));
    expect(() =>
      grantAccessRequestSchema.parse({
        subjectId: "subscriber-1",
        role: "subscriber",
        entitlements: "bad"
      })
    ).toThrow(expect.objectContaining({ path: "$.entitlements" }));
    expect(() =>
      createPairRequestSchema.parse({
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: []
      })
    ).toThrow(expect.objectContaining({ path: "$.rulebookSummary" }));
  });

  it("generates an OpenAPI document from the published schemas", () => {
    const document = generateOpenApiDocument();

    expect(document.openapi).toBe("3.1.0");
    expect(document.info).toEqual({
      title: "Canton Dark Venue API",
      version: "0.0.0"
    });
    expect(Object.keys(document.paths)).toEqual([
      "/health",
      "/pairs",
      "/pairs/{pairId}/access",
      "/pairs/{pairId}/pause",
      "/pairs/{pairId}/rfqs",
      "/pairs/{pairId}/rfqs/{rfqId}/reject",
      "/pairs/{pairId}/rfqs/{rfqId}/cancel",
      "/pairs/{pairId}/rfqs/{rfqId}/quotes",
      "/pairs/{pairId}/quotes/{quoteId}/accept",
      "/pairs/{pairId}/settlements/{instructionId}/progress",
      "/pairs/{pairId}/views/operator",
      "/pairs/{pairId}/views/subscriber",
      "/pairs/{pairId}/views/dealer-workbench",
      "/pairs/{pairId}/audit-trail"
    ]);
    expect(Object.keys(document.components.schemas)).toEqual([
      "CreatePairRequest",
      "GrantAccessRequest",
      "PausePairRequest",
      "OpenRfqRequest",
      "RejectRfqRequest",
      "SubmitQuoteRequest",
      "MarkSettlementProgressionRequest",
      "OperatorView",
      "SubscriberView",
      "DealerWorkbenchView",
      "AuditTrailView",
      "VenueHealthReadModel",
      "HealthResponse"
    ]);
  });
});
