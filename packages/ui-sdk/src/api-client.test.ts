import { describe, expect, it } from "vitest";

import { createVenueApiClient } from "./api-client";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });

const requestUrl = (input: RequestInfo | URL): string => {
  if (input instanceof Request) {
    return input.url;
  }

  return input instanceof URL ? input.toString() : input;
};

const parseRequestBody = (init?: RequestInit): Record<string, unknown> => {
  if (typeof init?.body !== "string") {
    throw new Error("Expected a JSON request body.");
  }

  return JSON.parse(init.body) as Record<string, unknown>;
};

describe("createVenueApiClient", () => {
  it("parses scoped read responses and surfaces typed errors", async () => {
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse({
          currentTime: "2026-04-02T00:00:00.000Z",
          dealerId: "dealer-alpha",
          mode: "phase1-ready",
          operatorId: "operator-demo",
          pairId: "pair-phase1-demo",
          seed: 424242,
          subscriberId: "subscriber-1"
        });
      }

      if (url.includes("/views/operator")) {
        expect(init?.headers).toMatchObject({
          "content-type": "application/json",
          "x-actor-id": "operator-demo"
        });

        return jsonResponse({
          pair: {
            pairId: "pair-phase1-demo",
            mode: "SingleDealerPair",
            operatorId: "operator-demo",
            dealerId: "dealer-alpha",
            paused: false,
            rulebookVersion: "v1",
            approvalStatus: "approved",
            attestationStatus: "attested"
          },
          access: {
            pairId: "pair-phase1-demo",
            participants: []
          },
          rfqs: [],
          quotes: [],
          executions: [],
          settlements: [],
          health: {
            title: "SingleDealerPair health",
            status: "healthy",
            detail: "Healthy",
            summary: {
              pairId: "pair-phase1-demo",
              mode: "SingleDealerPair",
              operatorId: "operator-demo",
              dealers: ["dealer-alpha"],
              paused: false,
              rulebookVersion: "v1",
              activeParticipantCount: 2,
              ledgerFacts: ["RFQ sessions"],
              offLedgerFacts: ["Transient UI state"]
            },
            violations: []
          }
        });
      }

      if (url.includes("/views/subscriber")) {
        return jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message:
              "Only subscriber subscriber-1 may access the subscriber view for pair pair-phase1-demo."
          },
          403
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    };

    const client = createVenueApiClient({
      apiBaseUrl: "http://unit.test",
      fetchImpl
    });

    await expect(client.getDemoStatus()).resolves.toEqual({
      currentTime: "2026-04-02T00:00:00.000Z",
      dealerId: "dealer-alpha",
      mode: "phase1-ready",
      operatorId: "operator-demo",
      pairId: "pair-phase1-demo",
      seed: 424242,
      subscriberId: "subscriber-1"
    });

    await expect(
      client.getOperatorView({
        actorId: "operator-demo",
        pairId: "pair-phase1-demo"
      })
    ).resolves.toMatchObject({
      pair: {
        pairId: "pair-phase1-demo"
      }
    });

    await expect(
      client.getSubscriberView({
        actorId: "subscriber-2",
        pairId: "pair-phase1-demo",
        subscriberId: "subscriber-1"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        message:
          "Only subscriber subscriber-1 may access the subscriber view for pair pair-phase1-demo.",
        name: "VenueApiClientError",
        status: 403
      })
    );
  });

  it("issues typed write requests and handles empty response bodies", async () => {
    const fetchImpl = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url = requestUrl(input);

      if (url.endsWith("/pairs")) {
        expect(init?.method).toBe("POST");
        expect(init?.headers).toMatchObject({
          "content-type": "application/json",
          "x-actor-id": "operator-demo"
        });
        expect(parseRequestBody(init)).toMatchObject({
          dealerId: "dealer-alpha",
          pairId: "pair-phase1-demo"
        });

        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase1-demo/access")) {
        expect(parseRequestBody(init)).toEqual({
          role: "subscriber",
          subjectId: "subscriber-1"
        });

        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase1-demo/rfqs")) {
        expect(parseRequestBody(init)).toEqual({
          instrumentId: "CUSIP-1",
          quantity: 50,
          side: "buy"
        });

        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase1-demo/pause")) {
        expect(parseRequestBody(init)).toEqual({
          reason: "manual review",
          state: "paused"
        });

        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase1-demo/rfqs/rfq-1/quotes")) {
        expect(parseRequestBody(init)).toEqual({
          expiresAt: "2026-04-02T00:20:00.000Z",
          price: 100.5,
          quantity: 50
        });

        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase1-demo/quotes/quote-1/accept")) {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase1-demo/settlements/settlement-1/progress")) {
        expect(parseRequestBody(init)).toEqual({
          status: "affirmed"
        });

        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/demo/reset")) {
        expect(init?.headers).toEqual({
          "content-type": "application/json"
        });
        expect(parseRequestBody(init)).toEqual({
          mode: "phase1-complete"
        });

        return jsonResponse({
          currentTime: "2026-04-02T00:10:00.000Z",
          dealerId: "dealer-alpha",
          mode: "phase1-complete",
          operatorId: "operator-demo",
          pairId: "pair-phase1-demo",
          seed: 424242,
          subscriberId: "subscriber-1"
        });
      }

      if (url.endsWith("/demo/clock/advance")) {
        expect(parseRequestBody(init)).toEqual({
          milliseconds: 300000
        });

        return jsonResponse({
          currentTime: "2026-04-02T00:15:00.000Z",
          dealerId: "dealer-alpha",
          mode: "phase1-complete",
          operatorId: "operator-demo",
          pairId: "pair-phase1-demo",
          seed: 424242,
          subscriberId: "subscriber-1"
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    };

    const client = createVenueApiClient({
      apiBaseUrl: "http://unit.test",
      fetchImpl
    });

    await expect(
      client.createPair({
        actorId: "operator-demo",
        dealerId: "dealer-alpha",
        jurisdiction: "US",
        mode: "SingleDealerPair",
        operatorId: "operator-demo",
        pairId: "pair-phase1-demo",
        rulebookSummary: "initial",
        rulebookVersion: "v1"
      })
    ).resolves.toBeUndefined();

    await expect(
      client.grantAccess({
        actorId: "operator-demo",
        pairId: "pair-phase1-demo",
        role: "subscriber",
        subjectId: "subscriber-1"
      })
    ).resolves.toBeUndefined();

    await expect(
      client.openRfq({
        actorId: "subscriber-1",
        instrumentId: "CUSIP-1",
        pairId: "pair-phase1-demo",
        quantity: 50,
        side: "buy"
      })
    ).resolves.toBeUndefined();

    await expect(
      client.pausePair({
        actorId: "operator-demo",
        pairId: "pair-phase1-demo",
        reason: "manual review",
        state: "paused"
      })
    ).resolves.toBeUndefined();

    await expect(
      client.submitQuote({
        actorId: "dealer-alpha",
        expiresAt: "2026-04-02T00:20:00.000Z",
        pairId: "pair-phase1-demo",
        price: 100.5,
        quantity: 50,
        rfqId: "rfq-1"
      })
    ).resolves.toBeUndefined();

    await expect(
      client.acceptQuote({
        actorId: "subscriber-1",
        pairId: "pair-phase1-demo",
        quoteId: "quote-1"
      })
    ).resolves.toBeUndefined();

    await expect(
      client.markSettlementProgression({
        actorId: "operator-demo",
        instructionId: "settlement-1",
        pairId: "pair-phase1-demo",
        status: "affirmed"
      })
    ).resolves.toBeUndefined();

    await expect(client.resetDemoState({ mode: "phase1-complete" })).resolves.toMatchObject({
      mode: "phase1-complete"
    });
    await expect(client.advanceClock(300000)).resolves.toMatchObject({
      currentTime: "2026-04-02T00:15:00.000Z"
    });
  });

  it("preserves error code and path metadata", async () => {
    const client = createVenueApiClient({
      apiBaseUrl: "http://unit.test",
      fetchImpl: async () =>
        jsonResponse(
          {
            code: "FORBIDDEN",
            message: "Denied.",
            path: "/pairs/pair-phase1-demo/audit-trail"
          },
          403
        )
    });

    await expect(
      client.getAuditTrail({
        actorId: "operator-demo",
        pairId: "pair-phase1-demo"
      })
    ).rejects.toEqual(
      expect.objectContaining({
        code: "FORBIDDEN",
        path: "/pairs/pair-phase1-demo/audit-trail",
        status: 403
      })
    );
  });

  it("falls back to the global fetch implementation and synthesized error messages", async () => {
    const originalFetch = globalThis.fetch;
    const fetchImpl = async (): Promise<Response> => jsonResponse({}, 500);

    globalThis.fetch = fetchImpl as typeof fetch;

    try {
      const client = createVenueApiClient({
        apiBaseUrl: "http://unit.test"
      });

      await expect(client.getDemoStatus()).rejects.toEqual(
        expect.objectContaining({
          message: "Venue API request failed with status 500.",
          status: 500
        })
      );
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
