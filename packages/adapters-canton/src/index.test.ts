import { describe, expect, it } from "vitest";

import {
  createAccessGrant,
  createPairInstance,
  type AuditRecord,
  type DealerInvitation,
  type DealerQuote,
  type DarkOrder,
  type ExecutionTicket,
  type MatchProposal,
  type OrderLock,
  type QuoteRevision,
  type QuoteWithdrawal,
  type RFQSession,
  type SettlementInstruction
} from "@canton-dark/domain-core";

import {
  createCantonAuditLogPort,
  createCantonLedgerPort,
  createStubCantonTransport,
  mapAcceptQuoteCommand,
  mapAccessGrantToCantonCommand,
  mapAuditRecordToCantonCommand,
  mapCancelRfqCommand,
  mapDealerInvitationToCantonCommand,
  mapDarkOrderToCantonCommand,
  mapExecutionTicketToCantonCommand,
  mapMatchProposalToCantonCommand,
  mapOperatorApprovalToCantonCommand,
  mapOrderLockToCantonCommand,
  mapPairToCantonCommand,
  mapPausePairCommand,
  mapPauseStateToCantonCommand,
  mapProgressSettlementCommand,
  mapQuoteRevisionToCantonCommand,
  mapQuoteWithdrawalToCantonCommand,
  mapRegulatoryAttestationToCantonCommand,
  mapRejectRfqCommand,
  mapRulebookReleaseToCantonCommand,
  mapSettlementInstructionToCantonCommand
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

const pair = createPairInstance({
  pairId: "pair-1",
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
    releaseId: "rulebook-1",
    version: "v1",
    effectiveAt: createdAt,
    publishedBy: "operator-1",
    summary: "initial"
  }
});

const grant = createAccessGrant({
  grantId: "grant-1",
  pairId: "pair-1",
  subjectId: "subscriber-1",
  role: "subscriber",
  grantedAt: createdAt,
  grantedBy: "operator-1"
});

const rfq: RFQSession = {
  rfqId: "rfq-1",
  pairId: "pair-1",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-1",
  side: "buy",
  quantity: 10,
  createdAt: "2026-04-02T00:01:00.000Z",
  updatedAt: "2026-04-02T00:01:00.000Z",
  status: "quoted"
};

const quote: DealerQuote = {
  quoteId: "quote-1",
  pairId: "pair-1",
  rfqId: "rfq-1",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  price: 100.5,
  quantity: 10,
  createdAt: "2026-04-02T00:02:00.000Z",
  expiresAt: "2026-04-02T00:05:00.000Z",
  updatedAt: "2026-04-02T00:02:00.000Z",
  status: "open"
};

const invitation: DealerInvitation = {
  invitationId: "invitation-1",
  pairId: "pair-1",
  rfqId: "rfq-1",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  invitationVersion: 1,
  invitedAt: "2026-04-02T00:01:30.000Z",
  invitedBy: "subscriber-1",
  responseWindowClosesAt: "2026-04-02T00:05:00.000Z",
  updatedAt: "2026-04-02T00:02:00.000Z",
  status: "responded",
  respondedAt: "2026-04-02T00:02:00.000Z"
};

const quoteRevision: QuoteRevision = {
  revisionId: "revision-1",
  pairId: "pair-1",
  rfqId: "rfq-1",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  previousQuoteId: "quote-0",
  nextQuoteId: "quote-1",
  revisedAt: "2026-04-02T00:02:00.000Z",
  revisedBy: "dealer-alpha"
};

const quoteWithdrawal: QuoteWithdrawal = {
  withdrawalId: "withdrawal-1",
  pairId: "pair-1",
  rfqId: "rfq-1",
  quoteId: "quote-0",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  withdrawnAt: "2026-04-02T00:01:59.000Z",
  withdrawnBy: "dealer-alpha",
  reason: "replaced"
};

const execution: ExecutionTicket = {
  executionId: "execution-1",
  pairId: "pair-1",
  rfqId: "rfq-1",
  quoteId: "quote-1",
  dealerId: "dealer-alpha",
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-1",
  side: "buy",
  quantity: 10,
  price: 100.5,
  acceptedAt: "2026-04-02T00:03:00.000Z"
};

const darkOrder: DarkOrder = {
  orderId: "dark-order-1",
  clientOrderId: "dark-client-1",
  pairId: "pair-1",
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-1",
  side: "buy",
  quantity: 10,
  limitPrice: 100.5,
  createdAt: "2026-04-02T00:02:30.000Z",
  updatedAt: "2026-04-02T00:02:30.000Z",
  status: "open"
};

const orderLock: OrderLock = {
  lockId: "lock-1",
  pairId: "pair-1",
  orderId: "dark-order-1",
  proposalId: "proposal-1",
  subscriberId: "subscriber-1",
  lockedAt: "2026-04-02T00:02:45.000Z",
  lockedBy: "operator-1",
  lockExpiresAt: "2026-04-02T00:03:15.000Z",
  updatedAt: "2026-04-02T00:02:45.000Z",
  status: "active"
};

const matchProposal: MatchProposal = {
  proposalId: "proposal-1",
  pairId: "pair-1",
  instrumentId: "CUSIP-1",
  quantity: 10,
  price: 100.5,
  buyOrderId: "dark-order-1",
  sellOrderId: "dark-order-2",
  buySubscriberId: "subscriber-1",
  sellSubscriberId: "subscriber-2",
  buyLockId: "lock-1",
  sellLockId: "lock-2",
  buyResponse: "pending",
  sellResponse: "pending",
  createdAt: "2026-04-02T00:02:45.000Z",
  createdBy: "operator-1",
  expiresAt: "2026-04-02T00:03:15.000Z",
  updatedAt: "2026-04-02T00:02:45.000Z",
  status: "pending"
};

const settlement: SettlementInstruction = {
  instructionId: "settlement-1",
  executionId: "execution-1",
  pairId: "pair-1",
  status: "pending",
  createdAt: "2026-04-02T00:03:00.000Z",
  updatedAt: "2026-04-02T00:03:00.000Z"
};

const darkExecution: ExecutionTicket = {
  executionId: "execution-dark-1",
  executionKind: "dark_cross",
  pairId: "pair-1",
  matchProposalId: "proposal-1",
  instrumentId: "CUSIP-1",
  quantity: 10,
  price: 100.5,
  acceptedAt: "2026-04-02T00:03:30.000Z",
  buyOrderId: "dark-order-1",
  sellOrderId: "dark-order-2",
  buySubscriberId: "subscriber-1",
  sellSubscriberId: "subscriber-2"
};

const darkSettlement: SettlementInstruction = {
  instructionId: "settlement-dark-1",
  executionId: "execution-dark-1",
  pairId: "pair-1",
  status: "pending",
  createdAt: "2026-04-02T00:03:30.000Z",
  updatedAt: "2026-04-02T00:03:30.000Z",
  settlementKind: "dark_cross",
  matchProposalId: "proposal-1",
  buyOrderId: "dark-order-1",
  sellOrderId: "dark-order-2",
  settlementAgentId: "settler-1"
};

describe("adapters-canton", () => {
  it("maps phase 1 contracts and commands into Canton transport submissions", () => {
    const revokedGrant = {
      ...grant,
      revokedAt: "2026-04-02T00:04:00.000Z",
      revokedBy: "operator-1"
    };
    const pausedPair = {
      ...pair,
      pauseState: {
        state: "paused" as const,
        changedAt: "2026-04-02T00:04:00.000Z",
        changedBy: "operator-1",
        reason: "manual hold"
      }
    };

    expect(mapPairToCantonCommand(pair)).toEqual({
      action: "upsert_contract",
      template: "PairInstance",
      key: "pair-1",
      submitter: "operator-1",
      observers: ["operator-1", "dealer-alpha"],
      payload: {
        pairId: "pair-1",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        dealerIds: ["dealer-alpha"],
        operatorOversightRole: "full",
        inviteRevisionPolicy: "locked",
        pauseState: {
          state: "active",
          changedAt: createdAt,
          changedBy: "operator-1"
        },
        rulebookRelease: pair.rulebookRelease,
        regulatoryAttestation: pair.regulatoryAttestation,
        operatorApproval: pair.operatorApproval
      }
    });
    expect(mapOperatorApprovalToCantonCommand(pair)).toEqual({
      action: "upsert_contract",
      template: "OperatorApproval",
      key: "pair-1",
      submitter: "operator-1",
      observers: ["operator-1", "dealer-alpha"],
      payload: {
        pairId: "pair-1",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        ...pair.operatorApproval
      }
    });
    expect(mapRegulatoryAttestationToCantonCommand(pair)).toEqual({
      action: "upsert_contract",
      template: "RegulatoryAttestation",
      key: "pair-1",
      submitter: "operator-1",
      observers: ["operator-1", "dealer-alpha"],
      payload: {
        pairId: "pair-1",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        ...pair.regulatoryAttestation
      }
    });
    expect(mapRulebookReleaseToCantonCommand(pair)).toEqual({
      action: "upsert_contract",
      template: "RulebookRelease",
      key: "pair-1:v1",
      submitter: "operator-1",
      observers: ["operator-1", "dealer-alpha"],
      payload: {
        pairId: "pair-1",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        ...pair.rulebookRelease
      }
    });
    expect(mapPauseStateToCantonCommand(pausedPair)).toEqual({
      action: "upsert_contract",
      template: "PauseState",
      key: "pair-1",
      submitter: "operator-1",
      observers: ["operator-1", "dealer-alpha"],
      payload: {
        pairId: "pair-1",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        state: "paused",
        changedAt: "2026-04-02T00:04:00.000Z",
        changedBy: "operator-1",
        reason: "manual hold"
      }
    });
    expect(mapAccessGrantToCantonCommand(revokedGrant)).toEqual({
      action: "upsert_contract",
      template: "AccessGrant",
      key: "grant-1",
      submitter: "operator-1",
      observers: ["subscriber-1"],
      payload: {
        pairId: "pair-1",
        subjectId: "subscriber-1",
        role: "subscriber",
        entitlements: ["accept_quote", "submit_rfq", "view_pair"],
        revokedAt: "2026-04-02T00:04:00.000Z",
        revokedBy: "operator-1"
      }
    });
    expect(mapPausePairCommand(pair, "operator-1").choice).toBe("Unpause");
    expect(mapPausePairCommand(pausedPair, "operator-1")).toEqual({
      action: "exercise",
      template: "PairInstance",
      choice: "Pause",
      key: "pair-1",
      submitter: "operator-1",
      observers: ["operator-1", "dealer-alpha"],
      payload: {
        reason: "manual hold"
      }
    });
    expect(mapCancelRfqCommand(rfq, "subscriber-1").choice).toBe("Cancel");
    expect(mapRejectRfqCommand(rfq, "dealer-alpha").payload.reason).toBeNull();
    expect(mapRejectRfqCommand(rfq, "dealer-alpha", "manual").payload.reason).toBe("manual");
    expect(mapDealerInvitationToCantonCommand(invitation)).toEqual({
      action: "upsert_contract",
      template: "DealerInvitation",
      key: "invitation-1",
      submitter: "subscriber-1",
      observers: ["dealer-alpha", "subscriber-1"],
      payload: {
        pairId: "pair-1",
        rfqId: "rfq-1",
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        invitedAt: "2026-04-02T00:01:30.000Z",
        invitedBy: "subscriber-1",
        invitationVersion: 1,
        responseWindowClosesAt: "2026-04-02T00:05:00.000Z",
        status: "responded",
        respondedAt: "2026-04-02T00:02:00.000Z",
        withdrawnAt: null,
        withdrawnBy: null,
        withdrawalReason: null
      }
    });
    const openInvitation: DealerInvitation = {
      ...invitation,
      status: "open"
    };
    delete openInvitation.respondedAt;
    expect(mapDealerInvitationToCantonCommand(openInvitation).payload.respondedAt).toBeNull();
    expect(mapDarkOrderToCantonCommand(darkOrder)).toEqual({
      action: "upsert_contract",
      template: "DarkOrder",
      key: "dark-order-1",
      submitter: "subscriber-1",
      observers: ["subscriber-1"],
      payload: {
        orderId: "dark-order-1",
        clientOrderId: "dark-client-1",
        pairId: "pair-1",
        subscriberId: "subscriber-1",
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 10,
        limitPrice: 100.5,
        status: "open",
        createdAt: "2026-04-02T00:02:30.000Z",
        updatedAt: "2026-04-02T00:02:30.000Z",
        expiresAt: null,
        cancelledAt: null,
        cancelledBy: null,
        executedAt: null,
        executionId: null
      }
    });
    expect(mapOrderLockToCantonCommand(orderLock)).toEqual({
      action: "upsert_contract",
      template: "OrderLock",
      key: "lock-1",
      submitter: "operator-1",
      observers: ["subscriber-1"],
      payload: {
        lockId: "lock-1",
        pairId: "pair-1",
        orderId: "dark-order-1",
        proposalId: "proposal-1",
        subscriberId: "subscriber-1",
        lockedAt: "2026-04-02T00:02:45.000Z",
        lockedBy: "operator-1",
        lockExpiresAt: "2026-04-02T00:03:15.000Z",
        status: "active",
        updatedAt: "2026-04-02T00:02:45.000Z",
        releasedAt: null,
        releasedBy: null,
        releaseReason: null
      }
    });
    expect(mapMatchProposalToCantonCommand(matchProposal)).toEqual({
      action: "upsert_contract",
      template: "MatchProposal",
      key: "proposal-1",
      submitter: "operator-1",
      observers: ["subscriber-1", "subscriber-2"],
      payload: {
        proposalId: "proposal-1",
        pairId: "pair-1",
        instrumentId: "CUSIP-1",
        quantity: 10,
        price: 100.5,
        buyOrderId: "dark-order-1",
        sellOrderId: "dark-order-2",
        buySubscriberId: "subscriber-1",
        sellSubscriberId: "subscriber-2",
        buyLockId: "lock-1",
        sellLockId: "lock-2",
        buyResponse: "pending",
        sellResponse: "pending",
        status: "pending",
        createdAt: "2026-04-02T00:02:45.000Z",
        createdBy: "operator-1",
        expiresAt: "2026-04-02T00:03:15.000Z",
        updatedAt: "2026-04-02T00:02:45.000Z",
        acceptedAt: null,
        buyAcceptedAt: null,
        sellAcceptedAt: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        executionId: null
      }
    });
    expect(mapAcceptQuoteCommand(quote, "subscriber-1").choice).toBe("Accept");
    expect(mapQuoteRevisionToCantonCommand(quoteRevision)).toEqual({
      action: "upsert_contract",
      template: "QuoteRevision",
      key: "revision-1",
      submitter: "dealer-alpha",
      observers: ["dealer-alpha", "subscriber-1"],
      payload: {
        pairId: "pair-1",
        rfqId: "rfq-1",
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        previousQuoteId: "quote-0",
        nextQuoteId: "quote-1",
        revisedAt: "2026-04-02T00:02:00.000Z"
      }
    });
    expect(mapQuoteWithdrawalToCantonCommand(quoteWithdrawal)).toEqual({
      action: "upsert_contract",
      template: "QuoteWithdrawal",
      key: "withdrawal-1",
      submitter: "dealer-alpha",
      observers: ["dealer-alpha", "subscriber-1"],
      payload: {
        pairId: "pair-1",
        rfqId: "rfq-1",
        quoteId: "quote-0",
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        withdrawnAt: "2026-04-02T00:01:59.000Z",
        reason: "replaced"
      }
    });
    const withdrawalWithoutReason: QuoteWithdrawal = { ...quoteWithdrawal };
    delete withdrawalWithoutReason.reason;
    expect(mapQuoteWithdrawalToCantonCommand(withdrawalWithoutReason).payload.reason).toBeNull();
    expect(mapExecutionTicketToCantonCommand(darkExecution)).toEqual({
      action: "upsert_contract",
      template: "ExecutionTicket",
      key: "execution-dark-1",
      submitter: "subscriber-1",
      observers: ["subscriber-1", "subscriber-2"],
      payload: {
        pairId: "pair-1",
        executionKind: "dark_cross",
        rfqId: null,
        quoteId: null,
        dealerId: null,
        subscriberId: null,
        instrumentId: "CUSIP-1",
        side: null,
        quantity: 10,
        price: 100.5,
        acceptedAt: "2026-04-02T00:03:30.000Z",
        matchProposalId: "proposal-1",
        buyOrderId: "dark-order-1",
        sellOrderId: "dark-order-2",
        buySubscriberId: "subscriber-1",
        sellSubscriberId: "subscriber-2"
      }
    });
    const sellSubmittedExecution: ExecutionTicket = {
      ...darkExecution,
      sellSubscriberId: "subscriber-2"
    };
    delete sellSubmittedExecution.buySubscriberId;
    expect(mapExecutionTicketToCantonCommand(sellSubmittedExecution).submitter).toBe(
      "subscriber-2"
    );
    const systemSubmittedExecution: ExecutionTicket = { ...darkExecution };
    delete systemSubmittedExecution.buySubscriberId;
    delete systemSubmittedExecution.sellSubscriberId;
    expect(mapExecutionTicketToCantonCommand(systemSubmittedExecution).submitter).toBe("system");
    expect(mapSettlementInstructionToCantonCommand(darkSettlement)).toEqual({
      action: "upsert_contract",
      template: "SettlementInstruction",
      key: "settlement-dark-1",
      submitter: "settler-1",
      observers: [],
      payload: {
        pairId: "pair-1",
        executionId: "execution-dark-1",
        status: "pending",
        createdAt: "2026-04-02T00:03:30.000Z",
        updatedAt: "2026-04-02T00:03:30.000Z",
        settlementKind: "dark_cross",
        matchProposalId: "proposal-1",
        buyOrderId: "dark-order-1",
        sellOrderId: "dark-order-2",
        subscriberId: null,
        sellSubscriberId: null,
        dealerId: null,
        settlementAgentId: "settler-1"
      }
    });
    expect(
      mapSettlementInstructionToCantonCommand({
        ...settlement,
        subscriberId: "subscriber-1",
        dealerId: "dealer-alpha"
      }).observers
    ).toEqual(["subscriber-1", "dealer-alpha"]);
    expect(mapProgressSettlementCommand(settlement, "operator-1", "affirmed").payload.status).toBe(
      "affirmed"
    );
    expect(
      mapAuditRecordToCantonCommand({
        action: "open_rfq",
        actorId: "subscriber-1",
        at: "2026-04-02T00:01:00.000Z",
        detail: "RFQ opened.",
        pairId: "pair-1"
      })
    ).toEqual({
      action: "upsert_contract",
      template: "AuditRecord",
      key: "pair-1:2026-04-02T00:01:00.000Z:open_rfq",
      submitter: "subscriber-1",
      observers: ["subscriber-1"],
      payload: {
        pairId: "pair-1",
        action: "open_rfq",
        detail: "RFQ opened.",
        entityId: null,
        at: "2026-04-02T00:01:00.000Z"
      }
    });
  });

  it("provides a clean Canton-backed ledger and audit seam", async () => {
    const transport = createStubCantonTransport();
    const ledger = createCantonLedgerPort(transport);
    const auditLog = createCantonAuditLogPort(transport);
    const auditEntry: AuditRecord = {
      action: "accept_quote",
      actorId: "subscriber-1",
      at: "2026-04-02T00:03:00.000Z",
      detail: "Quote accepted.",
      entityId: "quote-1",
      pairId: "pair-1"
    };

    expect(await transport.query({ template: "Missing", key: "missing" })).toBeNull();
    expect(await ledger.getPair("missing")).toBeNull();
    expect(await ledger.getRfq("missing")).toBeNull();
    expect(await ledger.getQuote("missing")).toBeNull();
    expect(await ledger.getDarkOrder("missing")).toBeNull();
    expect(await ledger.getOrderLock("missing")).toBeNull();
    expect(await ledger.getMatchProposal("missing")).toBeNull();
    expect(await ledger.getExecutionTicket("missing")).toBeNull();
    expect(await ledger.getSettlementInstruction("missing")).toBeNull();
    expect(await ledger.listPairs()).toEqual([]);
    expect(await ledger.listAccessGrants("missing")).toEqual([]);
    expect(await ledger.listRfqs("missing")).toEqual([]);
    expect(await ledger.listQuotes("missing")).toEqual([]);
    expect(await ledger.listDarkOrders("missing")).toEqual([]);
    expect(await ledger.listInvitations("missing")).toEqual([]);
    expect(await ledger.listOrderLocks("missing")).toEqual([]);
    expect(await ledger.listMatchProposals("missing")).toEqual([]);
    expect(await ledger.listQuoteRevisions("missing")).toEqual([]);
    expect(await ledger.listQuoteWithdrawals("missing")).toEqual([]);
    expect(await ledger.listExecutionTickets("missing")).toEqual([]);
    expect(await ledger.listSettlementInstructions("missing")).toEqual([]);
    expect(await auditLog.list("missing")).toEqual([]);

    transport.prime("ReferencePrice", "pair-1:CUSIP-1", 100.5);
    expect(await transport.query({ template: "ReferencePrice", key: "pair-1:CUSIP-1" })).toBe(
      100.5
    );

    await ledger.savePair(pair);
    await ledger.saveAccessGrant(grant);
    await ledger.saveRfq(rfq);
    await ledger.saveQuote(quote);
    await ledger.saveDarkOrder(darkOrder);
    await ledger.saveInvitation(invitation);
    await ledger.saveOrderLock(orderLock);
    await ledger.saveMatchProposal(matchProposal);
    await ledger.saveQuoteRevision(quoteRevision);
    await ledger.saveQuoteWithdrawal(quoteWithdrawal);
    await ledger.saveExecutionTicket(execution);
    await ledger.saveSettlementInstruction(settlement);
    await auditLog.record(auditEntry);

    expect(await ledger.getPair("pair-1")).toEqual(pair);
    expect(await ledger.getQuote("quote-1")).toEqual(quote);
    expect(await ledger.getDarkOrder("dark-order-1")).toEqual(darkOrder);
    expect(await ledger.getOrderLock("lock-1")).toEqual(orderLock);
    expect(await ledger.getMatchProposal("proposal-1")).toEqual(matchProposal);
    expect(await ledger.getExecutionTicket("execution-1")).toEqual(execution);
    expect(await ledger.getSettlementInstruction("settlement-1")).toEqual(settlement);
    expect(await ledger.listPairs()).toEqual([pair]);
    expect(await ledger.listAccessGrants("pair-1")).toEqual([grant]);
    expect(await ledger.listRfqs("pair-1")).toEqual([rfq]);
    expect(await ledger.listQuotes("pair-1")).toEqual([quote]);
    expect(await ledger.listDarkOrders("pair-1")).toEqual([darkOrder]);
    expect(await ledger.listInvitations("pair-1")).toEqual([invitation]);
    expect(await ledger.listOrderLocks("pair-1")).toEqual([orderLock]);
    expect(await ledger.listMatchProposals("pair-1")).toEqual([matchProposal]);
    expect(await ledger.listQuoteRevisions("pair-1")).toEqual([quoteRevision]);
    expect(await ledger.listQuoteWithdrawals("pair-1")).toEqual([quoteWithdrawal]);
    expect(await ledger.listExecutionTickets("pair-1")).toEqual([execution]);
    expect(await ledger.listSettlementInstructions("pair-1")).toEqual([settlement]);
    expect(await auditLog.list()).toEqual([auditEntry]);
    expect(await auditLog.list("pair-1")).toEqual([auditEntry]);
    expect(transport.submissions().map((submission) => submission.template)).toEqual([
      "OperatorApproval",
      "RegulatoryAttestation",
      "RulebookRelease",
      "PauseState",
      "PairInstance",
      "AccessGrant",
      "RFQSession",
      "DealerQuote",
      "DarkOrder",
      "DealerInvitation",
      "OrderLock",
      "MatchProposal",
      "QuoteRevision",
      "QuoteWithdrawal",
      "ExecutionTicket",
      "SettlementInstruction",
      "AuditRecord"
    ]);
  });
});
