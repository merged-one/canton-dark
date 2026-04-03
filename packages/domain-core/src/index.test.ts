import { describe, expect, it } from "vitest";

import {
  DomainError,
  assertInvariant,
  assertTradingAllowed,
  classifyFactLocation,
  createAccessGrant,
  createDarkOrder,
  createDomainError,
  createExecutionFromQuote,
  createMatchProposal,
  createPairInstance,
  createQuote,
  createRfq,
  evaluateVenueConfiguration,
  getRoleEntitlements,
  hasEntitlement,
  isGrantActive,
  isUserFacingLabelAllowed,
  resolveEntitlements,
  revokeAccessGrant,
  setPairPauseState,
  transitionSettlementStatus,
  type AccessGrant,
  type PairInstance
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

const buildPair = (overrides: Partial<PairInstance> = {}): PairInstance =>
  createPairInstance({
    pairId: "pair-001",
    mode: "SingleDealerPair",
    operatorId: "operator-1",
    dealers: [" dealer-alpha ", "dealer-alpha"],
    createdAt,
    operatorApproval: {
      status: "approved",
      approvedAt: createdAt,
      approvedBy: "operator-1",
      note: " approved "
    },
    regulatoryAttestation: {
      status: "attested",
      attestedAt: createdAt,
      attestedBy: "auditor-1",
      jurisdiction: "US"
    },
    rulebookRelease: {
      releaseId: " rulebook-1 ",
      version: " v1 ",
      effectiveAt: createdAt,
      publishedBy: "operator-1",
      summary: " initial "
    },
    ...(overrides.pauseState !== undefined ? { pauseState: overrides.pauseState } : {}),
    ...overrides
  });

const buildGrant = (overrides: Partial<AccessGrant> = {}): AccessGrant =>
  createAccessGrant({
    grantId: "grant-001",
    pairId: "pair-001",
    subjectId: "subscriber-1",
    role: "subscriber",
    grantedAt: createdAt,
    grantedBy: "operator-1",
    ...(overrides.entitlements !== undefined ? { entitlements: overrides.entitlements } : {}),
    ...(overrides.note !== undefined ? { note: overrides.note } : {}),
    ...overrides
  });

describe("pair and entitlement rules", () => {
  it("creates a valid pair instance with normalized fields and default active pause state", () => {
    expect(buildPair()).toEqual({
      pairId: "pair-001",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      createdAt,
      updatedAt: createdAt,
      operatorApproval: {
        status: "approved",
        approvedAt: createdAt,
        approvedBy: "operator-1",
        note: "approved"
      },
      regulatoryAttestation: {
        status: "attested",
        attestedAt: createdAt,
        attestedBy: "auditor-1",
        jurisdiction: "US"
      },
      rulebookRelease: {
        releaseId: "rulebook-1",
        version: "v1",
        effectiveAt: createdAt,
        publishedBy: "operator-1",
        summary: "initial"
      },
      pauseState: {
        state: "active",
        changedAt: createdAt,
        changedBy: "operator-1"
      }
    });
  });

  it("rejects invalid pair activation inputs", () => {
    expect(() =>
      createPairInstance({
        pairId: " ",
        mode: "SingleDealerPair",
        operatorId: " ",
        dealers: ["dealer-alpha", "dealer-beta"],
        createdAt,
        operatorApproval: {
          status: "rejected",
          approvedAt: createdAt,
          approvedBy: "operator-1"
        },
        regulatoryAttestation: {
          status: "expired",
          attestedAt: createdAt,
          attestedBy: "auditor-1",
          jurisdiction: "US"
        },
        rulebookRelease: {
          releaseId: " ",
          version: " ",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: " "
        }
      })
    ).toThrow(
      expect.objectContaining({
        code: "EMPTY_IDENTIFIER"
      })
    );

    expect(() =>
      createPairInstance({
        pairId: "pair-002",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        createdAt,
        operatorApproval: {
          status: "approved",
          approvedAt: createdAt,
          approvedBy: "operator-1"
        },
        regulatoryAttestation: {
          status: "attested",
          attestedAt: createdAt,
          attestedBy: "auditor-1",
          jurisdiction: "US"
        },
        rulebookRelease: {
          releaseId: "rulebook-2",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        }
      })
    ).toThrow(
      expect.objectContaining({
        code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER"
      })
    );

    expect(() =>
      createPairInstance({
        pairId: "pair-003",
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: [],
        createdAt,
        operatorApproval: {
          status: "approved",
          approvedAt: createdAt,
          approvedBy: "operator-1"
        },
        regulatoryAttestation: {
          status: "attested",
          attestedAt: createdAt,
          attestedBy: "auditor-1",
          jurisdiction: "US"
        },
        rulebookRelease: {
          releaseId: "rulebook-3",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        },
        pauseState: {
          state: "paused",
          changedAt: createdAt,
          changedBy: "operator-1",
          reason: "  "
        }
      })
    ).toThrow(
      expect.objectContaining({
        code: "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER"
      })
    );
    expect(
      createPairInstance({
        pairId: "pair-004",
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        createdAt,
        operatorApproval: {
          status: "approved",
          approvedAt: createdAt,
          approvedBy: "operator-1"
        },
        regulatoryAttestation: {
          status: "attested",
          attestedAt: createdAt,
          attestedBy: "auditor-1",
          jurisdiction: "US"
        },
        rulebookRelease: {
          releaseId: "rulebook-4",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        },
        pauseState: {
          state: "paused",
          changedAt: "2026-04-02T00:01:00.000Z",
          changedBy: "operator-1",
          reason: "manual block"
        }
      }).pauseState
    ).toEqual({
      state: "paused",
      changedAt: "2026-04-02T00:01:00.000Z",
      changedBy: "operator-1",
      reason: "manual block"
    });
  });

  it("creates, revokes, and resolves access entitlements monotonically", () => {
    const operatorGrant = createAccessGrant({
      grantId: "grant-operator",
      pairId: "pair-001",
      subjectId: "operator-1",
      role: "operator",
      grantedAt: createdAt,
      grantedBy: "operator-1",
      note: " bootstrap "
    });
    const extraGrant = buildGrant({
      grantId: "grant-extra",
      entitlements: ["submit_rfq", "view_audit"]
    });
    const revoked = revokeAccessGrant(extraGrant, "2026-04-02T00:01:00.000Z", "operator-1");

    expect(getRoleEntitlements("auditor")).toEqual(["view_audit", "view_pair"]);
    expect(operatorGrant.note).toBe("bootstrap");
    expect(resolveEntitlements("operator-1", [operatorGrant])).toEqual([
      "approve_pair",
      "manage_access",
      "pause_pair",
      "view_audit",
      "view_pair"
    ]);
    expect(resolveEntitlements("subscriber-1", [extraGrant, revoked])).toEqual([
      "submit_dark_order",
      "submit_rfq",
      "view_audit",
      "view_pair"
    ]);
    expect(hasEntitlement("subscriber-1", [extraGrant], "submit_dark_order")).toBe(true);
    expect(hasEntitlement("subscriber-1", [revoked], "submit_dark_order")).toBe(false);
    expect(isGrantActive(extraGrant)).toBe(true);
    expect(isGrantActive(revoked)).toBe(false);
  });

  it("throws typed errors via the invariant helpers", () => {
    const customError = createDomainError("PAIR_OPERATOR_REQUIRED", "operator missing", {
      operatorId: " "
    });
    const bareError = createDomainError("EMPTY_IDENTIFIER", "missing");

    expect(customError).toBeInstanceOf(DomainError);
    expect(customError.context).toEqual({ operatorId: " " });
    expect(bareError.context).toBeUndefined();
    expect(() =>
      assertInvariant(false, "PAIR_OPERATOR_REQUIRED", "operator missing", { operatorId: " " })
    ).toThrow(customError);
  });
});

describe("pause and trading lifecycle rules", () => {
  it("updates pause state and blocks trading while paused", () => {
    const pair = buildPair();
    const pausedPair = setPairPauseState(pair, {
      state: "paused",
      changedAt: "2026-04-02T00:05:00.000Z",
      changedBy: "operator-1",
      reason: "volatile conditions"
    });

    expect(pausedPair.pauseState).toEqual({
      state: "paused",
      changedAt: "2026-04-02T00:05:00.000Z",
      changedBy: "operator-1",
      reason: "volatile conditions"
    });
    expect(pausedPair.updatedAt).toBe("2026-04-02T00:05:00.000Z");
    expect(() => assertTradingAllowed(pausedPair)).toThrow(
      expect.objectContaining({
        code: "PAIR_IS_PAUSED"
      })
    );
    expect(
      setPairPauseState(pausedPair, {
        state: "active",
        changedAt: "2026-04-02T00:06:00.000Z",
        changedBy: "operator-1"
      }).pauseState
    ).toEqual({
      state: "active",
      changedAt: "2026-04-02T00:06:00.000Z",
      changedBy: "operator-1"
    });
    expect(
      buildPair({
        pauseState: {
          state: "active",
          changedAt: "2026-04-02T00:02:00.000Z",
          changedBy: "operator-1"
        }
      }).pauseState
    ).toEqual({
      state: "active",
      changedAt: "2026-04-02T00:02:00.000Z",
      changedBy: "operator-1"
    });
    expect(() =>
      setPairPauseState(pair, {
        state: "paused",
        changedAt: "2026-04-02T00:07:00.000Z",
        changedBy: "operator-1"
      })
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_PAUSE_REASON"
      })
    );
  });

  it("creates RFQs, quotes, executions, dark orders, matches, and settlement transitions", () => {
    const atsPair = buildPair({
      pairId: "pair-ats",
      mode: "ATSPair",
      dealers: ["dealer-alpha", "dealer-beta"]
    });
    const subscriberGrant = buildGrant();
    const dealerGrant = createAccessGrant({
      grantId: "grant-dealer",
      pairId: "pair-ats",
      subjectId: "dealer-alpha",
      role: "dealer",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const rfq = createRfq({
      rfqId: "rfq-001",
      pair: atsPair,
      accessGrants: [subscriberGrant, dealerGrant],
      requesterId: "subscriber-1",
      directedDealerIds: ["dealer-beta", "dealer-alpha"],
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 250,
      createdAt,
      expiresAt: "2026-04-02T00:15:00.000Z"
    });
    const quote = createQuote({
      quoteId: "quote-001",
      pair: atsPair,
      rfq,
      accessGrants: [subscriberGrant, dealerGrant],
      dealerId: "dealer-alpha",
      price: 101.25,
      quantity: 125,
      createdAt,
      expiresAt: "2026-04-02T00:10:00.000Z"
    });
    const execution = createExecutionFromQuote({
      executionId: "execution-001",
      pair: atsPair,
      quote,
      rfq,
      createdAt
    });
    const buyOrder = createDarkOrder({
      orderId: "order-buy",
      pair: atsPair,
      accessGrants: [subscriberGrant],
      participantId: "subscriber-1",
      side: "buy",
      quantity: 100,
      limitPrice: 102,
      createdAt
    });
    const sellSubscriberGrant = createAccessGrant({
      grantId: "grant-subscriber-2",
      pairId: "pair-ats",
      subjectId: "subscriber-2",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const sellOrder = createDarkOrder({
      orderId: "order-sell",
      pair: atsPair,
      accessGrants: [sellSubscriberGrant],
      participantId: "subscriber-2",
      side: "sell",
      quantity: 90,
      limitPrice: 100,
      createdAt
    });
    const match = createMatchProposal({
      proposalId: "proposal-001",
      pair: atsPair,
      buyOrder,
      sellOrder,
      proposedPrice: 101,
      proposedQuantity: 90,
      referencePrice: 100.5,
      createdAt
    });

    expect(rfq.directedDealerIds).toEqual(["dealer-alpha", "dealer-beta"]);
    expect(quote.status).toBe("active");
    expect(execution).toEqual({
      executionId: "execution-001",
      pairId: "pair-ats",
      source: "rfq",
      quoteId: "quote-001",
      quantity: 125,
      price: 101.25,
      buyerId: "subscriber-1",
      sellerId: "dealer-alpha",
      createdAt,
      settlementStatus: "pending"
    });
    expect(
      transitionSettlementStatus(transitionSettlementStatus(execution, "affirmed"), "settled")
        .settlementStatus
    ).toBe("settled");
    expect(transitionSettlementStatus(execution, "pending")).toBe(execution);
    expect(match).toEqual({
      proposalId: "proposal-001",
      pairId: "pair-ats",
      buyOrderId: "order-buy",
      sellOrderId: "order-sell",
      proposedPrice: 101,
      proposedQuantity: 90,
      referencePrice: 100.5,
      createdAt,
      status: "proposed"
    });
  });

  it("rejects invalid trading commands", () => {
    const singleDealerPair = buildPair();
    const atsPair = buildPair({
      pairId: "pair-ats",
      mode: "ATSPair",
      dealers: ["dealer-alpha", "dealer-beta"]
    });
    const subscriberGrant = buildGrant();
    const dealerGrant = createAccessGrant({
      grantId: "grant-dealer",
      pairId: "pair-001",
      subjectId: "dealer-alpha",
      role: "dealer",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const rfq = createRfq({
      rfqId: "rfq-001",
      pair: singleDealerPair,
      accessGrants: [subscriberGrant, dealerGrant],
      requesterId: "subscriber-1",
      directedDealerIds: ["dealer-alpha"],
      instrumentId: "CUSIP-1",
      side: "sell",
      quantity: 100,
      createdAt,
      expiresAt: "2026-04-02T00:10:00.000Z"
    });

    expect(() =>
      createRfq({
        rfqId: "rfq-002",
        pair: singleDealerPair,
        accessGrants: [],
        requesterId: "subscriber-1",
        directedDealerIds: ["dealer-beta"],
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 0,
        createdAt,
        expiresAt: "2026-04-02T00:10:00.000Z"
      })
    ).toThrow(
      expect.objectContaining({
        code: "MISSING_ENTITLEMENT"
      })
    );
    expect(() =>
      createQuote({
        quoteId: "quote-002",
        pair: singleDealerPair,
        rfq,
        accessGrants: [subscriberGrant],
        dealerId: "dealer-beta",
        price: 0,
        quantity: 200,
        createdAt,
        expiresAt: "2026-04-02T00:10:00.000Z"
      })
    ).toThrow(
      expect.objectContaining({
        code: "MISSING_ENTITLEMENT"
      })
    );
    expect(() =>
      createDarkOrder({
        orderId: "order-001",
        pair: singleDealerPair,
        accessGrants: [subscriberGrant],
        participantId: "subscriber-1",
        side: "buy",
        quantity: 10,
        limitPrice: 99,
        createdAt
      })
    ).toThrow(
      expect.objectContaining({
        code: "DARK_ORDER_REQUIRES_ATS_PAIR"
      })
    );
    const buyOrder = createDarkOrder({
      orderId: "order-buy",
      pair: atsPair,
      accessGrants: [subscriberGrant],
      participantId: "subscriber-1",
      side: "buy",
      quantity: 100,
      limitPrice: 101,
      createdAt
    });
    const sellGrant = createAccessGrant({
      grantId: "grant-subscriber-2",
      pairId: "pair-ats",
      subjectId: "subscriber-2",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const badSellOrder = createDarkOrder({
      orderId: "order-sell",
      pair: atsPair,
      accessGrants: [sellGrant],
      participantId: "subscriber-2",
      side: "sell",
      quantity: 100,
      limitPrice: 102,
      createdAt
    });

    expect(() =>
      createMatchProposal({
        proposalId: "proposal-002",
        pair: atsPair,
        buyOrder: { ...buyOrder, side: "sell" },
        sellOrder: badSellOrder,
        proposedPrice: 101.5,
        proposedQuantity: 100,
        referencePrice: -1,
        createdAt
      })
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_MATCH_SIDES"
      })
    );
    expect(() =>
      transitionSettlementStatus(
        createExecutionFromQuote({
          executionId: "execution-002",
          pair: singleDealerPair,
          quote: {
            quoteId: "quote-001",
            rfqId: rfq.rfqId,
            pairId: singleDealerPair.pairId,
            dealerId: "dealer-alpha",
            price: 100,
            quantity: 10,
            createdAt,
            expiresAt: "2026-04-02T00:10:00.000Z",
            status: "active"
          },
          rfq,
          createdAt
        }),
        "settled"
      )
    ).toThrow(
      expect.objectContaining({
        code: "INVALID_SETTLEMENT_TRANSITION"
      })
    );
  });
});

describe("configuration compatibility helpers", () => {
  it("evaluates venue configuration drafts and user-facing labels", () => {
    expect(
      evaluateVenueConfiguration({
        mode: "SingleDealerPair",
        operatorId: " operator-1 ",
        dealers: [" dealer-alpha ", "dealer-alpha"],
        marketingLabel: "Canton Dark Pair"
      })
    ).toEqual({
      isValid: true,
      normalized: {
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        marketingLabel: "Canton Dark Pair"
      },
      violations: []
    });
    expect(
      evaluateVenueConfiguration({
        mode: "ATSPair",
        operatorId: " ",
        dealers: [],
        marketingLabel: "Operator stock market mirror"
      }).violations
    ).toEqual([
      {
        code: "OPERATOR_ID_REQUIRED",
        message: "Each venue configuration must identify the owning operator."
      },
      {
        code: "DISALLOWED_USER_FACING_TERM",
        message: "User-facing labels must avoid the terms 'exchange' and 'stock market'."
      },
      {
        code: "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER",
        message: "ATSPair venues must configure at least one directed dealer."
      }
    ]);
    expect(
      evaluateVenueConfiguration({
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        marketingLabel: "Canton Dark Pair"
      }).violations
    ).toContainEqual({
      code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      message: "SingleDealerPair venues must configure exactly one dealer."
    });
    expect(isUserFacingLabelAllowed("Canton Dark Pair")).toBe(true);
    expect(isUserFacingLabelAllowed("dealer exchange console")).toBe(false);
  });

  it("classifies shared facts on-ledger and local state off-ledger", () => {
    expect(classifyFactLocation("shared-rfq-state")).toBe("on-ledger");
    expect(classifyFactLocation("shared-execution-state")).toBe("on-ledger");
    expect(classifyFactLocation("local-analytics")).toBe("off-ledger");
    expect(classifyFactLocation("query-cache")).toBe("off-ledger");
    expect(classifyFactLocation("telemetry-projection")).toBe("off-ledger");
    expect(classifyFactLocation("ui-state")).toBe("off-ledger");
  });
});
