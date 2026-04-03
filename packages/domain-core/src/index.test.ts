import { describe, expect, it } from "vitest";

import {
  DomainError,
  acceptDealerQuote,
  assertInvariant,
  assertPairActive,
  cancelRfqSession,
  createAccessGrant,
  createDealerQuote,
  createDomainError,
  createPairInstance,
  createRfqSession,
  expireDealerQuote,
  getRoleEntitlements,
  hasEntitlement,
  isGrantActive,
  markRfqQuoteExpired,
  markRfqQuoted,
  progressSettlementInstruction,
  rejectRfqSession,
  resolveEntitlements,
  revokeAccessGrant,
  setPairPauseState,
  type AccessGrant,
  type DealerQuote,
  type PairInstance,
  type RFQSession,
  type SettlementInstruction
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

const buildPair = (overrides: Partial<PairInstance> = {}): PairInstance =>
  createPairInstance({
    pairId: "pair-001",
    mode: "SingleDealerPair",
    operatorId: "operator-1",
    dealerId: " dealer-alpha ",
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

const buildRfq = (overrides: Partial<RFQSession> = {}): RFQSession => ({
  rfqId: "rfq-001",
  pairId: "pair-001",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-1",
  side: "buy",
  quantity: 25,
  createdAt,
  updatedAt: createdAt,
  status: "open",
  ...overrides
});

const buildQuote = (overrides: Partial<DealerQuote> = {}): DealerQuote => ({
  quoteId: "quote-001",
  pairId: "pair-001",
  rfqId: "rfq-001",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  price: 101.25,
  quantity: 25,
  createdAt,
  expiresAt: "2026-04-02T00:05:00.000Z",
  updatedAt: createdAt,
  status: "open",
  ...overrides
});

describe("phase 1 domain-core rules", () => {
  it("constructs domain errors and invariant helpers with optional context", () => {
    const withContext = createDomainError("EMPTY_IDENTIFIER", "boom", { field: "pairId" });
    const withoutContext = createDomainError("EMPTY_IDENTIFIER", "boom");

    expect(withContext).toBeInstanceOf(DomainError);
    expect(withContext.context).toEqual({ field: "pairId" });
    expect(withoutContext.context).toBeUndefined();
    expect(() => assertInvariant(false, "EMPTY_IDENTIFIER", "broken")).toThrow(
      expect.objectContaining({
        code: "EMPTY_IDENTIFIER"
      })
    );
    expect(() => assertInvariant(true, "EMPTY_IDENTIFIER", "ok")).not.toThrow();
  });

  it("creates a valid pair instance with normalized fields and pause state branches", () => {
    expect(buildPair()).toEqual({
      pairId: "pair-001",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
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

    expect(
      buildPair({
        pauseState: {
          state: "paused",
          changedAt: "2026-04-02T00:01:00.000Z",
          changedBy: "operator-1",
          reason: "manual hold"
        }
      }).pauseState
    ).toEqual({
      state: "paused",
      changedAt: "2026-04-02T00:01:00.000Z",
      changedBy: "operator-1",
      reason: "manual hold"
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
  });

  it("rejects invalid pair activation inputs", () => {
    expect(() =>
      createPairInstance({
        pairId: " ",
        mode: "SingleDealerPair",
        operatorId: " ",
        dealerId: " ",
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
          releaseId: "rulebook-1",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        }
      })
    ).toThrow(expect.objectContaining({ code: "EMPTY_IDENTIFIER" }));

    expect(() =>
      createPairInstance({
        pairId: "pair-002",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "",
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
    ).toThrow(expect.objectContaining({ code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER" }));

    expect(() =>
      createPairInstance({
        pairId: "pair-003",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        createdAt,
        operatorApproval: {
          status: "rejected",
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
        }
      })
    ).toThrow(expect.objectContaining({ code: "PAIR_APPROVAL_REQUIRED" }));

    expect(() =>
      createPairInstance({
        pairId: "pair-004",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        createdAt,
        operatorApproval: {
          status: "approved",
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
          releaseId: "rulebook-4",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        }
      })
    ).toThrow(expect.objectContaining({ code: "PAIR_REGULATORY_ATTESTATION_REQUIRED" }));

    expect(() =>
      createPairInstance({
        pairId: "pair-005",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
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
          releaseId: " ",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        },
        pauseState: {
          state: "paused",
          changedAt: createdAt,
          changedBy: "operator-1",
          reason: " "
        }
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_RULEBOOK_RELEASE" }));
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
    const subscriberGrant = buildGrant();
    const delegatedSettlementGrant = createAccessGrant({
      grantId: "grant-settlement",
      pairId: "pair-001",
      subjectId: "subscriber-1",
      role: "settlement_delegate",
      grantedAt: createdAt,
      grantedBy: "operator-1",
      entitlements: ["view_audit"]
    });
    const revokedSettlementGrant = revokeAccessGrant(
      delegatedSettlementGrant,
      "2026-04-02T00:02:00.000Z",
      "operator-1"
    );

    expect(operatorGrant.note).toBe("bootstrap");
    expect(getRoleEntitlements("subscriber")).toEqual(["accept_quote", "submit_rfq", "view_pair"]);
    expect(buildGrant({ note: "" }).note).toBeUndefined();
    expect(isGrantActive(revokedSettlementGrant)).toBe(false);
    expect(
      resolveEntitlements("subscriber-1", [subscriberGrant, delegatedSettlementGrant])
    ).toEqual(["accept_quote", "progress_settlement", "submit_rfq", "view_audit", "view_pair"]);
    expect(resolveEntitlements("subscriber-1", [subscriberGrant, revokedSettlementGrant])).toEqual([
      "accept_quote",
      "submit_rfq",
      "view_pair"
    ]);
    expect(hasEntitlement("subscriber-1", [subscriberGrant], "submit_rfq")).toBe(true);
    expect(hasEntitlement("subscriber-1", [subscriberGrant], "respond_quote")).toBe(false);
  });

  it("updates pair pause state and blocks trading while paused", () => {
    const pair = buildPair();
    const paused = setPairPauseState(pair, {
      state: "paused",
      changedAt: "2026-04-02T00:03:00.000Z",
      changedBy: "operator-1",
      reason: "manual review"
    });
    const reactivated = setPairPauseState(paused, {
      state: "active",
      changedAt: "2026-04-02T00:04:00.000Z",
      changedBy: "operator-1"
    });

    expect(paused.pauseState).toEqual({
      state: "paused",
      changedAt: "2026-04-02T00:03:00.000Z",
      changedBy: "operator-1",
      reason: "manual review"
    });
    expect(reactivated.pauseState).toEqual({
      state: "active",
      changedAt: "2026-04-02T00:04:00.000Z",
      changedBy: "operator-1"
    });
    expect(() =>
      setPairPauseState(pair, {
        state: "paused",
        changedAt: "2026-04-02T00:03:00.000Z",
        changedBy: "operator-1",
        reason: " "
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_PAUSE_REASON" }));
    expect(() =>
      setPairPauseState(pair, {
        state: "paused",
        changedAt: "2026-04-02T00:03:00.000Z",
        changedBy: "operator-1"
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_PAUSE_REASON" }));
    expect(() => assertPairActive(paused)).toThrow(
      expect.objectContaining({ code: "PAIR_IS_PAUSED" })
    );
    expect(() => assertPairActive(reactivated)).not.toThrow();
  });

  it("opens RFQ sessions only for entitled subscribers", () => {
    const pair = buildPair();
    const subscriberGrant = buildGrant();

    expect(
      createRfqSession({
        rfqId: "rfq-001",
        pair,
        accessGrants: [subscriberGrant],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 25,
        createdAt
      })
    ).toEqual({
      rfqId: "rfq-001",
      pairId: "pair-001",
      dealerId: "dealer-alpha",
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 25,
      createdAt,
      updatedAt: createdAt,
      status: "open"
    });

    expect(() =>
      createRfqSession({
        rfqId: "rfq-002",
        pair,
        accessGrants: [],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-1",
        side: "sell",
        quantity: 25,
        createdAt
      })
    ).toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    expect(() =>
      createRfqSession({
        rfqId: "rfq-003",
        pair: buildPair({
          pauseState: {
            state: "paused",
            changedAt: createdAt,
            changedBy: "operator-1",
            reason: "halt"
          }
        }),
        accessGrants: [subscriberGrant],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 25,
        createdAt
      })
    ).toThrow(expect.objectContaining({ code: "PAIR_IS_PAUSED" }));
    expect(() =>
      createRfqSession({
        rfqId: "rfq-004",
        pair,
        accessGrants: [subscriberGrant],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 0,
        createdAt
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_RFQ_QUANTITY" }));
  });

  it("cancels and rejects RFQs idempotently while blocking invalid transitions", () => {
    const cancelled = cancelRfqSession(buildRfq(), "2026-04-02T00:01:00.000Z", "subscriber-1");
    const rejected = rejectRfqSession({
      rfq: buildRfq(),
      rejectedAt: "2026-04-02T00:01:00.000Z",
      rejectedBy: "dealer-alpha",
      reason: " risk "
    });

    expect(cancelled).toEqual({
      ...buildRfq(),
      status: "cancelled",
      updatedAt: "2026-04-02T00:01:00.000Z",
      cancelledAt: "2026-04-02T00:01:00.000Z",
      cancelledBy: "subscriber-1"
    });
    expect(cancelRfqSession(cancelled, "2026-04-02T00:02:00.000Z", "subscriber-1")).toBe(cancelled);
    expect(rejected).toEqual({
      ...buildRfq(),
      status: "rejected",
      updatedAt: "2026-04-02T00:01:00.000Z",
      rejectedAt: "2026-04-02T00:01:00.000Z",
      rejectedBy: "dealer-alpha",
      rejectionReason: "risk"
    });
    expect(
      rejectRfqSession({
        rfq: buildRfq({ rfqId: "rfq-002" }),
        rejectedAt: "2026-04-02T00:01:00.000Z",
        rejectedBy: "dealer-alpha"
      })
    ).toEqual({
      ...buildRfq({ rfqId: "rfq-002" }),
      status: "rejected",
      updatedAt: "2026-04-02T00:01:00.000Z",
      rejectedAt: "2026-04-02T00:01:00.000Z",
      rejectedBy: "dealer-alpha"
    });
    expect(
      rejectRfqSession({
        rfq: rejected,
        rejectedAt: "2026-04-02T00:02:00.000Z",
        rejectedBy: "dealer-alpha"
      })
    ).toBe(rejected);
    expect(() =>
      cancelRfqSession(buildRfq({ status: "accepted" }), "2026-04-02T00:01:00.000Z", "subscriber-1")
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));
    expect(() =>
      rejectRfqSession({
        rfq: buildRfq({ status: "quoted" }),
        rejectedAt: "2026-04-02T00:01:00.000Z",
        rejectedBy: "dealer-alpha"
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));
    expect(() =>
      rejectRfqSession({
        rfq: buildRfq(),
        rejectedAt: "2026-04-02T00:01:00.000Z",
        rejectedBy: "dealer-beta"
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_DEALER_MISMATCH" }));
  });

  it("tracks RFQ quoted and quote-expired transitions idempotently", () => {
    const quoted = markRfqQuoted(buildRfq(), "2026-04-02T00:01:00.000Z");
    const quoteExpired = markRfqQuoteExpired(quoted, "2026-04-02T00:05:00.000Z");

    expect(quoted).toEqual({
      ...buildRfq(),
      status: "quoted",
      updatedAt: "2026-04-02T00:01:00.000Z"
    });
    expect(markRfqQuoted(quoted, "2026-04-02T00:02:00.000Z")).toBe(quoted);
    expect(quoteExpired).toEqual({
      ...quoted,
      status: "quote_expired",
      updatedAt: "2026-04-02T00:05:00.000Z"
    });
    expect(markRfqQuoteExpired(quoteExpired, "2026-04-02T00:06:00.000Z")).toBe(quoteExpired);
    expect(() =>
      markRfqQuoted(buildRfq({ status: "cancelled" }), "2026-04-02T00:01:00.000Z")
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));
    expect(() =>
      markRfqQuoteExpired(buildRfq({ status: "open" }), "2026-04-02T00:05:00.000Z")
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));
  });

  it("creates dealer quotes with the single bound dealer and validates quote inputs", () => {
    const pair = buildPair();
    const rfq = buildRfq();
    const dealerGrant = createAccessGrant({
      grantId: "grant-dealer",
      pairId: pair.pairId,
      subjectId: "dealer-alpha",
      role: "dealer",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const wrongDealerGrant = createAccessGrant({
      grantId: "grant-dealer-beta",
      pairId: pair.pairId,
      subjectId: "dealer-beta",
      role: "dealer",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });

    expect(
      createDealerQuote({
        quoteId: "quote-001",
        pair,
        rfq,
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toEqual(buildQuote());

    expect(() =>
      createDealerQuote({
        quoteId: "quote-002",
        pair,
        rfq,
        accessGrants: [],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-003",
        pair,
        rfq: buildRfq({ status: "quoted" }),
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-004",
        pair,
        rfq,
        accessGrants: [wrongDealerGrant],
        dealerId: "dealer-beta",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_DEALER_MISMATCH" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-005",
        pair,
        rfq,
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 0,
        quantity: 25,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_QUOTE_PRICE" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-006",
        pair,
        rfq,
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 30,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_QUOTE_QUANTITY" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-007",
        pair: buildPair({
          pauseState: {
            state: "paused",
            changedAt: createdAt,
            changedBy: "operator-1",
            reason: "halt"
          }
        }),
        rfq,
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "PAIR_IS_PAUSED" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-008",
        pair,
        rfq,
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: "invalid"
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_QUOTE_EXPIRY" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-009",
        pair,
        rfq,
        accessGrants: [dealerGrant],
        dealerId: "dealer-alpha",
        price: 101.25,
        quantity: 25,
        createdAt,
        expiresAt: createdAt
      })
    ).toThrow(expect.objectContaining({ code: "INVALID_QUOTE_EXPIRY" }));
  });

  it("expires quotes deterministically and preserves accepted/expired records", () => {
    const quote = buildQuote();
    const expired = expireDealerQuote(quote, "2026-04-02T00:05:00.000Z");

    expect(expireDealerQuote(quote, "2026-04-02T00:04:59.000Z")).toBe(quote);
    expect(expired).toEqual({
      ...quote,
      status: "expired",
      updatedAt: "2026-04-02T00:05:00.000Z"
    });
    expect(expireDealerQuote(expired, "2026-04-02T00:06:00.000Z")).toBe(expired);
    expect(
      expireDealerQuote(
        buildQuote({
          status: "accepted",
          acceptedAt: "2026-04-02T00:03:00.000Z",
          acceptedBy: "subscriber-1"
        }),
        "2026-04-02T00:06:00.000Z"
      )
    ).toEqual(
      buildQuote({
        status: "accepted",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        acceptedBy: "subscriber-1"
      })
    );
  });

  it("accepts dealer quotes before expiry exactly once and creates execution artifacts", () => {
    const pair = buildPair();
    const subscriberGrant = buildGrant();
    const rfq = buildRfq({ status: "quoted", updatedAt: "2026-04-02T00:01:00.000Z" });
    const quote = buildQuote();

    expect(
      acceptDealerQuote({
        pair,
        rfq,
        quote,
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toEqual({
      rfq: {
        ...rfq,
        status: "accepted",
        acceptedQuoteId: "quote-001",
        updatedAt: "2026-04-02T00:03:00.000Z"
      },
      quote: {
        ...quote,
        status: "accepted",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        acceptedBy: "subscriber-1",
        updatedAt: "2026-04-02T00:03:00.000Z"
      },
      executionTicket: {
        executionId: "execution-1",
        pairId: "pair-001",
        rfqId: "rfq-001",
        quoteId: "quote-001",
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 25,
        price: 101.25,
        acceptedAt: "2026-04-02T00:03:00.000Z"
      },
      settlementInstruction: {
        instructionId: "instruction-1",
        pairId: "pair-001",
        executionId: "execution-1",
        status: "pending",
        createdAt: "2026-04-02T00:03:00.000Z",
        updatedAt: "2026-04-02T00:03:00.000Z"
      }
    });

    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote,
        accessGrants: [],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote,
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-2",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote: buildQuote({ status: "accepted", acceptedAt: "2026-04-02T00:02:00.000Z" }),
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_ALREADY_ACCEPTED" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq: buildRfq({
          status: "accepted",
          acceptedQuoteId: "quote-001",
          updatedAt: "2026-04-02T00:02:00.000Z"
        }),
        quote,
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_ALREADY_ACCEPTED" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote: buildQuote({ status: "expired" }),
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_NOT_OPEN" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq: buildRfq(),
        quote,
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote,
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:05:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_EXPIRED" }));
    expect(() =>
      acceptDealerQuote({
        pair: buildPair({
          pauseState: {
            state: "paused",
            changedAt: createdAt,
            changedBy: "operator-1",
            reason: "halt"
          }
        }),
        rfq,
        quote,
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:03:00.000Z",
        executionId: "execution-1",
        instructionId: "instruction-1"
      })
    ).toThrow(expect.objectContaining({ code: "PAIR_IS_PAUSED" }));
  });

  it("progresses settlement instructions through the allowed lifecycle", () => {
    const instruction: SettlementInstruction = {
      instructionId: "instruction-1",
      executionId: "execution-1",
      pairId: "pair-001",
      status: "pending",
      createdAt,
      updatedAt: createdAt
    };
    const affirmed = progressSettlementInstruction(
      instruction,
      "affirmed",
      "2026-04-02T00:10:00.000Z"
    );
    const instructed = progressSettlementInstruction(
      affirmed,
      "instructed",
      "2026-04-02T00:20:00.000Z"
    );

    expect(progressSettlementInstruction(instruction, "pending", "2026-04-02T00:10:00.000Z")).toBe(
      instruction
    );
    expect(affirmed).toEqual({
      ...instruction,
      status: "affirmed",
      updatedAt: "2026-04-02T00:10:00.000Z"
    });
    expect(instructed).toEqual({
      ...affirmed,
      status: "instructed",
      updatedAt: "2026-04-02T00:20:00.000Z"
    });
    expect(
      progressSettlementInstruction(instructed, "settled", "2026-04-02T00:30:00.000Z")
    ).toEqual({
      ...instructed,
      status: "settled",
      updatedAt: "2026-04-02T00:30:00.000Z"
    });
    expect(() =>
      progressSettlementInstruction(instruction, "settled", "2026-04-02T00:10:00.000Z")
    ).toThrow(expect.objectContaining({ code: "INVALID_SETTLEMENT_TRANSITION" }));
  });
});
