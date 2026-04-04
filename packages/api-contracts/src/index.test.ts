import { describe, expect, it } from "vitest";

import {
  ContractValidationError,
  createPairRequestSchema,
  generateOpenApiDocument,
  grantAccessRequestSchema,
  markSettlementProgressionRequestSchema,
  openRfqRequestSchema,
  parseAuditTrailView,
  parseCreatePairRequest,
  parseDealerInvitationHistoryView,
  parseDealerWorkbenchView,
  parseDemoClockAdvanceRequest,
  parseDemoResetRequest,
  parseDemoStatusResponse,
  parseHealthResponse,
  parseOperatorOversightView,
  parseOperatorView,
  parseQuoteComparisonView,
  parseSubscriberView,
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
    expect(
      parseOperatorView({
        pair: {
          pairId: "pair-1",
          mode: "SingleDealerPair",
          operatorId: "operator-1",
          dealerId: "dealer-alpha",
          paused: false,
          rulebookVersion: "v1",
          approvalStatus: "approved",
          attestationStatus: "attested"
        },
        access: {
          pairId: "pair-1",
          participants: []
        },
        rfqs: [],
        quotes: [],
        executions: [],
        settlements: [],
        health: {
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
    ).toMatchObject({
      pair: {
        pairId: "pair-1"
      }
    });
    expect(
      parseSubscriberView({
        availableDealerIds: ["dealer-alpha"],
        pair: {
          pairId: "pair-1",
          mode: "SingleDealerPair",
          operatorId: "operator-1",
          dealerId: "dealer-alpha",
          paused: false,
          rulebookVersion: "v1",
          approvalStatus: "approved",
          attestationStatus: "attested"
        },
        subscriberId: "subscriber-1",
        entitlements: ["submit_rfq"],
        canOpenRfq: true,
        rfqs: [],
        quotes: [],
        executions: [],
        settlements: []
      })
    ).toMatchObject({
      subscriberId: "subscriber-1"
    });
    expect(
      parseDealerWorkbenchView({
        pair: {
          pairId: "pair-1",
          mode: "SingleDealerPair",
          operatorId: "operator-1",
          dealerId: "dealer-alpha",
          paused: false,
          rulebookVersion: "v1",
          approvalStatus: "approved",
          attestationStatus: "attested"
        },
        dealerId: "dealer-alpha",
        rfqs: [],
        quotes: [],
        executions: []
      })
    ).toMatchObject({
      dealerId: "dealer-alpha"
    });
    expect(
      parseAuditTrailView({
        pairId: "pair-1",
        entries: []
      })
    ).toEqual({
      pairId: "pair-1",
      entries: []
    });
    expect(
      parseDemoResetRequest({
        mode: "phase1-ready",
        seed: 424242
      })
    ).toEqual({
      mode: "phase1-ready",
      seed: 424242
    });
    expect(
      parseDemoClockAdvanceRequest({
        milliseconds: 5_000
      })
    ).toEqual({
      milliseconds: 5_000
    });
    expect(
      parseDemoStatusResponse({
        currentTime: "2026-04-02T00:00:00.000Z",
        dealerId: "dealer-alpha",
        dealerIds: ["dealer-alpha"],
        mode: "phase1-ready",
        operatorId: "operator-demo",
        pairId: "pair-phase1-demo",
        seed: 424242,
        subscriberId: "subscriber-1"
      })
    ).toEqual({
      currentTime: "2026-04-02T00:00:00.000Z",
      dealerId: "dealer-alpha",
      dealerIds: ["dealer-alpha"],
      mode: "phase1-ready",
      operatorId: "operator-demo",
      pairId: "pair-phase1-demo",
      seed: 424242,
      subscriberId: "subscriber-1"
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
    expect(() =>
      createPairRequestSchema.parse({
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      })
    ).toThrow(new ContractValidationError("$.dealerId", "is required"));
    expect(() =>
      createPairRequestSchema.parse({
        mode: "ATSPair",
        operatorId: "operator-1",
        dealerIds: ["dealer-alpha"],
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      })
    ).toThrow(new ContractValidationError("$.dealerIds", "must include at least two dealers"));
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
      pausePairRequestSchema.parse({
        reason: undefined,
        state: "paused"
      })
    ).toEqual({
      state: "paused"
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

  it("parses ATS quote comparison and oversight views", () => {
    expect(
      parseCreatePairRequest({
        mode: "ATSPair",
        operatorId: "operator-1",
        dealerIds: ["dealer-alpha", "dealer-beta"],
        operatorOversightRole: "blinded",
        inviteRevisionPolicy: "before_first_response",
        jurisdiction: "US",
        rulebookVersion: "v2",
        rulebookSummary: "phase 2 ats"
      })
    ).toEqual({
      mode: "ATSPair",
      operatorId: "operator-1",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "blinded",
      inviteRevisionPolicy: "before_first_response",
      jurisdiction: "US",
      rulebookVersion: "v2",
      rulebookSummary: "phase 2 ats"
    });
    expect(
      parseQuoteComparisonView({
        invitations: [
          {
            invitationId: "invite-1",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            invitationVersion: 1,
            invitedAt: "2026-04-02T00:00:00.000Z",
            invitedBy: "subscriber-1",
            responseWindowClosesAt: "2026-04-02T00:05:00.000Z",
            status: "responded",
            respondedAt: "2026-04-02T00:00:10.000Z"
          }
        ],
        pairId: "pair-ats",
        rfqId: "rfq-1",
        responseWindowClosesAt: "2026-04-02T00:05:00.000Z",
        subscriberId: "subscriber-1",
        side: "buy",
        tieBreakRule:
          "Best price, then larger quantity, then earliest quote creation time, then lexicographic quote id.",
        quotes: [
          {
            quoteId: "quote-1",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            price: 101.25,
            quantity: 500,
            expiresAt: "2026-04-02T00:05:00.000Z",
            status: "open",
            createdAt: "2026-04-02T00:00:10.000Z",
            comparable: true,
            rank: 1
          }
        ]
      })
    ).toMatchObject({
      pairId: "pair-ats",
      invitations: [
        {
          invitationId: "invite-1"
        }
      ],
      quotes: [
        {
          quoteId: "quote-1",
          rank: 1
        }
      ]
    });
    expect(
      parseOperatorOversightView({
        access: {
          pairId: "pair-ats",
          participants: []
        },
        dealerUniverse: ["dealer-alpha", "dealer-beta"],
        executions: [],
        health: {
          title: "ATSPair health",
          status: "healthy",
          detail: "Healthy",
          summary: {
            pairId: "pair-ats",
            mode: "ATSPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha", "dealer-beta"],
            paused: false,
            rulebookVersion: "v2",
            activeParticipantCount: 3,
            ledgerFacts: ["RFQ sessions"],
            offLedgerFacts: ["Transient UI state"]
          },
          violations: []
        },
        inviteRevisionPolicy: "before_first_response",
        pair: {
          pairId: "pair-ats",
          mode: "ATSPair",
          operatorId: "operator-1",
          dealerId: "dealer-alpha",
          paused: false,
          rulebookVersion: "v2",
          approvalStatus: "approved",
          attestationStatus: "attested"
        },
        oversightRole: "blinded",
        rfqs: [],
        invitations: [],
        quotes: [
          {
            quoteId: "quote-1",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            createdAt: "2026-04-02T00:00:10.000Z",
            expiresAt: "2026-04-02T00:05:00.000Z",
            status: "open",
            price: null,
            quantity: null
          },
          {
            quoteId: "quote-2",
            rfqId: "rfq-1",
            dealerId: "dealer-beta",
            subscriberId: "subscriber-1",
            createdAt: "2026-04-02T00:00:20.000Z",
            expiresAt: "2026-04-02T00:05:00.000Z",
            status: "accepted",
            price: 101.1,
            quantity: 600
          }
        ],
        quoteLadders: [],
        revisions: [],
        settlements: [],
        withdrawals: [],
        audits: [
          {
            action: "quote.accepted",
            actorId: "subscriber-1",
            at: "2026-04-02T00:01:00.000Z",
            detail: "Accepted best quote",
            entityId: "quote-2",
            pairId: "pair-ats"
          }
        ]
      })
    ).toMatchObject({
      dealerUniverse: ["dealer-alpha", "dealer-beta"],
      inviteRevisionPolicy: "before_first_response",
      oversightRole: "blinded",
      quotes: [
        {
          quoteId: "quote-1",
          price: null,
          quantity: null
        },
        {
          quoteId: "quote-2",
          price: 101.1,
          quantity: 600
        }
      ]
    });
  });

  it("parses dealer invitation history views", () => {
    expect(
      parseDealerInvitationHistoryView({
        pair: {
          pairId: "pair-ats",
          mode: "ATSPair",
          operatorId: "operator-1",
          dealerId: "dealer-alpha",
          paused: false,
          rulebookVersion: "v2",
          approvalStatus: "approved",
          attestationStatus: "attested"
        },
        dealerId: "dealer-alpha",
        invitations: [
          {
            invitationId: "invite-1",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            invitationVersion: 1,
            invitedAt: "2026-04-02T00:00:00.000Z",
            invitedBy: "operator-1",
            responseWindowClosesAt: "2026-04-02T00:05:00.000Z",
            status: "responded",
            respondedAt: "2026-04-02T00:00:10.000Z"
          }
        ],
        quotes: [
          {
            quoteId: "quote-1",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            price: 101.25,
            quantity: 500,
            expiresAt: "2026-04-02T00:05:00.000Z",
            status: "open",
            createdAt: "2026-04-02T00:00:10.000Z"
          }
        ],
        revisions: [
          {
            revisionId: "revision-1",
            pairId: "pair-ats",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            previousQuoteId: "quote-0",
            nextQuoteId: "quote-1",
            revisedAt: "2026-04-02T00:00:10.000Z",
            revisedBy: "dealer-alpha"
          }
        ],
        withdrawals: [
          {
            withdrawalId: "withdrawal-1",
            pairId: "pair-ats",
            rfqId: "rfq-1",
            quoteId: "quote-0",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            withdrawnAt: "2026-04-02T00:00:09.000Z",
            withdrawnBy: "dealer-alpha",
            reason: "replaced"
          }
        ]
      })
    ).toMatchObject({
      dealerId: "dealer-alpha",
      invitations: [
        {
          invitationId: "invite-1",
          status: "responded"
        }
      ],
      revisions: [
        {
          revisionId: "revision-1"
        }
      ],
      withdrawals: [
        {
          withdrawalId: "withdrawal-1"
        }
      ]
    });
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
      "/demo/status",
      "/demo/reset",
      "/demo/clock/advance",
      "/pairs",
      "/pairs/{pairId}/access",
      "/pairs/{pairId}/dark-orders",
      "/pairs/{pairId}/dark-orders/{orderId}/cancel",
      "/pairs/{pairId}/match-proposals",
      "/pairs/{pairId}/match-proposals/{proposalId}/accept",
      "/pairs/{pairId}/match-proposals/{proposalId}/reject",
      "/pairs/{pairId}/match-proposals/{proposalId}/release-expired",
      "/pairs/{pairId}/match-proposals/{proposalId}/execute",
      "/pairs/{pairId}/pause",
      "/pairs/{pairId}/rfqs",
      "/pairs/{pairId}/rfqs/{rfqId}/invite-dealers",
      "/pairs/{pairId}/rfqs/{rfqId}/revise-invite-set",
      "/pairs/{pairId}/rfqs/{rfqId}/reject",
      "/pairs/{pairId}/rfqs/{rfqId}/cancel",
      "/pairs/{pairId}/rfqs/{rfqId}/quotes",
      "/pairs/{pairId}/quotes/{quoteId}/revise",
      "/pairs/{pairId}/quotes/{quoteId}/withdraw",
      "/pairs/{pairId}/quotes/{quoteId}/accept",
      "/pairs/{pairId}/rfqs/{rfqId}/reject-all",
      "/pairs/{pairId}/settlements/{instructionId}/progress",
      "/pairs/{pairId}/views/operator",
      "/pairs/{pairId}/views/subscriber",
      "/pairs/{pairId}/views/dark-subscriber",
      "/pairs/{pairId}/views/dealer-workbench",
      "/pairs/{pairId}/views/operator-oversight",
      "/pairs/{pairId}/rfqs/{rfqId}/quote-ladder",
      "/pairs/{pairId}/dealers/{dealerId}/history",
      "/pairs/{pairId}/audit-trail"
    ]);
    expect(Object.keys(document.components.schemas)).toEqual([
      "CreatePairRequest",
      "GrantAccessRequest",
      "PausePairRequest",
      "OpenRfqRequest",
      "InviteDealersRequest",
      "RejectRfqRequest",
      "SubmitQuoteRequest",
      "WithdrawQuoteRequest",
      "RejectAllQuotesRequest",
      "MarkSettlementProgressionRequest",
      "SubmitDarkOrderRequest",
      "GenerateMatchProposalRequest",
      "RejectMatchRequest",
      "OperatorView",
      "SubscriberView",
      "DealerWorkbenchView",
      "DealerInvitationHistoryView",
      "QuoteComparisonView",
      "OperatorOversightView",
      "AuditTrailView",
      "VenueHealthReadModel",
      "HealthResponse",
      "DarkSubscriberStateResponse",
      "DemoResetRequest",
      "DemoClockAdvanceRequest",
      "DemoStatusResponse"
    ]);
  });
});
