import { describe, expect, it } from "vitest";

import {
  ContractValidationError,
  generateOpenApiDocument,
  parseDarkSubscriberStateResponse,
  parseDemoStatusResponse,
  parseGenerateMatchProposalRequest,
  parseRejectMatchRequest,
  parseSubmitDarkOrderRequest
} from "./index";

describe("api-contract dark-cross schemas", () => {
  it("parses phase 3 request and response payloads", () => {
    expect(
      parseSubmitDarkOrderRequest({
        clientOrderId: "dark-1",
        expiresAt: "2026-04-02T00:20:00.000Z",
        instrumentId: "CUSIP-DARK-1",
        limitPrice: 101,
        quantity: 25,
        side: "buy"
      })
    ).toEqual({
      clientOrderId: "dark-1",
      expiresAt: "2026-04-02T00:20:00.000Z",
      instrumentId: "CUSIP-DARK-1",
      limitPrice: 101,
      quantity: 25,
      side: "buy"
    });

    expect(
      parseGenerateMatchProposalRequest({
        buyOrderId: "dark-buy-1",
        expiresAt: "2026-04-02T00:05:00.000Z",
        sellOrderId: "dark-sell-1"
      })
    ).toEqual({
      buyOrderId: "dark-buy-1",
      expiresAt: "2026-04-02T00:05:00.000Z",
      sellOrderId: "dark-sell-1"
    });

    expect(parseGenerateMatchProposalRequest({})).toEqual({});

    expect(
      parseRejectMatchRequest({
        reason: "manual no-cross"
      })
    ).toEqual({
      reason: "manual no-cross"
    });

    expect(
      parseDarkSubscriberStateResponse({
        executions: [
          {
            acceptedAt: "2026-04-02T00:03:00.000Z",
            buyOrderId: "dark-buy-1",
            buySubscriberId: "subscriber-1",
            executionId: "execution-dark-1",
            executionKind: "dark_cross",
            instrumentId: "CUSIP-DARK-1",
            matchProposalId: "proposal-dark-1",
            pairId: "pair-dark-1",
            price: 100.5,
            quantity: 25,
            sellOrderId: "dark-sell-1",
            sellSubscriberId: "subscriber-2"
          }
        ],
        locks: [
          {
            lockExpiresAt: "2026-04-02T00:05:00.000Z",
            lockId: "lock-buy-1",
            lockedAt: "2026-04-02T00:02:00.000Z",
            lockedBy: "operator-demo",
            orderId: "dark-buy-1",
            pairId: "pair-dark-1",
            proposalId: "proposal-dark-1",
            status: "active",
            subscriberId: "subscriber-1",
            updatedAt: "2026-04-02T00:02:00.000Z"
          }
        ],
        orders: [
          {
            clientOrderId: "dark-1",
            createdAt: "2026-04-02T00:01:00.000Z",
            instrumentId: "CUSIP-DARK-1",
            limitPrice: 101,
            orderId: "dark-buy-1",
            pairId: "pair-dark-1",
            quantity: 25,
            side: "buy",
            status: "open",
            subscriberId: "subscriber-1",
            updatedAt: "2026-04-02T00:01:00.000Z"
          }
        ],
        proposals: [
          {
            buyLockId: "lock-buy-1",
            buyOrderId: "dark-buy-1",
            buyResponse: "pending",
            buySubscriberId: "subscriber-1",
            createdAt: "2026-04-02T00:02:00.000Z",
            createdBy: "operator-demo",
            expiresAt: "2026-04-02T00:05:00.000Z",
            instrumentId: "CUSIP-DARK-1",
            pairId: "pair-dark-1",
            price: 100.5,
            proposalId: "proposal-dark-1",
            quantity: 25,
            sellLockId: "lock-sell-1",
            sellOrderId: "dark-sell-1",
            sellResponse: "pending",
            sellSubscriberId: "subscriber-2",
            status: "pending",
            updatedAt: "2026-04-02T00:02:00.000Z"
          }
        ],
        settlements: [
          {
            buyOrderId: "dark-buy-1",
            createdAt: "2026-04-02T00:03:00.000Z",
            executionId: "execution-dark-1",
            instructionId: "settlement-dark-1",
            matchProposalId: "proposal-dark-1",
            pairId: "pair-dark-1",
            sellOrderId: "dark-sell-1",
            settlementAgentId: "settler-1",
            settlementKind: "dark_cross",
            status: "pending",
            updatedAt: "2026-04-02T00:03:00.000Z"
          }
        ],
        subscriberId: "subscriber-1"
      })
    ).toMatchObject({
      subscriberId: "subscriber-1",
      proposals: [expect.objectContaining({ proposalId: "proposal-dark-1" })]
    });

    expect(
      parseDemoStatusResponse({
        buyOrderId: "dark-buy-1",
        currentTime: "2026-04-02T00:00:00.000Z",
        dealerId: "dealer-alpha",
        dealerIds: ["dealer-alpha", "dealer-beta"],
        mode: "phase3-ready",
        operatorId: "operator-demo",
        pairId: "pair-phase3-demo",
        proposalId: "proposal-dark-1",
        secondarySubscriberId: "subscriber-2",
        seed: 424242,
        sellOrderId: "dark-sell-1",
        subscriberId: "subscriber-1"
      })
    ).toMatchObject({
      mode: "phase3-ready",
      proposalId: "proposal-dark-1",
      secondarySubscriberId: "subscriber-2"
    });
  });

  it("rejects malformed targeted proposal requests and documents phase 3 paths", () => {
    expect(() =>
      parseGenerateMatchProposalRequest({
        buyOrderId: "dark-buy-1"
      })
    ).toThrow(
      new ContractValidationError(
        "$",
        "buyOrderId and sellOrderId must either both be provided or both be omitted"
      )
    );

    const openApi = generateOpenApiDocument();

    expect(openApi.paths["/demo/status"]).toBeDefined();
    expect(openApi.paths["/pairs/{pairId}/dark-orders"]).toBeDefined();
    expect(openApi.paths["/pairs/{pairId}/match-proposals"]).toBeDefined();
    expect(openApi.paths["/pairs/{pairId}/views/dark-subscriber"]).toBeDefined();
    expect(openApi.components.schemas.DarkSubscriberStateResponse).toBeDefined();
    expect(openApi.components.schemas.SubmitDarkOrderRequest).toBeDefined();
    expect(openApi.components.schemas.GenerateMatchProposalRequest).toBeDefined();
  });
});
