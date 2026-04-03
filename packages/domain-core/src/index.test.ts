import { describe, expect, it } from "vitest";

import {
  DomainError,
  acceptDealerQuote,
  acceptMatchProposal,
  assertInvariant,
  assertPairActive,
  canDarkOrdersCross,
  cancelDarkOrder,
  cancelRfqSession,
  compareDarkOrderPriority,
  compareQuotePriority,
  createAccessGrant,
  createDealerInvitations,
  createDealerQuote,
  createDarkOrder,
  createDomainError,
  createMatchProposal,
  createPairInstance,
  createRfqSession,
  executeDarkMatch,
  expireDealerInvitation,
  expireDealerQuote,
  expireDarkOrder,
  expireMatchProposal,
  getRoleEntitlements,
  hasEntitlement,
  hasActiveOrderLock,
  isGrantActive,
  isOrderLockActive,
  listPairDealerIds,
  markDealerInvitationResponded,
  markRfqQuoteExpired,
  markRfqQuoted,
  progressSettlementInstruction,
  rankComparableQuotes,
  rejectMatchProposal,
  rejectAllQuotes,
  rejectRfqSession,
  releaseOrderLock,
  resolveRfqInvitedDealerIds,
  resolveDarkCrossPrice,
  resolveEntitlements,
  reviseDealerQuote,
  revokeAccessGrant,
  setPairPauseState,
  synchronizeDarkCrossLifecycle,
  synchronizeRfqLifecycle,
  withdrawDealerQuote,
  type AccessGrant,
  type DealerInvitation,
  type DealerQuote,
  type DarkOrder,
  type MatchProposal,
  type OrderLock,
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

const buildAtsPair = (overrides: Partial<PairInstance> = {}): PairInstance =>
  createPairInstance({
    pairId: "pair-ats-001",
    mode: "ATSPair",
    operatorId: "operator-1",
    dealerIds: ["dealer-alpha", "dealer-beta"],
    operatorOversightRole: "blinded",
    inviteRevisionPolicy: "before_first_response",
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
      releaseId: "rulebook-ats-1",
      version: "v1",
      effectiveAt: createdAt,
      publishedBy: "operator-1",
      summary: "initial"
    },
    ...overrides
  });

const buildAtsRfq = (overrides: Partial<RFQSession> = {}): RFQSession => ({
  rfqId: "rfq-ats-001",
  pairId: "pair-ats-001",
  dealerId: "dealer-alpha",
  invitedDealerIds: ["dealer-alpha", "dealer-beta"],
  currentInvitationVersion: 1,
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-ATS-1",
  side: "buy",
  quantity: 20,
  createdAt,
  updatedAt: createdAt,
  responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
  status: "open",
  ...overrides
});

const buildAtsInvitation = (overrides: Partial<DealerInvitation> = {}): DealerInvitation => ({
  invitationId: "rfq-ats-001:dealer-alpha:1",
  pairId: "pair-ats-001",
  rfqId: "rfq-ats-001",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  invitationVersion: 1,
  invitedAt: createdAt,
  invitedBy: "subscriber-1",
  responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
  updatedAt: createdAt,
  status: "open",
  ...overrides
});

const buildAtsGrants = (pairId = "pair-ats-001"): readonly AccessGrant[] => [
  createAccessGrant({
    grantId: "grant-ats-subscriber",
    pairId,
    subjectId: "subscriber-1",
    role: "subscriber",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  }),
  createAccessGrant({
    grantId: "grant-ats-alpha",
    pairId,
    subjectId: "dealer-alpha",
    role: "dealer",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  }),
  createAccessGrant({
    grantId: "grant-ats-beta",
    pairId,
    subjectId: "dealer-beta",
    role: "dealer",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  })
];

const buildDarkOrder = (overrides: Partial<DarkOrder> = {}): DarkOrder => ({
  orderId: "dark-order-001",
  clientOrderId: "client-order-001",
  pairId: "pair-ats-001",
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-DARK-1",
  side: "buy",
  quantity: 50,
  limitPrice: 101.5,
  createdAt,
  updatedAt: createdAt,
  status: "open",
  expiresAt: "2026-04-02T00:10:00.000Z",
  ...overrides
});

const buildOrderLock = (overrides: Partial<OrderLock> = {}): OrderLock => ({
  lockId: "lock-001",
  pairId: "pair-ats-001",
  orderId: "dark-order-001",
  proposalId: "proposal-001",
  subscriberId: "subscriber-1",
  lockedAt: "2026-04-02T00:02:00.000Z",
  lockedBy: "operator-1",
  lockExpiresAt: "2026-04-02T00:03:00.000Z",
  updatedAt: "2026-04-02T00:02:00.000Z",
  status: "active",
  ...overrides
});

const buildMatchProposal = (overrides: Partial<MatchProposal> = {}): MatchProposal => ({
  proposalId: "proposal-001",
  pairId: "pair-ats-001",
  instrumentId: "CUSIP-DARK-1",
  quantity: 50,
  price: 101,
  buyOrderId: "dark-order-001",
  sellOrderId: "dark-order-002",
  buySubscriberId: "subscriber-1",
  sellSubscriberId: "subscriber-2",
  buyLockId: "lock-001",
  sellLockId: "lock-002",
  buyResponse: "pending",
  sellResponse: "pending",
  createdAt: "2026-04-02T00:02:00.000Z",
  createdBy: "operator-1",
  expiresAt: "2026-04-02T00:03:00.000Z",
  updatedAt: "2026-04-02T00:02:00.000Z",
  status: "pending",
  ...overrides
});

const buildDarkGrants = (pairId = "pair-ats-001"): readonly AccessGrant[] => [
  createAccessGrant({
    grantId: "dark-subscriber-1",
    pairId,
    subjectId: "subscriber-1",
    role: "subscriber",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  }),
  createAccessGrant({
    grantId: "dark-subscriber-2",
    pairId,
    subjectId: "subscriber-2",
    role: "subscriber",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  }),
  createAccessGrant({
    grantId: "dark-operator",
    pairId,
    subjectId: "operator-1",
    role: "operator",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  }),
  createAccessGrant({
    grantId: "dark-settlement",
    pairId,
    subjectId: "settler-1",
    role: "settlement_delegate",
    grantedAt: createdAt,
    grantedBy: "operator-1"
  })
];

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
      dealerIds: ["dealer-alpha"],
      operatorOversightRole: "full",
      inviteRevisionPolicy: "locked",
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
      invitedDealerIds: ["dealer-alpha"],
      currentInvitationVersion: 1,
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
      firstResponseAt: "2026-04-02T00:01:00.000Z",
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
    expect(markRfqQuoteExpired(buildRfq({ status: "open" }), "2026-04-02T00:05:00.000Z")).toEqual({
      ...buildRfq({ status: "open" }),
      status: "quote_expired",
      updatedAt: "2026-04-02T00:05:00.000Z"
    });
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
    ).toThrow(expect.objectContaining({ code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER" }));
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
      },
      staleQuotes: []
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

  it("locks the ATSPair invite set after the first response, including responded dealers", () => {
    const pair = createPairInstance({
      pairId: "pair-ats-1",
      mode: "ATSPair",
      operatorId: "operator-1",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "blinded",
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
        releaseId: "rulebook-ats-1",
        version: "v1",
        effectiveAt: createdAt,
        publishedBy: "operator-1",
        summary: "initial"
      }
    });
    const subscriberGrant = createAccessGrant({
      grantId: "grant-subscriber-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const dealerGrants = pair.dealerIds.map((dealerId, index) =>
      createAccessGrant({
        grantId: `grant-ats-dealer-${index}`,
        pairId: pair.pairId,
        subjectId: dealerId,
        role: "dealer",
        grantedAt: createdAt,
        grantedBy: "operator-1"
      })
    );
    const rfq = createRfqSession({
      rfqId: "rfq-ats-1",
      pair,
      accessGrants: [subscriberGrant],
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-ATS-1",
      side: "buy",
      quantity: 10,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      createdAt
    });
    const invited = createDealerInvitations({
      accessGrants: [...dealerGrants, subscriberGrant],
      createdAt: "2026-04-02T00:01:00.000Z",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      invitations: [],
      invitedBy: "subscriber-1",
      pair,
      rfq
    });
    const respondedInvitations = invited.invitations.map((invitation) =>
      invitation.dealerId === "dealer-beta"
        ? markDealerInvitationResponded(invitation, "2026-04-02T00:02:00.000Z", "quote-1")
        : invitation
    );

    expect(() =>
      createDealerInvitations({
        accessGrants: [...dealerGrants, subscriberGrant],
        createdAt: "2026-04-02T00:03:00.000Z",
        dealerIds: ["dealer-alpha"],
        invitations: respondedInvitations,
        invitedBy: "subscriber-1",
        pair,
        rfq: {
          ...invited.rfq,
          firstResponseAt: "2026-04-02T00:02:00.000Z",
          status: "quoted",
          updatedAt: "2026-04-02T00:02:00.000Z"
        }
      })
    ).toThrow(expect.objectContaining({ code: "INVITE_SET_LOCKED" }));
  });

  it("covers ATSPair invitation management and quote lineage branches", () => {
    const pair = buildAtsPair();
    const grants = buildAtsGrants(pair.pairId);
    const subscriberGrant = grants[0];

    if (subscriberGrant === undefined) {
      throw new Error("Expected ATS subscriber grant.");
    }

    const rfq = createRfqSession({
      rfqId: "rfq-ats-001",
      pair,
      accessGrants: [subscriberGrant],
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-ATS-1",
      side: "buy",
      quantity: 20,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      createdAt
    });

    expect(listPairDealerIds(pair)).toEqual(["dealer-alpha", "dealer-beta"]);
    const rfqWithoutInvitedDealerIds = { ...rfq };

    delete rfqWithoutInvitedDealerIds.invitedDealerIds;

    expect(resolveRfqInvitedDealerIds(rfqWithoutInvitedDealerIds)).toEqual(["dealer-alpha"]);
    expect(resolveRfqInvitedDealerIds(buildAtsRfq())).toEqual(["dealer-alpha", "dealer-beta"]);

    const invited = createDealerInvitations({
      accessGrants: grants,
      createdAt: "2026-04-02T00:01:00.000Z",
      dealerIds: ["dealer-beta", "dealer-alpha", "dealer-alpha"],
      invitations: [],
      invitedBy: "subscriber-1",
      pair,
      rfq
    });

    expect(invited.rfq.currentInvitationVersion).toBe(1);
    expect(invited.invitations.map((invitation) => invitation.dealerId)).toEqual([
      "dealer-alpha",
      "dealer-beta"
    ]);

    const sameInviteSet = createDealerInvitations({
      accessGrants: grants,
      createdAt: "2026-04-02T00:01:30.000Z",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      invitations: invited.invitations,
      invitedBy: "subscriber-1",
      pair,
      rfq: invited.rfq
    });

    expect(sameInviteSet).toEqual({
      rfq: {
        ...invited.rfq,
        invitedDealerIds: ["dealer-alpha", "dealer-beta"],
        currentInvitationVersion: 1
      },
      invitations: invited.invitations
    });

    const revisedInviteSet = createDealerInvitations({
      accessGrants: grants,
      createdAt: "2026-04-02T00:02:00.000Z",
      dealerIds: ["dealer-beta"],
      invitations: invited.invitations,
      invitedBy: "subscriber-1",
      pair,
      rfq: invited.rfq
    });

    expect(revisedInviteSet.rfq.currentInvitationVersion).toBe(2);
    expect(
      revisedInviteSet.invitations.find((invitation) => invitation.dealerId === "dealer-alpha")
    ).toMatchObject({
      status: "withdrawn",
      withdrawnAt: "2026-04-02T00:02:00.000Z",
      withdrawnBy: "subscriber-1",
      withdrawalReason: "Removed from directed invite set."
    });
    expect(
      revisedInviteSet.invitations.find((invitation) => invitation.dealerId === "dealer-beta")
    ).toMatchObject({
      status: "open"
    });

    const betaInvitation =
      revisedInviteSet.invitations.find((invitation) => invitation.dealerId === "dealer-beta") ??
      buildAtsInvitation({ dealerId: "dealer-beta", invitationId: "rfq-ats-001:dealer-beta:2" });

    expect(expireDealerInvitation(betaInvitation, "2026-04-02T00:05:00.000Z")).toEqual(
      betaInvitation
    );
    expect(expireDealerInvitation(betaInvitation, "2026-04-02T00:11:00.000Z")).toMatchObject({
      status: "expired",
      updatedAt: "2026-04-02T00:11:00.000Z"
    });
    expect(
      markDealerInvitationResponded(betaInvitation, "2026-04-02T00:03:00.000Z", "quote-beta-1")
    ).toMatchObject({
      status: "responded",
      respondedAt: "2026-04-02T00:03:00.000Z",
      firstQuoteId: "quote-beta-1"
    });
    expect(
      markDealerInvitationResponded(
        { ...betaInvitation, status: "responded", respondedAt: "2026-04-02T00:03:00.000Z" },
        "2026-04-02T00:03:30.000Z"
      )
    ).toEqual({
      ...betaInvitation,
      status: "responded",
      respondedAt: "2026-04-02T00:03:00.000Z"
    });
    expect(() =>
      markDealerInvitationResponded(
        { ...betaInvitation, status: "withdrawn", withdrawnAt: "2026-04-02T00:02:00.000Z" },
        "2026-04-02T00:03:30.000Z"
      )
    ).toThrow(expect.objectContaining({ code: "INVITATION_NOT_OPEN" }));

    const atsQuotedRfq = { ...invited.rfq, status: "quoted" as const };
    const alphaQuote = createDealerQuote({
      quoteId: "quote-alpha-1",
      pair,
      rfq: atsQuotedRfq,
      accessGrants: grants,
      dealerId: "dealer-alpha",
      price: 99.5,
      quantity: 20,
      createdAt: "2026-04-02T00:03:00.000Z",
      expiresAt: "2026-04-02T00:20:00.000Z",
      invitations: invited.invitations
    });

    expect(alphaQuote.status).toBe("open");
    expect(() =>
      createDealerQuote({
        quoteId: "quote-alpha-duplicate",
        pair,
        rfq: atsQuotedRfq,
        accessGrants: grants,
        dealerId: "dealer-alpha",
        price: 99.4,
        quantity: 20,
        createdAt: "2026-04-02T00:03:30.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: invited.invitations,
        existingQuotes: [alphaQuote]
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_NOT_CURRENT" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-alpha-expired-window",
        pair,
        rfq: atsQuotedRfq,
        accessGrants: grants,
        dealerId: "dealer-alpha",
        price: 99.4,
        quantity: 20,
        createdAt: "2026-04-02T00:11:00.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: invited.invitations
      })
    ).toThrow(expect.objectContaining({ code: "RESPONSE_WINDOW_EXPIRED" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-alpha-no-invite",
        pair,
        rfq: atsQuotedRfq,
        accessGrants: grants,
        dealerId: "dealer-alpha",
        price: 99.4,
        quantity: 20,
        createdAt: "2026-04-02T00:03:30.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: [buildAtsInvitation({ dealerId: "dealer-beta", invitationId: "beta-only" })]
      })
    ).toThrow(expect.objectContaining({ code: "INVITATION_REQUIRED" }));
    expect(() =>
      createDealerQuote({
        quoteId: "quote-alpha-closed",
        pair,
        rfq: { ...atsQuotedRfq, status: "accepted" },
        accessGrants: grants,
        dealerId: "dealer-alpha",
        price: 99.4,
        quantity: 20,
        createdAt: "2026-04-02T00:03:30.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: invited.invitations
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));

    const revisedQuote = reviseDealerQuote({
      accessGrants: grants,
      createdAt: "2026-04-02T00:04:00.000Z",
      dealerId: "dealer-alpha",
      existingQuotes: [alphaQuote],
      expiresAt: "2026-04-02T00:20:00.000Z",
      invitations: invited.invitations,
      pair,
      price: 99.25,
      quantity: 20,
      quote: alphaQuote,
      quoteId: "quote-alpha-2",
      revisionId: "revision-alpha-1",
      rfq: atsQuotedRfq
    });

    expect(revisedQuote.previousQuote).toMatchObject({
      status: "stale",
      staleReason: "revised",
      replacementQuoteId: "quote-alpha-2"
    });
    expect(revisedQuote.nextQuote).toMatchObject({
      quoteId: "quote-alpha-2",
      previousQuoteId: "quote-alpha-1"
    });
    expect(revisedQuote.revision).toMatchObject({
      previousQuoteId: "quote-alpha-1",
      nextQuoteId: "quote-alpha-2",
      revisedBy: "dealer-alpha"
    });
    expect(() =>
      reviseDealerQuote({
        accessGrants: grants,
        createdAt: "2026-04-02T00:04:30.000Z",
        dealerId: "dealer-alpha",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: invited.invitations,
        pair,
        price: 99.2,
        quantity: 20,
        quote: { ...alphaQuote, status: "withdrawn", withdrawnAt: "2026-04-02T00:04:15.000Z" },
        quoteId: "quote-alpha-3",
        revisionId: "revision-alpha-withdrawn",
        rfq: atsQuotedRfq
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_WITHDRAWN" }));
    expect(() =>
      reviseDealerQuote({
        accessGrants: grants,
        createdAt: "2026-04-02T00:04:30.000Z",
        dealerId: "dealer-alpha",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: invited.invitations,
        pair,
        price: 99.2,
        quantity: 20,
        quote: { ...alphaQuote, status: "stale", staleReason: "revised" },
        quoteId: "quote-alpha-3",
        revisionId: "revision-alpha-stale",
        rfq: atsQuotedRfq
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_STALE" }));
    expect(() =>
      reviseDealerQuote({
        accessGrants: grants,
        createdAt: "2026-04-02T00:04:30.000Z",
        dealerId: "dealer-alpha",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations: invited.invitations,
        pair,
        price: 99.2,
        quantity: 20,
        quote: { ...alphaQuote, status: "accepted" },
        quoteId: "quote-alpha-3",
        revisionId: "revision-alpha-accepted",
        rfq: atsQuotedRfq
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_NOT_OPEN" }));

    const withdrawnQuote = withdrawDealerQuote({
      dealerId: "dealer-alpha",
      pair,
      quote: revisedQuote.nextQuote,
      reason: "manual pullback",
      rfq: atsQuotedRfq,
      withdrawalId: "withdraw-alpha-1",
      withdrawnAt: "2026-04-02T00:05:00.000Z"
    });

    expect(withdrawnQuote.quote).toMatchObject({
      status: "withdrawn",
      withdrawalReason: "manual pullback"
    });
    expect(withdrawnQuote.withdrawal).toMatchObject({
      quoteId: "quote-alpha-2",
      reason: "manual pullback"
    });
    expect(
      withdrawDealerQuote({
        dealerId: "dealer-alpha",
        pair,
        quote: withdrawnQuote.quote,
        rfq: atsQuotedRfq,
        withdrawalId: "withdraw-alpha-2",
        withdrawnAt: "2026-04-02T00:05:30.000Z"
      })
    ).toEqual({
      quote: withdrawnQuote.quote
    });
    expect(() =>
      withdrawDealerQuote({
        dealerId: "dealer-alpha",
        pair,
        quote: revisedQuote.previousQuote,
        rfq: atsQuotedRfq,
        withdrawalId: "withdraw-alpha-stale",
        withdrawnAt: "2026-04-02T00:05:30.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_STALE" }));
    expect(() =>
      withdrawDealerQuote({
        dealerId: "dealer-alpha",
        pair,
        quote: { ...alphaQuote, status: "accepted" },
        rfq: atsQuotedRfq,
        withdrawalId: "withdraw-alpha-accepted",
        withdrawnAt: "2026-04-02T00:05:30.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_NOT_OPEN" }));
    expect(expireDealerQuote(alphaQuote, "2026-04-02T00:03:30.000Z")).toEqual(alphaQuote);
    expect(
      expireDealerQuote(
        { ...alphaQuote, status: "accepted", acceptedAt: "2026-04-02T00:04:00.000Z" },
        "2026-04-02T00:21:00.000Z"
      )
    ).toMatchObject({
      status: "accepted"
    });
    expect(expireDealerQuote(alphaQuote, "2026-04-02T00:21:00.000Z")).toMatchObject({
      status: "expired",
      updatedAt: "2026-04-02T00:21:00.000Z"
    });
  });

  it("covers ATS synchronization, acceptance, reject-all, and ranking rules", () => {
    const pair = buildAtsPair();
    const grants = buildAtsGrants(pair.pairId);
    const subscriberGrant = grants[0];

    if (subscriberGrant === undefined) {
      throw new Error("Expected ATS subscriber grant.");
    }

    const rfq = markRfqQuoted(
      createRfqSession({
        rfqId: "rfq-ats-rank",
        pair,
        accessGrants: [subscriberGrant],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-ATS-RANK",
        side: "buy",
        quantity: 20,
        responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
        createdAt
      }),
      "2026-04-02T00:01:00.000Z"
    );
    const invitations = [
      buildAtsInvitation({
        invitationId: "rfq-ats-rank:dealer-alpha:1",
        rfqId: rfq.rfqId,
        status: "responded",
        respondedAt: "2026-04-02T00:01:00.000Z",
        firstQuoteId: "quote-alpha-1"
      }),
      buildAtsInvitation({
        invitationId: "rfq-ats-rank:dealer-beta:1",
        rfqId: rfq.rfqId,
        dealerId: "dealer-beta"
      })
    ];
    const alphaQuote = createDealerQuote({
      quoteId: "quote-alpha-1",
      pair,
      rfq,
      accessGrants: grants,
      dealerId: "dealer-alpha",
      price: 99.5,
      quantity: 20,
      createdAt: "2026-04-02T00:01:00.000Z",
      expiresAt: "2026-04-02T00:20:00.000Z",
      invitations
    });
    const betaQuote = createDealerQuote({
      quoteId: "quote-beta-1",
      pair,
      rfq,
      accessGrants: grants,
      dealerId: "dealer-beta",
      price: 101,
      quantity: 20,
      createdAt: "2026-04-02T00:01:30.000Z",
      expiresAt: "2026-04-02T00:20:00.000Z",
      invitations
    });

    expect(
      synchronizeRfqLifecycle({
        pair,
        rfq,
        invitations,
        quotes: [alphaQuote, betaQuote],
        observedAt: "2026-04-02T00:02:00.000Z"
      }).rfq.status
    ).toBe("quoted");
    expect(
      synchronizeRfqLifecycle({
        pair,
        rfq: { ...rfq, status: "open" },
        invitations: [buildAtsInvitation({ rfqId: rfq.rfqId })],
        quotes: [],
        observedAt: "2026-04-02T00:11:00.000Z"
      }).rfq.status
    ).toBe("quote_expired");
    expect(
      synchronizeRfqLifecycle({
        pair,
        rfq: { ...rfq, status: "rejected" },
        invitations: [buildAtsInvitation({ rfqId: rfq.rfqId })],
        quotes: [alphaQuote],
        observedAt: "2026-04-02T00:11:00.000Z"
      }).rfq.status
    ).toBe("rejected");

    const accepted = acceptDealerQuote({
      pair,
      rfq,
      quote: alphaQuote,
      accessGrants: [subscriberGrant],
      acceptedBy: "subscriber-1",
      acceptedAt: "2026-04-02T00:02:00.000Z",
      executionId: "execution-ats-1",
      instructionId: "instruction-ats-1",
      otherQuotes: [betaQuote]
    });

    expect(accepted.quote.status).toBe("accepted");
    expect(accepted.staleQuotes).toEqual([
      expect.objectContaining({
        quoteId: "quote-beta-1",
        status: "stale",
        staleReason: "accepted_elsewhere"
      })
    ]);
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote: { ...alphaQuote, status: "withdrawn", withdrawnAt: "2026-04-02T00:01:45.000Z" },
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:02:00.000Z",
        executionId: "execution-ats-withdrawn",
        instructionId: "instruction-ats-withdrawn"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_WITHDRAWN" }));
    expect(() =>
      acceptDealerQuote({
        pair,
        rfq,
        quote: { ...alphaQuote, status: "stale", staleReason: "rejected_all" },
        accessGrants: [subscriberGrant],
        acceptedBy: "subscriber-1",
        acceptedAt: "2026-04-02T00:02:00.000Z",
        executionId: "execution-ats-stale",
        instructionId: "instruction-ats-stale"
      })
    ).toThrow(expect.objectContaining({ code: "QUOTE_STALE" }));

    const rejected = rejectAllQuotes({
      accessGrants: [subscriberGrant],
      quotes: [
        alphaQuote,
        betaQuote,
        { ...betaQuote, quoteId: "quote-other-rfq", rfqId: "rfq-other" }
      ],
      reason: "no fill",
      rejectedAt: "2026-04-02T00:03:00.000Z",
      rejectedBy: "subscriber-1",
      rfq
    });

    expect(rejected.rfq).toMatchObject({
      status: "rejected",
      rejectedBy: "subscriber-1",
      rejectionReason: "no fill"
    });
    expect(rejected.staleQuotes).toHaveLength(2);
    expect(
      rejectAllQuotes({
        accessGrants: [subscriberGrant],
        quotes: [alphaQuote],
        rejectedAt: "2026-04-02T00:03:30.000Z",
        rejectedBy: "subscriber-1",
        rfq: { ...rejected.rfq, status: "rejected" }
      })
    ).toEqual({
      rfq: { ...rejected.rfq, status: "rejected" },
      staleQuotes: []
    });
    expect(() =>
      rejectAllQuotes({
        accessGrants: [subscriberGrant],
        quotes: [alphaQuote],
        rejectedAt: "2026-04-02T00:03:30.000Z",
        rejectedBy: "subscriber-2",
        rfq
      })
    ).toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    expect(() =>
      rejectAllQuotes({
        accessGrants: [subscriberGrant],
        quotes: [alphaQuote],
        rejectedAt: "2026-04-02T00:03:30.000Z",
        rejectedBy: "subscriber-1",
        rfq: { ...rfq, status: "accepted" }
      })
    ).toThrow(expect.objectContaining({ code: "RFQ_NOT_OPEN" }));

    const quantityTieLeft = { ...alphaQuote, quoteId: "quantity-left", price: 100, quantity: 15 };
    const quantityTieRight = { ...alphaQuote, quoteId: "quantity-right", price: 100, quantity: 10 };
    const timeTieLeft = {
      ...alphaQuote,
      quoteId: "time-left",
      price: 100,
      quantity: 10,
      createdAt: "2026-04-02T00:01:00.000Z"
    };
    const timeTieRight = {
      ...alphaQuote,
      quoteId: "time-right",
      price: 100,
      quantity: 10,
      createdAt: "2026-04-02T00:01:30.000Z"
    };
    const idTieLeft = {
      ...alphaQuote,
      quoteId: "alpha-id",
      price: 100,
      quantity: 10,
      createdAt: "2026-04-02T00:01:00.000Z"
    };
    const idTieRight = {
      ...alphaQuote,
      quoteId: "beta-id",
      price: 100,
      quantity: 10,
      createdAt: "2026-04-02T00:01:00.000Z"
    };

    expect(compareQuotePriority("buy", alphaQuote, betaQuote)).toBeLessThan(0);
    expect(compareQuotePriority("sell", alphaQuote, betaQuote)).toBeGreaterThan(0);
    expect(compareQuotePriority("buy", quantityTieLeft, quantityTieRight)).toBeLessThan(0);
    expect(compareQuotePriority("buy", timeTieLeft, timeTieRight)).toBeLessThan(0);
    expect(compareQuotePriority("buy", idTieLeft, idTieRight)).toBeLessThan(0);
    expect(
      rankComparableQuotes("buy", [
        { ...betaQuote, status: "withdrawn", withdrawnAt: "2026-04-02T00:02:30.000Z" },
        accepted.quote,
        quantityTieLeft
      ]).map((entry) => entry.quote.quoteId)
    ).toEqual(["quote-alpha-1", "quantity-left"]);
  });

  it("covers nullish and defensive ATS branches that drive the unit coverage gate", () => {
    expect(() =>
      createPairInstance({
        pairId: "pair-single-missing-dealer",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
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
          releaseId: "rulebook-missing-dealer",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        }
      })
    ).toThrow(expect.objectContaining({ code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER" }));
    expect(() =>
      createPairInstance({
        pairId: "pair-ats-missing-dealers",
        mode: "ATSPair",
        operatorId: "operator-1",
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
          releaseId: "rulebook-ats-missing-dealers",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        }
      })
    ).toThrow(expect.objectContaining({ code: "ATS_PAIR_REQUIRES_MULTIPLE_DEALERS" }));
    expect(
      createPairInstance({
        pairId: "pair-ats-default-oversight",
        mode: "ATSPair",
        operatorId: "operator-1",
        dealerIds: ["dealer-alpha", "dealer-beta"],
        inviteRevisionPolicy: "before_first_response",
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
          releaseId: "rulebook-ats-default-oversight",
          version: "v1",
          effectiveAt: createdAt,
          publishedBy: "operator-1",
          summary: "initial"
        }
      }).operatorOversightRole
    ).toBe("full");

    const pair = buildAtsPair();
    const grants = buildAtsGrants(pair.pairId);
    const subscriberGrant = grants[0];

    if (subscriberGrant === undefined) {
      throw new Error("Expected ATS subscriber grant.");
    }

    expect(() =>
      createRfqSession({
        rfqId: "rfq-ats-missing-window",
        pair,
        accessGrants: [subscriberGrant],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-ATS-NULLISH",
        side: "buy",
        quantity: 5,
        createdAt
      })
    ).toThrow(expect.objectContaining({ code: "EMPTY_IDENTIFIER" }));

    const rfq = createRfqSession({
      rfqId: "rfq-ats-nullish",
      pair,
      accessGrants: [subscriberGrant],
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-ATS-NULLISH",
      side: "buy",
      quantity: 5,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      createdAt
    });
    const invitation = buildAtsInvitation({
      invitationId: "rfq-ats-nullish:dealer-alpha:1",
      rfqId: rfq.rfqId,
      pairId: pair.pairId
    });
    const rfqWithoutWindow = { ...rfq };
    const rfqWithoutInvitationState = { ...rfq };
    const rfqWithoutCurrentInvitationVersion = { ...rfq };

    delete rfqWithoutWindow.responseWindowClosesAt;
    delete rfqWithoutInvitationState.currentInvitationVersion;
    delete rfqWithoutInvitationState.invitedDealerIds;
    delete rfqWithoutCurrentInvitationVersion.currentInvitationVersion;

    expect(() =>
      createDealerInvitations({
        accessGrants: grants,
        createdAt: "2026-04-02T00:01:00.000Z",
        dealerIds: ["dealer-alpha"],
        invitations: [],
        invitedBy: "subscriber-1",
        pair,
        rfq: rfqWithoutWindow
      })
    ).toThrow(expect.objectContaining({ code: "EMPTY_IDENTIFIER" }));
    expect(
      createDealerInvitations({
        accessGrants: grants,
        createdAt: "2026-04-02T00:01:00.000Z",
        dealerIds: ["dealer-alpha"],
        invitations: [],
        invitedBy: "subscriber-1",
        pair,
        rfq: rfqWithoutInvitationState
      }).rfq.currentInvitationVersion
    ).toBe(1);
    expect(
      createDealerInvitations({
        accessGrants: grants,
        createdAt: "2026-04-02T00:01:00.000Z",
        dealerIds: ["dealer-alpha"],
        invitations: [buildAtsInvitation({ pairId: pair.pairId, rfqId: rfq.rfqId })],
        invitedBy: "subscriber-1",
        pair,
        rfq: {
          ...rfqWithoutCurrentInvitationVersion,
          invitedDealerIds: ["dealer-alpha"],
          firstResponseAt: "2026-04-02T00:01:30.000Z",
          status: "quoted"
        }
      }).rfq.currentInvitationVersion
    ).toBe(1);
    expect(
      createDealerInvitations({
        accessGrants: grants,
        createdAt: "2026-04-02T00:01:00.000Z",
        dealerIds: ["dealer-alpha"],
        invitations: [buildAtsInvitation({ pairId: pair.pairId, rfqId: rfq.rfqId })],
        invitedBy: "subscriber-1",
        pair,
        rfq: {
          ...rfqWithoutCurrentInvitationVersion,
          invitedDealerIds: ["dealer-alpha"],
          status: "open"
        }
      }).rfq.currentInvitationVersion
    ).toBe(1);
    expect(
      markDealerInvitationResponded(invitation, "2026-04-02T00:01:00.000Z")
    ).not.toHaveProperty("firstQuoteId");
    expect(() =>
      createDealerQuote({
        quoteId: "quote-nullish-no-invites",
        pair,
        rfq: { ...rfq, status: "quoted" },
        accessGrants: grants,
        dealerId: "dealer-alpha",
        price: 99,
        quantity: 5,
        createdAt: "2026-04-02T00:01:00.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "INVITATION_REQUIRED" }));

    const singlePair = buildPair();
    const dealerGrant = createAccessGrant({
      grantId: "grant-single-dealer-nullish",
      pairId: singlePair.pairId,
      subjectId: "dealer-alpha",
      role: "dealer",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const singleRfq = markRfqQuoted(
      createRfqSession({
        rfqId: "rfq-single-nullish",
        pair: singlePair,
        accessGrants: [buildGrant()],
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-SINGLE-NULLISH",
        side: "buy",
        quantity: 5,
        createdAt
      }),
      "2026-04-02T00:01:00.000Z"
    );
    const singleQuote = createDealerQuote({
      quoteId: "quote-single-nullish-1",
      pair: singlePair,
      rfq: { ...singleRfq, status: "open" },
      accessGrants: [dealerGrant],
      dealerId: "dealer-alpha",
      price: 100,
      quantity: 5,
      createdAt: "2026-04-02T00:01:00.000Z",
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    expect(
      reviseDealerQuote({
        accessGrants: [dealerGrant],
        createdAt: "2026-04-02T00:02:00.000Z",
        dealerId: "dealer-alpha",
        expiresAt: "2026-04-02T00:20:00.000Z",
        pair: singlePair,
        price: 99.5,
        quantity: 5,
        quote: singleQuote,
        quoteId: "quote-single-nullish-2",
        revisionId: "revision-single-nullish",
        rfq: { ...singleRfq, status: "open" }
      }).nextQuote.quoteId
    ).toBe("quote-single-nullish-2");
    expect(
      withdrawDealerQuote({
        dealerId: "dealer-alpha",
        pair: singlePair,
        quote: singleQuote,
        rfq: { ...singleRfq, status: "open" },
        withdrawalId: "withdraw-single-nullish",
        withdrawnAt: "2026-04-02T00:03:00.000Z"
      }).withdrawal
    ).not.toHaveProperty("reason");
    expect(
      synchronizeRfqLifecycle({
        pair,
        rfq: { ...rfq, status: "open" },
        observedAt: "2026-04-02T00:02:00.000Z"
      }).rfq.status
    ).toBe("open");
    expect(
      synchronizeRfqLifecycle({
        pair: singlePair,
        rfq: { ...singleRfq, status: "open" },
        observedAt: "2026-04-02T00:02:00.000Z"
      }).rfq.status
    ).toBe("open");
    expect(
      synchronizeRfqLifecycle({
        pair: singlePair,
        rfq: { ...singleRfq, status: "quoted" },
        observedAt: "2026-04-02T00:02:00.000Z"
      }).rfq.status
    ).toBe("quote_expired");
    expect(
      rejectAllQuotes({
        accessGrants: [subscriberGrant],
        quotes: [buildQuote()],
        rejectedAt: "2026-04-02T00:03:00.000Z",
        rejectedBy: "subscriber-1",
        rfq: {
          ...rfq,
          status: "quoted",
          subscriberId: "subscriber-1"
        }
      }).rfq
    ).not.toHaveProperty("rejectionReason");
  });

  it("runs the dark-cross lifecycle from order submission through accepted execution", () => {
    const pair = buildAtsPair();
    const grants = buildDarkGrants(pair.pairId);
    const buyOrder = createDarkOrder({
      orderId: "dark-buy-1",
      clientOrderId: "client-buy-1",
      pair,
      accessGrants: grants,
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-DARK-1",
      side: "buy",
      quantity: 50,
      limitPrice: 101.5,
      createdAt: "2026-04-02T00:00:00.000Z",
      expiresAt: "2026-04-02T00:10:00.000Z"
    });
    const sellOrder = createDarkOrder({
      orderId: "dark-sell-1",
      clientOrderId: "client-sell-1",
      pair,
      accessGrants: grants,
      subscriberId: "subscriber-2",
      instrumentId: "CUSIP-DARK-1",
      side: "sell",
      quantity: 50,
      limitPrice: 100.5,
      createdAt: "2026-04-02T00:00:30.000Z",
      expiresAt: "2026-04-02T00:10:00.000Z"
    });
    const created = createMatchProposal({
      pair,
      accessGrants: grants,
      buyOrder,
      sellOrder,
      proposalId: "proposal-dark-1",
      buyLockId: "lock-buy-1",
      sellLockId: "lock-sell-1",
      createdAt: "2026-04-02T00:01:00.000Z",
      createdBy: "operator-1",
      expiresAt: "2026-04-02T00:02:00.000Z"
    });
    const buyAccepted = acceptMatchProposal({
      proposal: created.proposal,
      accessGrants: grants,
      actorId: "subscriber-1",
      acceptedAt: "2026-04-02T00:01:10.000Z"
    });
    const fullyAccepted = acceptMatchProposal({
      proposal: buyAccepted,
      accessGrants: grants,
      actorId: "subscriber-2",
      acceptedAt: "2026-04-02T00:01:20.000Z"
    });
    const executed = executeDarkMatch({
      pair,
      accessGrants: grants,
      proposal: fullyAccepted,
      buyOrder,
      sellOrder,
      buyLock: created.buyLock,
      sellLock: created.sellLock,
      executionId: "execution-dark-1",
      instructionId: "settlement-dark-1",
      executedAt: "2026-04-02T00:01:30.000Z",
      releasedBy: "settler-1"
    });

    expect(
      compareDarkOrderPriority("buy", buyOrder, buildDarkOrder({ orderId: "dark-buy-2" }))
    ).toBe(-1);
    expect(canDarkOrdersCross(buyOrder, sellOrder)).toBe(true);
    expect(resolveDarkCrossPrice(buyOrder, sellOrder)).toBe(101);
    expect(fullyAccepted.status).toBe("accepted");
    expect(executed.proposal).toMatchObject({
      proposalId: "proposal-dark-1",
      status: "executed",
      executionId: "execution-dark-1"
    });
    expect(executed.buyOrder).toMatchObject({
      orderId: "dark-buy-1",
      status: "executed",
      executionId: "execution-dark-1"
    });
    expect(executed.sellOrder).toMatchObject({
      orderId: "dark-sell-1",
      status: "executed",
      executionId: "execution-dark-1"
    });
    expect(isOrderLockActive(created.buyLock)).toBe(true);
    expect(hasActiveOrderLock("dark-buy-1", [created.buyLock, created.sellLock])).toBe(true);
    expect(executed.buyLock).toMatchObject({
      lockId: "lock-buy-1",
      status: "released",
      releaseReason: "executed"
    });
    expect(executed.executionTicket).toEqual({
      executionId: "execution-dark-1",
      executionKind: "dark_cross",
      pairId: "pair-ats-001",
      matchProposalId: "proposal-dark-1",
      instrumentId: "CUSIP-DARK-1",
      quantity: 50,
      price: 101,
      acceptedAt: "2026-04-02T00:01:20.000Z",
      buyOrderId: "dark-buy-1",
      sellOrderId: "dark-sell-1",
      buySubscriberId: "subscriber-1",
      sellSubscriberId: "subscriber-2",
      side: "buy"
    });
    expect(executed.settlementInstruction).toEqual({
      instructionId: "settlement-dark-1",
      pairId: "pair-ats-001",
      executionId: "execution-dark-1",
      status: "pending",
      createdAt: "2026-04-02T00:01:30.000Z",
      updatedAt: "2026-04-02T00:01:30.000Z",
      settlementKind: "dark_cross",
      matchProposalId: "proposal-dark-1",
      buyOrderId: "dark-buy-1",
      sellOrderId: "dark-sell-1",
      subscriberId: "subscriber-1",
      sellSubscriberId: "subscriber-2",
      settlementAgentId: "settler-1"
    });
    expect(
      createDarkOrder({
        orderId: "dark-no-expiry",
        clientOrderId: "client-no-expiry",
        pair,
        accessGrants: grants,
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-DARK-2",
        side: "buy",
        quantity: 25,
        limitPrice: 100.25,
        createdAt: "2026-04-02T00:02:00.000Z"
      })
    ).not.toHaveProperty("expiresAt");
  });

  it("blocks dark-order cancellation while locked and releases expired proposals deterministically", () => {
    const pair = buildAtsPair();
    const grants = buildDarkGrants(pair.pairId);
    const order = buildDarkOrder();
    const buyLock = buildOrderLock();
    const sellLock = buildOrderLock({
      lockId: "lock-002",
      orderId: "dark-order-002",
      subscriberId: "subscriber-2"
    });
    const proposal = buildMatchProposal();

    expect(() =>
      cancelDarkOrder({
        pair,
        order,
        accessGrants: grants,
        activeLocks: [buyLock],
        cancelledAt: "2026-04-02T00:02:30.000Z",
        cancelledBy: "subscriber-1"
      })
    ).toThrow(expect.objectContaining({ code: "DARK_ORDER_LOCKED" }));

    const synced = synchronizeDarkCrossLifecycle({
      orders: [
        order,
        buildDarkOrder({
          orderId: "dark-order-002",
          clientOrderId: "client-order-002",
          side: "sell",
          subscriberId: "subscriber-2",
          limitPrice: 100.5
        })
      ],
      locks: [buyLock, sellLock],
      proposals: [proposal],
      observedAt: "2026-04-02T00:03:05.000Z"
    });

    expect(expireMatchProposal(proposal, "2026-04-02T00:03:05.000Z").status).toBe("expired");
    expect(expireDarkOrder(order, "2026-04-02T00:11:00.000Z").status).toBe("expired");
    expect(
      releaseOrderLock({
        lock: buyLock,
        releasedAt: "2026-04-02T00:03:05.000Z",
        releasedBy: "system",
        reason: "expired"
      }).status
    ).toBe("expired");
    expect(synced.proposals[0]?.status).toBe("expired");
    expect(synced.locks.every((lock) => lock.status === "expired")).toBe(true);
  });

  it("keeps nonterminal dark proposals unchanged before expiry and releases locks by proposal outcome", () => {
    const pendingProposal = buildMatchProposal({
      proposalId: "proposal-pending",
      expiresAt: "2026-04-02T00:05:00.000Z"
    });
    const rejectedProposal = buildMatchProposal({
      proposalId: "proposal-rejected",
      status: "rejected",
      rejectedBy: "subscriber-1",
      rejectedAt: "2026-04-02T00:02:10.000Z",
      updatedAt: "2026-04-02T00:02:10.000Z"
    });
    const executedProposal = buildMatchProposal({
      proposalId: "proposal-executed",
      status: "executed",
      executionId: "execution-dark-1",
      updatedAt: "2026-04-02T00:02:20.000Z"
    });
    const releasedLock = buildOrderLock({
      lockId: "lock-released",
      status: "released",
      releasedAt: "2026-04-02T00:02:10.000Z",
      releasedBy: "subscriber-1",
      releaseReason: "rejected",
      updatedAt: "2026-04-02T00:02:10.000Z"
    });
    const pendingLock = buildOrderLock({
      lockId: "lock-pending",
      proposalId: "proposal-pending",
      lockExpiresAt: "2026-04-02T00:05:00.000Z"
    });
    const rejectedLock = buildOrderLock({
      lockId: "lock-rejected",
      proposalId: "proposal-rejected"
    });
    const executedLock = buildOrderLock({
      lockId: "lock-executed",
      proposalId: "proposal-executed"
    });

    expect(expireMatchProposal(pendingProposal, "2026-04-02T00:04:59.000Z")).toBe(pendingProposal);

    const synced = synchronizeDarkCrossLifecycle({
      orders: [],
      proposals: [pendingProposal, rejectedProposal, executedProposal],
      locks: [releasedLock, pendingLock, rejectedLock, executedLock],
      observedAt: "2026-04-02T00:04:59.000Z"
    });

    expect(synced.locks[0]).toBe(releasedLock);
    expect(synced.locks[1]).toBe(pendingLock);
    expect(synced.locks[2]).toMatchObject({
      lockId: "lock-rejected",
      status: "released",
      releaseReason: "rejected"
    });
    expect(synced.locks[3]).toMatchObject({
      lockId: "lock-executed",
      status: "released",
      releaseReason: "executed"
    });
  });

  it("covers seller rejection and malformed proposal lifecycle branches deterministically", () => {
    const sellerRejected = rejectMatchProposal({
      proposal: buildMatchProposal(),
      accessGrants: buildDarkGrants(),
      actorId: "subscriber-2",
      rejectedAt: "2026-04-02T00:02:30.000Z"
    });

    expect(sellerRejected.buyResponse).toBe("pending");
    expect(sellerRejected.sellResponse).toBe("rejected");
    expect(sellerRejected).not.toHaveProperty("rejectionReason");

    const malformedRejected: MatchProposal = buildMatchProposal({
      proposalId: "proposal-rejected-system",
      status: "rejected",
      rejectedAt: "2026-04-02T00:02:35.000Z",
      updatedAt: "2026-04-02T00:02:35.000Z"
    });
    delete malformedRejected.rejectedBy;
    const malformedExecuted: MatchProposal = buildMatchProposal({
      proposalId: "proposal-executed-missing-id",
      status: "executed",
      updatedAt: "2026-04-02T00:02:40.000Z"
    });
    delete malformedExecuted.executionId;
    const rejectedLock = buildOrderLock({
      lockId: "lock-rejected-system",
      proposalId: "proposal-rejected-system"
    });
    const executedLock = buildOrderLock({
      lockId: "lock-executed-missing-id",
      proposalId: "proposal-executed-missing-id"
    });

    const synced = synchronizeDarkCrossLifecycle({
      orders: [],
      proposals: [malformedRejected, malformedExecuted],
      locks: [rejectedLock, executedLock],
      observedAt: "2026-04-02T00:02:45.000Z"
    });

    expect(synchronizeDarkCrossLifecycle({ observedAt: "2026-04-02T00:02:45.000Z" }).locks).toEqual(
      []
    );
    expect(synced.locks[0]).toMatchObject({
      lockId: "lock-rejected-system",
      status: "released",
      releasedBy: "system",
      releaseReason: "rejected"
    });
    expect(synced.locks[1]).toBe(executedLock);
  });

  it("orders dark-order priority deterministically and keeps duplicate accept/release operations idempotent", () => {
    const higherPricedBuy = buildDarkOrder({ orderId: "buy-high", limitPrice: 102 });
    const lowerPricedBuy = buildDarkOrder({ orderId: "buy-low", limitPrice: 101 });
    const largerSell = buildDarkOrder({
      orderId: "sell-large",
      side: "sell",
      subscriberId: "subscriber-2",
      limitPrice: 100,
      quantity: 60
    });
    const smallerSell = buildDarkOrder({
      orderId: "sell-small",
      side: "sell",
      subscriberId: "subscriber-2",
      limitPrice: 100,
      quantity: 50
    });
    const laterBuy = buildDarkOrder({
      orderId: "buy-later",
      createdAt: "2026-04-02T00:00:01.000Z",
      updatedAt: "2026-04-02T00:00:01.000Z"
    });
    const acceptedProposal = acceptMatchProposal({
      proposal: buildMatchProposal({
        buyResponse: "accepted",
        buyAcceptedAt: "2026-04-02T00:02:05.000Z"
      }),
      accessGrants: buildDarkGrants(),
      actorId: "subscriber-1",
      acceptedAt: "2026-04-02T00:02:10.000Z"
    });
    const releasedLock = buildOrderLock({
      status: "released",
      releasedAt: "2026-04-02T00:02:10.000Z",
      releasedBy: "system",
      releaseReason: "expired",
      updatedAt: "2026-04-02T00:02:10.000Z"
    });

    expect(compareDarkOrderPriority("buy", higherPricedBuy, lowerPricedBuy)).toBeLessThan(0);
    expect(compareDarkOrderPriority("sell", largerSell, smallerSell)).toBeLessThan(0);
    expect(
      compareDarkOrderPriority("sell", largerSell, buildDarkOrder({ side: "sell", limitPrice: 99 }))
    ).toBeGreaterThan(0);
    expect(compareDarkOrderPriority("buy", buildDarkOrder(), laterBuy)).toBeLessThan(0);
    expect(
      acceptMatchProposal({
        proposal: acceptedProposal,
        accessGrants: buildDarkGrants(),
        actorId: "subscriber-1",
        acceptedAt: "2026-04-02T00:02:20.000Z"
      })
    ).toBe(acceptedProposal);
    expect(
      releaseOrderLock({
        lock: releasedLock,
        releasedAt: "2026-04-02T00:02:20.000Z",
        releasedBy: "system",
        reason: "expired"
      })
    ).toBe(releasedLock);
    expect(
      expireDarkOrder(buildDarkOrder({ status: "cancelled" }), "2026-04-02T00:20:00.000Z")
    ).toEqual(buildDarkOrder({ status: "cancelled" }));
    const openWithoutExpiry: DarkOrder = buildDarkOrder();
    delete openWithoutExpiry.expiresAt;
    expect(expireDarkOrder(openWithoutExpiry, "2026-04-02T00:20:00.000Z")).toEqual(
      openWithoutExpiry
    );
    expect(
      cancelDarkOrder({
        pair: buildAtsPair(),
        order: buildDarkOrder({
          status: "cancelled",
          cancelledAt: "2026-04-02T00:02:10.000Z",
          cancelledBy: "subscriber-1",
          updatedAt: "2026-04-02T00:02:10.000Z"
        }),
        accessGrants: buildDarkGrants(),
        cancelledAt: "2026-04-02T00:03:00.000Z",
        cancelledBy: "subscriber-1"
      }).status
    ).toBe("cancelled");
    expect(
      cancelDarkOrder({
        pair: buildAtsPair(),
        order: buildDarkOrder({
          orderId: "dark-order-open-no-locks",
          clientOrderId: "client-order-open-no-locks"
        }),
        accessGrants: buildDarkGrants(),
        cancelledAt: "2026-04-02T00:03:10.000Z",
        cancelledBy: "subscriber-1"
      }).status
    ).toBe("cancelled");
    expect(() =>
      cancelDarkOrder({
        pair: buildAtsPair(),
        order: buildDarkOrder({ status: "executed", executedAt: "2026-04-02T00:03:00.000Z" }),
        accessGrants: buildDarkGrants(),
        cancelledAt: "2026-04-02T00:04:00.000Z",
        cancelledBy: "subscriber-1"
      })
    ).toThrow(expect.objectContaining({ code: "DARK_ORDER_ALREADY_TERMINAL" }));
  });

  it("rejects invalid dark-cross combinations and keeps rejection idempotent", () => {
    const pair = buildAtsPair();
    const grants = buildDarkGrants(pair.pairId);
    const buyOrder = buildDarkOrder();
    const selfSellOrder = buildDarkOrder({
      orderId: "dark-order-self",
      clientOrderId: "client-order-self",
      side: "sell",
      subscriberId: "subscriber-1",
      limitPrice: 100
    });

    expect(canDarkOrdersCross(buyOrder, selfSellOrder)).toBe(false);
    expect(() =>
      createMatchProposal({
        pair,
        accessGrants: grants,
        buyOrder,
        sellOrder: selfSellOrder,
        proposalId: "proposal-self",
        buyLockId: "lock-self-buy",
        sellLockId: "lock-self-sell",
        createdAt: "2026-04-02T00:01:00.000Z",
        createdBy: "operator-1",
        expiresAt: "2026-04-02T00:02:00.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "NO_MATCH_CANDIDATE" }));

    const rejected = rejectMatchProposal({
      proposal: buildMatchProposal(),
      accessGrants: grants,
      actorId: "subscriber-1",
      rejectedAt: "2026-04-02T00:02:10.000Z",
      reason: "manual no"
    });

    expect(rejected).toMatchObject({
      status: "rejected",
      rejectedBy: "subscriber-1",
      rejectionReason: "manual no",
      buyResponse: "rejected"
    });
    expect(
      rejectMatchProposal({
        proposal: rejected,
        accessGrants: grants,
        actorId: "subscriber-1",
        rejectedAt: "2026-04-02T00:02:20.000Z"
      })
    ).toBe(rejected);
    expect(
      acceptMatchProposal({
        proposal: buildMatchProposal(),
        accessGrants: grants,
        actorId: "subscriber-2",
        acceptedAt: "2026-04-02T00:02:15.000Z"
      })
    ).toMatchObject({
      buyResponse: "pending",
      sellResponse: "accepted"
    });
    expect(() =>
      acceptMatchProposal({
        proposal: rejected,
        accessGrants: grants,
        actorId: "subscriber-2",
        acceptedAt: "2026-04-02T00:02:30.000Z"
      })
    ).toThrow(expect.objectContaining({ code: "MATCH_PROPOSAL_NOT_PENDING" }));
  });

  it("falls back to executedAt when accepted dark proposals do not record acceptedAt", () => {
    const pair = buildAtsPair();
    const grants = buildDarkGrants(pair.pairId);
    const proposal: MatchProposal = buildMatchProposal({
      status: "accepted",
      buyResponse: "accepted",
      sellResponse: "accepted"
    });
    delete proposal.acceptedAt;

    const executed = executeDarkMatch({
      pair,
      accessGrants: grants,
      proposal,
      buyOrder: buildDarkOrder(),
      sellOrder: buildDarkOrder({
        orderId: "dark-order-002",
        clientOrderId: "client-order-002",
        side: "sell",
        subscriberId: "subscriber-2",
        limitPrice: 100.5
      }),
      buyLock: buildOrderLock(),
      sellLock: buildOrderLock({
        lockId: "lock-002",
        orderId: "dark-order-002",
        proposalId: proposal.proposalId,
        subscriberId: "subscriber-2"
      }),
      executionId: "execution-dark-fallback",
      instructionId: "settlement-dark-fallback",
      executedAt: "2026-04-02T00:03:30.000Z",
      releasedBy: "settler-1"
    });

    expect(executed.executionTicket.acceptedAt).toBe("2026-04-02T00:03:30.000Z");
  });
});
