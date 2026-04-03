import { describe, expect, it } from "vitest";

import {
  ContractValidationError,
  generateOpenApiDocument,
  grantAccessRequestSchema,
  parseHealthResponse,
  parseRegisterPairRequest,
  pausePairRequestSchema,
  submitDarkOrderRequestSchema,
  validateVenueResponseSchema
} from "./index";

describe("api-contract runtime schemas", () => {
  it("parses valid contract payloads", () => {
    expect(
      parseRegisterPairRequest({
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      })
    ).toEqual({
      mode: "ATSPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      jurisdiction: "US",
      rulebookVersion: "v1",
      rulebookSummary: "initial"
    });
    expect(
      parseHealthResponse({
        service: "venue-api",
        generatedAt: "2026-04-02T00:00:00.000Z",
        venue: {
          title: "ATSPair kernel health",
          status: "healthy",
          detail: "healthy",
          summary: {
            pairId: "pair-1",
            mode: "ATSPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            paused: false,
            rulebookVersion: "v1",
            activeParticipantCount: 2,
            ledgerFacts: ["Shared RFQ state"],
            offLedgerFacts: ["Operator analytics"]
          },
          violations: []
        }
      })
    ).toEqual({
      service: "venue-api",
      generatedAt: "2026-04-02T00:00:00.000Z",
      venue: {
        title: "ATSPair kernel health",
        status: "healthy",
        detail: "healthy",
        summary: {
          pairId: "pair-1",
          mode: "ATSPair",
          operatorId: "operator-1",
          dealers: ["dealer-alpha"],
          paused: false,
          rulebookVersion: "v1",
          activeParticipantCount: 2,
          ledgerFacts: ["Shared RFQ state"],
          offLedgerFacts: ["Operator analytics"]
        },
        violations: []
      }
    });
  });

  it("throws typed validation errors for invalid payloads", () => {
    expect(() =>
      parseRegisterPairRequest({
        mode: "ATSPair",
        dealers: [],
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
          title: "ATSPair kernel health",
          status: "invalid",
          detail: "healthy",
          summary: {
            pairId: "pair-1",
            mode: "ATSPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            paused: false,
            rulebookVersion: "v1",
            activeParticipantCount: 2,
            ledgerFacts: ["Shared RFQ state"],
            offLedgerFacts: ["Operator analytics"]
          },
          violations: []
        }
      })
    ).toThrow(expect.objectContaining({ path: "$.venue.status" }));
  });

  it("covers optional, scalar, array, and object validation branches", () => {
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
    expect(validateVenueResponseSchema.parse({ ok: true, violations: [] })).toEqual({
      ok: true,
      violations: []
    });
    expect(() => submitDarkOrderRequestSchema.parse("bad")).toThrow(
      new ContractValidationError("$", "expected object")
    );
    expect(() =>
      grantAccessRequestSchema.parse({
        subjectId: 1,
        role: "subscriber"
      })
    ).toThrow(expect.objectContaining({ path: "$.subjectId" }));
    expect(() =>
      validateVenueResponseSchema.parse({
        ok: "yes",
        violations: []
      })
    ).toThrow(expect.objectContaining({ path: "$.ok" }));
    expect(() =>
      submitDarkOrderRequestSchema.parse({
        side: "buy",
        quantity: 1,
        limitPrice: "bad"
      })
    ).toThrow(expect.objectContaining({ path: "$.limitPrice" }));
    expect(() =>
      grantAccessRequestSchema.parse({
        subjectId: "subscriber-1",
        role: "subscriber",
        entitlements: "bad"
      })
    ).toThrow(expect.objectContaining({ path: "$.entitlements" }));
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
      "/pairs/{pairId}/dark-orders"
    ]);
    expect(Object.keys(document.components.schemas)).toEqual([
      "RegisterPairRequest",
      "GrantAccessRequest",
      "PausePairRequest",
      "SubmitRfqRequest",
      "SubmitDarkOrderRequest",
      "PairSummaryView",
      "VenueHealthReadModel",
      "HealthResponse",
      "ValidateVenueResponse"
    ]);
  });
});
