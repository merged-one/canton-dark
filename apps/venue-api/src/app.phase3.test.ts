import {
  parseDarkSubscriberStateResponse,
  parseDemoStatusResponse
} from "@canton-dark/api-contracts";
import { describe, expect, it } from "vitest";

import { createVenueApiApp } from "./app";

describe("venue-api phase 3", () => {
  it("runs typed dark-order and proposal lifecycle routes", async () => {
    const api = await createVenueApiApp({
      bootstrapMode: "empty",
      seed: 5150,
      startAt: "2026-04-02T00:00:00.000Z"
    });

    const pairReply = await api.handleRequest({
      method: "POST",
      url: "/pairs",
      headers: {
        "x-actor-id": "operator-dark"
      },
      body: {
        dealerIds: ["dealer-alpha", "dealer-beta"],
        inviteRevisionPolicy: "before_first_response",
        jurisdiction: "US",
        mode: "ATSPair",
        operatorId: "operator-dark",
        operatorOversightRole: "blinded",
        pairId: "pair-api-dark",
        rulebookSummary: "phase 3 api",
        rulebookVersion: "v3"
      }
    });
    const pairId = (pairReply.body as { pairId: string }).pairId;

    expect(pairReply.status).toBe(201);

    for (const subscriberId of ["subscriber-buy", "subscriber-sell"]) {
      expect(
        await api.handleRequest({
          method: "POST",
          url: `/pairs/${pairId}/access`,
          headers: {
            "x-actor-id": "operator-dark"
          },
          body: {
            role: "subscriber",
            subjectId: subscriberId
          }
        })
      ).toMatchObject({ status: 201 });
    }

    const buyOrderReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pairId}/dark-orders`,
      headers: {
        "x-actor-id": "subscriber-buy"
      },
      body: {
        clientOrderId: "buy-1",
        expiresAt: "2026-04-02T00:20:00.000Z",
        instrumentId: "CUSIP-DARK-1",
        limitPrice: 101,
        quantity: 25,
        side: "buy"
      }
    });
    const buyOrderId = (buyOrderReply.body as { orderId: string }).orderId;

    const sellOrderReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pairId}/dark-orders`,
      headers: {
        "x-actor-id": "subscriber-sell"
      },
      body: {
        clientOrderId: "sell-1",
        expiresAt: "2026-04-02T00:20:00.000Z",
        instrumentId: "CUSIP-DARK-1",
        limitPrice: 100,
        quantity: 25,
        side: "sell"
      }
    });
    const sellOrderId = (sellOrderReply.body as { orderId: string }).orderId;

    const extraOrderReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pairId}/dark-orders`,
      headers: {
        "x-actor-id": "subscriber-buy"
      },
      body: {
        clientOrderId: "buy-cancel",
        instrumentId: "CUSIP-DARK-1",
        limitPrice: 99,
        quantity: 10,
        side: "buy"
      }
    });
    const extraOrderId = (extraOrderReply.body as { orderId: string }).orderId;

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${pairId}/dark-orders/${extraOrderId}/cancel`,
        headers: {
          "x-actor-id": "subscriber-buy"
        }
      })
    ).toMatchObject({
      status: 200,
      body: {
        orderId: extraOrderId,
        status: "cancelled"
      }
    });

    const proposalReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pairId}/match-proposals`,
      headers: {
        "x-actor-id": "operator-dark"
      },
      body: {
        buyOrderId,
        expiresAt: "2026-04-02T00:05:00.000Z",
        sellOrderId
      }
    });
    const proposalId = (proposalReply.body as { proposal: { proposalId: string } }).proposal
      .proposalId;

    expect(proposalReply.status).toBe(201);
    const darkSubscriberReply = await api.handleRequest({
      method: "GET",
      url: `/pairs/${pairId}/views/dark-subscriber?subscriberId=subscriber-buy`,
      headers: {
        "x-actor-id": "subscriber-buy"
      }
    });
    const darkSubscriberState = parseDarkSubscriberStateResponse(darkSubscriberReply.body);

    expect(darkSubscriberReply.status).toBe(200);
    expect(darkSubscriberState.subscriberId).toBe("subscriber-buy");
    expect(darkSubscriberState.orders.some((order) => order.orderId === buyOrderId)).toBe(true);
    expect(
      darkSubscriberState.proposals.some((proposal) => proposal.proposalId === proposalId)
    ).toBe(true);

    const rejectedReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${pairId}/match-proposals/${proposalId}/reject`,
      headers: {
        "x-actor-id": "subscriber-sell"
      },
      body: {
        reason: "manual no-cross"
      }
    });

    expect(rejectedReply.status).toBe(200);
    expect(rejectedReply.body).toMatchObject({
      proposal: {
        proposalId,
        rejectionReason: "manual no-cross",
        status: "rejected"
      },
      buyLock: {
        releaseReason: "rejected",
        status: "released"
      },
      sellLock: {
        releaseReason: "rejected",
        status: "released"
      }
    });
  });

  it("seeds phase 3 demo state, executes a match, and releases expired locks", async () => {
    const api = await createVenueApiApp({
      bootstrapMode: "phase3-ready",
      seed: 77,
      startAt: "2026-04-02T00:00:00.000Z"
    });

    const demoStatus = await api.handleRequest({
      method: "GET",
      url: "/demo/status"
    });
    const seeded = parseDemoStatusResponse(demoStatus.body);

    expect(demoStatus.status).toBe(200);
    expect(seeded.mode).toBe("phase3-ready");
    expect(seeded.secondarySubscriberId).toBe("subscriber-2");
    expect(seeded.buyOrderId).toContain("dark-order-");
    expect(seeded.sellOrderId).toContain("dark-order-");
    expect(seeded.proposalId).toContain("match-proposal-");

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${seeded.pairId}/match-proposals/${seeded.proposalId}/accept`,
        headers: {
          "x-actor-id": seeded.subscriberId
        }
      })
    ).toMatchObject({
      status: 200,
      body: {
        proposalId: seeded.proposalId,
        status: "pending"
      }
    });

    expect(
      await api.handleRequest({
        method: "POST",
        url: `/pairs/${seeded.pairId}/match-proposals/${seeded.proposalId}/accept`,
        headers: {
          "x-actor-id": seeded.secondarySubscriberId
        }
      })
    ).toMatchObject({
      status: 200,
      body: {
        proposalId: seeded.proposalId,
        status: "accepted"
      }
    });

    const executionReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${seeded.pairId}/match-proposals/${seeded.proposalId}/execute`,
      headers: {
        "x-actor-id": "operator-demo"
      }
    });

    expect(executionReply.status).toBe(200);
    const executed = executionReply.body as {
      executionTicket: {
        executionKind: string;
        matchProposalId?: string;
      };
      proposal: {
        executionId?: string;
        proposalId: string;
        status: string;
      };
    };

    expect(executed.executionTicket.executionKind).toBe("dark_cross");
    expect(executed.executionTicket.matchProposalId).toBe(seeded.proposalId);
    expect(executed.proposal.executionId).toEqual(expect.any(String));
    expect(executed.proposal.proposalId).toBe(seeded.proposalId);
    expect(executed.proposal.status).toBe("executed");

    const executedStateReply = await api.handleRequest({
      method: "GET",
      url: `/pairs/${seeded.pairId}/views/dark-subscriber?subscriberId=${seeded.subscriberId}`,
      headers: {
        "x-actor-id": seeded.subscriberId
      }
    });
    const executedState = parseDarkSubscriberStateResponse(executedStateReply.body);

    expect(executedStateReply.status).toBe(200);
    expect(executedState.executions[0]?.executionKind).toBe("dark_cross");
    expect(executedState.settlements[0]?.settlementKind).toBe("dark_cross");

    const reseeded = await api.handleRequest({
      method: "POST",
      url: "/demo/reset",
      body: {
        mode: "phase3-ready",
        seed: 88
      }
    });
    const expiring = parseDemoStatusResponse(reseeded.body);

    await api.handleRequest({
      method: "POST",
      url: "/demo/clock/advance",
      body: {
        milliseconds: 10 * 60_000
      }
    });

    const releaseReply = await api.handleRequest({
      method: "POST",
      url: `/pairs/${expiring.pairId}/match-proposals/${expiring.proposalId}/release-expired`,
      headers: {
        "x-actor-id": "operator-demo"
      }
    });
    const released = releaseReply.body as {
      locks: {
        releaseReason?: string;
        status: string;
      }[];
      proposal: {
        proposalId: string;
        status: string;
      };
    };

    expect(releaseReply.status).toBe(200);
    expect(released.proposal.proposalId).toBe(expiring.proposalId);
    expect(released.proposal.status).toBe("expired");
    expect(
      released.locks.some((lock) => lock.status === "expired" && lock.releaseReason === "expired")
    ).toBe(true);
  });
});
