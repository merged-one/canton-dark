import { describe, expect, it } from "vitest";

import { createMemoryVenueEnvironment } from "@canton-dark/adapters-memory";

import { createVenueApiApp } from "./app";

describe("venue-api", () => {
  it("builds a deterministic health response for the seeded demo pair", async () => {
    const api = await createVenueApiApp();
    const response = await api.handleRequest({
      method: "GET",
      url: "/health"
    });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      service: "venue-api",
      generatedAt: "2026-04-02T00:00:00.000Z",
      venue: {
        title: "SingleDealerPair health",
        status: "healthy",
        detail:
          "Operator operator-demo oversees dealer dealer-alpha with 3 active participant grant(s).",
        summary: {
          pairId: "pair-demo",
          mode: "SingleDealerPair",
          operatorId: "operator-demo",
          dealers: ["dealer-alpha"],
          paused: false,
          rulebookVersion: "v1",
          activeParticipantCount: 3,
          ledgerFacts: [
            "Operator approvals",
            "Rulebook releases",
            "Access grants",
            "RFQ sessions",
            "Dealer quotes",
            "Execution tickets",
            "Settlement instructions"
          ],
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

  it("runs the phase 1 API flow through typed endpoints", async () => {
    const api = await createVenueApiApp();

    const pairReply = await api.handleRequest({
      method: "POST",
      url: "/pairs",
      headers: {
        "x-actor-id": "operator-2"
      },
      body: {
        mode: "SingleDealerPair",
        operatorId: "operator-2",
        dealerId: "dealer-beta",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      }
    });
    const pair = pairReply.body as { pairId: string };

    expect(pairReply.status).toBe(201);

    const accessReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/access`,
      headers: {
        "x-actor-id": "operator-2"
      },
      body: {
        subjectId: "subscriber-2",
        role: "subscriber"
      }
    });
    expect(accessReply.status).toBe(201);

    const auditAccessReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/access`,
      headers: {
        "x-actor-id": "operator-2"
      },
      body: {
        subjectId: "subscriber-2-audit",
        role: "subscriber",
        entitlements: ["view_audit"]
      }
    });
    expect(auditAccessReply.status).toBe(201);

    const rfqReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/rfqs`,
      headers: {
        "x-actor-id": "subscriber-2"
      },
      body: {
        instrumentId: "CUSIP-2",
        side: "buy",
        quantity: 12
      }
    });
    const rfq = rfqReply.body as { rfqId: string };

    expect(rfqReply.status).toBe(201);

    const quoteReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/rfqs/${rfq.rfqId}/quotes`,
      headers: {
        "x-actor-id": "dealer-beta"
      },
      body: {
        price: 99.5,
        quantity: 12,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    });
    const quote = (quoteReply.body as { quote: { quoteId: string } }).quote;

    expect(quoteReply.status).toBe(201);

    const acceptReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/quotes/${quote.quoteId}/accept`,
      headers: {
        "x-actor-id": "subscriber-2"
      }
    });
    const accepted = acceptReply.body as {
      settlementInstruction: { instructionId: string; status: string };
    };

    expect(acceptReply.status).toBe(200);
    expect(accepted.settlementInstruction.status).toBe("pending");

    const settlementReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/settlements/${accepted.settlementInstruction.instructionId}/progress`,
      headers: {
        "x-actor-id": "operator-2"
      },
      body: {
        status: "affirmed"
      }
    });

    expect(settlementReply.status).toBe(200);
    expect((settlementReply.body as { status: string }).status).toBe("affirmed");

    const operatorView = await api.handleRequest({
      method: "GET",
      url: `/pairs/${pair.pairId}/views/operator`
    });
    const subscriberView = await api.handleRequest({
      method: "GET",
      url: `/pairs/${pair.pairId}/views/subscriber?subscriberId=subscriber-2`
    });
    const dealerView = await api.handleRequest({
      method: "GET",
      url: `/pairs/${pair.pairId}/views/dealer-workbench?dealerId=dealer-beta`
    });
    const auditTrail = await api.handleRequest({
      method: "GET",
      url: `/pairs/${pair.pairId}/audit-trail`
    });

    expect(operatorView.status).toBe(200);
    expect(
      (operatorView.body as { rfqs: unknown[]; settlements: { status: string }[] }).rfqs
    ).toHaveLength(1);
    expect(
      (operatorView.body as { settlements: { status: string }[] }).settlements[0]?.status
    ).toBe("affirmed");
    expect(subscriberView.status).toBe(200);
    expect((subscriberView.body as { canOpenRfq: boolean }).canOpenRfq).toBe(true);
    expect(dealerView.status).toBe(200);
    expect((dealerView.body as { quotes: unknown[] }).quotes).toHaveLength(1);
    expect(auditTrail.status).toBe(200);
    expect((auditTrail.body as { entries: unknown[] }).entries.length).toBeGreaterThanOrEqual(6);
  });

  it("returns typed errors for invalid and unhappy paths", async () => {
    const api = await createVenueApiApp();

    expect(
      await api.handleRequest({
        method: "POST",
        url: "/pairs",
        body: {
          mode: "SingleDealerPair"
        }
      })
    ).toEqual({
      status: 400,
      body: {
        message: "$.operatorId: is required",
        path: "$.operatorId"
      }
    });

    const pairReply = await api.handleRequest({
      method: "POST",
      url: "/pairs",
      headers: {
        "x-actor-id": "operator-3"
      },
      body: {
        mode: "SingleDealerPair",
        operatorId: "operator-3",
        dealerId: "dealer-gamma",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      }
    });
    const pairId = (pairReply.body as { pairId: string }).pairId;

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pairId}/rfqs`,
        headers: {
          "x-actor-id": "subscriber-missing"
        },
        body: {
          instrumentId: "CUSIP-3",
          side: "buy",
          quantity: 1
        }
      })
    ).toEqual({
      status: 409,
      body: {
        code: "MISSING_ENTITLEMENT",
        message: "The subscriber does not hold submit_rfq permission for this pair."
      }
    });

    await api.handleRequest({
      method: "POST",
      url: `/pairs/${pairId}/pause`,
      headers: {
        "x-actor-id": "operator-3"
      },
      body: {
        state: "paused",
        reason: "manual halt"
      }
    });

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pairId}/pause`,
        headers: {
          "x-actor-id": "operator-3"
        }
      })
    ).toEqual({
      status: 400,
      body: {
        message: "$.state: is required",
        path: "$.state"
      }
    });

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pairId}/rfqs`,
        headers: {
          "x-actor-id": "subscriber-missing"
        },
        body: {
          instrumentId: "CUSIP-3",
          side: "buy",
          quantity: 1
        }
      })
    ).toEqual({
      status: 409,
      body: {
        code: "PAIR_IS_PAUSED",
        message: "Trading commands are unavailable while the pair is paused."
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/pairs/missing/views/operator"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Pair missing was not found."
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: `/pairs/${pairId}/views/subscriber`
      })
    ).toEqual({
      status: 400,
      body: {
        message: "$.subscriberId: is required",
        path: "$.subscriberId"
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/pairs/missing/views/subscriber?subscriberId=subscriber-missing"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Pair missing was not found."
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/pairs/missing/views/dealer-workbench?dealerId=dealer-missing"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Pair missing was not found."
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/pairs/missing/audit-trail"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Pair missing was not found."
      }
    });
  });

  it("covers pre-seeded startup and the remaining phase 1 route branches", async () => {
    const environment = createMemoryVenueEnvironment();
    const pair = await environment.application.createPair({
      actorId: "operator-9",
      operatorId: "operator-9",
      dealerId: "dealer-zeta",
      jurisdiction: "US",
      pairId: "pair-preseeded",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    await environment.application.grantAccess({
      actorId: "operator-9",
      pairId: pair.pairId,
      subjectId: "subscriber-9",
      role: "subscriber",
      entitlements: ["view_audit"]
    });
    const api = await createVenueApiApp(environment);

    expect(api.demoPairId).toBe("pair-preseeded");

    const rfqReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/rfqs`,
      headers: {
        "x-actor-id": "subscriber-9"
      },
      body: {
        instrumentId: "CUSIP-9",
        side: "buy",
        quantity: 3
      }
    });
    const rfqId = (rfqReply.body as { rfqId: string }).rfqId;

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pair.pairId}/rfqs/${rfqId}/reject`,
        headers: {
          "x-actor-id": "dealer-zeta"
        },
        body: {
          reason: "manual reject"
        }
      })
    ).toEqual({
      status: 200,
      body: {
        rfqId,
        pairId: "pair-preseeded",
        dealerId: "dealer-zeta",
        subscriberId: "subscriber-9",
        instrumentId: "CUSIP-9",
        side: "buy",
        quantity: 3,
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        status: "rejected",
        rejectedAt: "2026-04-02T00:00:00.000Z",
        rejectedBy: "dealer-zeta",
        rejectionReason: "manual reject"
      }
    });

    const thirdRfqReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/rfqs`,
      headers: {
        "x-actor-id": "subscriber-9"
      },
      body: {
        instrumentId: "CUSIP-11",
        side: "buy",
        quantity: 4
      }
    });
    const thirdRfqId = (thirdRfqReply.body as { rfqId: string }).rfqId;

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pair.pairId}/rfqs/${thirdRfqId}/reject`,
        headers: {
          "x-actor-id": "dealer-zeta"
        },
        body: {}
      })
    ).toEqual({
      status: 200,
      body: {
        rfqId: thirdRfqId,
        pairId: "pair-preseeded",
        dealerId: "dealer-zeta",
        subscriberId: "subscriber-9",
        instrumentId: "CUSIP-11",
        side: "buy",
        quantity: 4,
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        status: "rejected",
        rejectedAt: "2026-04-02T00:00:00.000Z",
        rejectedBy: "dealer-zeta"
      }
    });

    const secondRfqReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pair.pairId}/rfqs`,
      headers: {
        "x-actor-id": "subscriber-9"
      },
      body: {
        instrumentId: "CUSIP-10",
        side: "sell",
        quantity: 2
      }
    });
    const secondRfqId = (secondRfqReply.body as { rfqId: string }).rfqId;

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pair.pairId}/rfqs/${secondRfqId}/cancel`,
        headers: {
          "x-actor-id": "subscriber-9"
        }
      })
    ).toEqual({
      status: 200,
      body: {
        rfqId: secondRfqId,
        pairId: "pair-preseeded",
        dealerId: "dealer-zeta",
        subscriberId: "subscriber-9",
        instrumentId: "CUSIP-10",
        side: "sell",
        quantity: 2,
        createdAt: "2026-04-02T00:00:00.000Z",
        updatedAt: "2026-04-02T00:00:00.000Z",
        status: "cancelled",
        cancelledAt: "2026-04-02T00:00:00.000Z",
        cancelledBy: "subscriber-9"
      }
    });

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pair.pairId}/quotes/missing/accept`,
        headers: {
          "x-actor-id": "subscriber-9"
        }
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Quote missing was not found."
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: `/pairs/${pair.pairId}/views/dealer-workbench`
      })
    ).toEqual({
      status: 400,
      body: {
        message: "$.dealerId: is required",
        path: "$.dealerId"
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/health?pairId=missing"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Pair missing was not found."
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/missing"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Not found"
      }
    });

    expect(
      await api.handleRequest({
        method: "POST",
        url: "/pairs",
        body: {
          mode: "SingleDealerPair",
          operatorId: "operator-blank",
          dealerId: "dealer-blank",
          jurisdiction: "US",
          rulebookVersion: "v1",
          rulebookSummary: "initial"
        }
      })
    ).toEqual({
      status: 400,
      body: {
        message: "$.actorId: is required",
        path: "$.actorId"
      }
    });

    expect(
      await api.handleRequest({
        method: "GET",
        url: `/pairs/${pair.pairId}/unknown`
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Not found"
      }
    });
  });

  it("maps unexpected runtime failures to 500 responses", async () => {
    const environment = createMemoryVenueEnvironment();
    await environment.application.createPair({
      actorId: "operator-500",
      operatorId: "operator-500",
      dealerId: "dealer-500",
      jurisdiction: "US",
      pairId: "pair-500",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    const originalGetVenueHealth = environment.application.getVenueHealth;

    environment.application.getVenueHealth = async () => {
      throw new Error("boom");
    };

    const api = await createVenueApiApp(environment);

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/health?pairId=pair-500"
      })
    ).toEqual({
      status: 500,
      body: {
        message: "boom"
      }
    });

    environment.application.getVenueHealth = originalGetVenueHealth;

    environment.application.getVenueHealth = async () => {
      throw new Error("Pair pair-500 was not found.");
    };

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/health?pairId=pair-500"
      })
    ).toEqual({
      status: 404,
      body: {
        message: "Pair pair-500 was not found."
      }
    });

    environment.application.getVenueHealth = async () => {
      // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors
      return Promise.reject("bad");
    };

    expect(
      await api.handleRequest({
        method: "GET",
        url: "/health?pairId=pair-500"
      })
    ).toEqual({
      status: 500,
      body: {
        message: "Unknown error"
      }
    });
  });
});
