import { describe, expect, it } from "vitest";

import {
  createDeterministicClock,
  createInMemoryAuditLogPort,
  createInMemoryLedgerPort,
  createMemoryVenueEnvironment,
  createSeededIdGenerator
} from "./index";

describe("adapters-memory", () => {
  it("provides deterministic clocks and seeded ids", () => {
    const clock = createDeterministicClock("2026-04-02T00:00:00.000Z");
    const ids = createSeededIdGenerator(123);
    const defaultEnvironment = createMemoryVenueEnvironment();
    const defaultIds = createSeededIdGenerator(424242);

    expect(clock.now().toISOString()).toBe("2026-04-02T00:00:00.000Z");
    clock.advanceBy(5_000);
    expect(clock.now().toISOString()).toBe("2026-04-02T00:00:05.000Z");
    clock.set("2026-04-02T00:00:10.000Z");
    expect(clock.now().toISOString()).toBe("2026-04-02T00:00:10.000Z");
    expect(ids.seed).toBe(123);
    expect(ids.nextId("pair")).toBe("pair-00003f-000001");
    expect(ids.nextId("pair")).toBe("pair-00003f-000002");
    expect(defaultEnvironment.idGenerator.seed).toBe(424242);
    expect(defaultEnvironment.idGenerator.nextId("pair")).toBe(defaultIds.nextId("pair"));
  });

  it("exposes direct ledger and audit primitives for deterministic tests", async () => {
    const ledger = createInMemoryLedgerPort();
    const auditLog = createInMemoryAuditLogPort();

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

    await ledger.savePair({
      pairId: "pair-1",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      dealerIds: ["dealer-alpha"],
      operatorOversightRole: "full",
      inviteRevisionPolicy: "locked",
      createdAt: "2026-04-02T00:00:00.000Z",
      updatedAt: "2026-04-02T00:00:00.000Z",
      operatorApproval: {
        status: "approved",
        approvedAt: "2026-04-02T00:00:00.000Z",
        approvedBy: "operator-1"
      },
      regulatoryAttestation: {
        status: "attested",
        attestedAt: "2026-04-02T00:00:00.000Z",
        attestedBy: "auditor-1",
        jurisdiction: "US"
      },
      rulebookRelease: {
        releaseId: "rulebook-1",
        version: "v1",
        effectiveAt: "2026-04-02T00:00:00.000Z",
        publishedBy: "operator-1",
        summary: "initial"
      },
      pauseState: {
        state: "active",
        changedAt: "2026-04-02T00:00:00.000Z",
        changedBy: "operator-1"
      }
    });
    await ledger.saveAccessGrant({
      grantId: "grant-1",
      pairId: "pair-1",
      subjectId: "subscriber-1",
      role: "subscriber",
      grantedAt: "2026-04-02T00:00:00.000Z",
      grantedBy: "operator-1",
      entitlements: ["accept_quote", "submit_rfq", "view_pair"]
    });
    await ledger.saveRfq({
      rfqId: "rfq-1",
      pairId: "pair-1",
      dealerId: "dealer-alpha",
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 10,
      createdAt: "2026-04-02T00:01:00.000Z",
      updatedAt: "2026-04-02T00:01:00.000Z",
      status: "open"
    });
    await ledger.saveQuote({
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
    });
    await ledger.saveDarkOrder({
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
    });
    await ledger.saveInvitation({
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
    });
    await ledger.saveOrderLock({
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
    });
    await ledger.saveMatchProposal({
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
    });
    await ledger.saveQuoteRevision({
      revisionId: "revision-1",
      pairId: "pair-1",
      rfqId: "rfq-1",
      dealerId: "dealer-alpha",
      subscriberId: "subscriber-1",
      previousQuoteId: "quote-0",
      nextQuoteId: "quote-1",
      revisedAt: "2026-04-02T00:02:00.000Z",
      revisedBy: "dealer-alpha"
    });
    await ledger.saveQuoteWithdrawal({
      withdrawalId: "withdrawal-1",
      pairId: "pair-1",
      rfqId: "rfq-1",
      quoteId: "quote-0",
      dealerId: "dealer-alpha",
      subscriberId: "subscriber-1",
      withdrawnAt: "2026-04-02T00:01:59.000Z",
      withdrawnBy: "dealer-alpha",
      reason: "replaced"
    });
    await ledger.saveExecutionTicket({
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
    });
    await ledger.saveSettlementInstruction({
      instructionId: "settlement-1",
      executionId: "execution-1",
      pairId: "pair-1",
      status: "pending",
      createdAt: "2026-04-02T00:03:00.000Z",
      updatedAt: "2026-04-02T00:03:00.000Z"
    });
    await auditLog.record({
      action: "open_rfq",
      actorId: "subscriber-1",
      at: "2026-04-02T00:01:00.000Z",
      detail: "RFQ opened.",
      entityId: "rfq-1",
      pairId: "pair-1"
    });

    expect(await ledger.listPairs()).toHaveLength(1);
    expect(await ledger.listAccessGrants("pair-1")).toHaveLength(1);
    expect(await ledger.listRfqs("pair-1")).toHaveLength(1);
    expect(await ledger.listQuotes("pair-1")).toHaveLength(1);
    expect(await ledger.listDarkOrders("pair-1")).toHaveLength(1);
    expect(await ledger.listInvitations("pair-1")).toHaveLength(1);
    expect(await ledger.listOrderLocks("pair-1")).toHaveLength(1);
    expect(await ledger.listMatchProposals("pair-1")).toHaveLength(1);
    expect(await ledger.listQuoteRevisions("pair-1")).toHaveLength(1);
    expect(await ledger.listQuoteWithdrawals("pair-1")).toHaveLength(1);
    expect(await ledger.listExecutionTickets("pair-1")).toHaveLength(1);
    expect(await ledger.listSettlementInstructions("pair-1")).toHaveLength(1);
    expect(await auditLog.list("pair-1")).toEqual([
      {
        action: "open_rfq",
        actorId: "subscriber-1",
        at: "2026-04-02T00:01:00.000Z",
        detail: "RFQ opened.",
        entityId: "rfq-1",
        pairId: "pair-1"
      }
    ]);
    expect(auditLog.entries()).toHaveLength(1);
    expect(ledger.snapshot()).toEqual({
      pairs: await ledger.listPairs(),
      accessGrants: await ledger.listAccessGrants("pair-1"),
      darkOrders: await ledger.listDarkOrders("pair-1"),
      rfqs: await ledger.listRfqs("pair-1"),
      quotes: await ledger.listQuotes("pair-1"),
      invitations: await ledger.listInvitations("pair-1"),
      orderLocks: await ledger.listOrderLocks("pair-1"),
      matchProposals: await ledger.listMatchProposals("pair-1"),
      quoteRevisions: await ledger.listQuoteRevisions("pair-1"),
      quoteWithdrawals: await ledger.listQuoteWithdrawals("pair-1"),
      executions: await ledger.listExecutionTickets("pair-1"),
      settlements: await ledger.listSettlementInstructions("pair-1")
    });
  });

  it("runs the phase 1 lifecycle end to end through the in-memory adapter", async () => {
    const environment = createMemoryVenueEnvironment({
      seed: 77
    });

    const pair = await environment.application.createPair({
      actorId: "operator-1",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    environment.clock.advanceBy(1_000);
    await environment.application.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    environment.clock.advanceBy(1_000);
    const rfq = await environment.application.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 25
    });
    environment.clock.advanceBy(1_000);
    const quote = await environment.application.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 100.75,
      quantity: 25,
      expiresAt: "2026-04-02T00:05:00.000Z"
    });
    environment.clock.advanceBy(1_000);
    const accepted = await environment.application.acceptQuote({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: quote.quote.quoteId
    });

    expect(accepted.executionTicket.executionId).toBe("execution-000025-000001");
    expect(environment.ledger.snapshot().pairs).toHaveLength(1);
    expect(environment.ledger.snapshot().accessGrants).toHaveLength(3);
    expect(environment.ledger.snapshot().rfqs[0]?.status).toBe("accepted");
    expect(environment.ledger.snapshot().quotes[0]?.status).toBe("accepted");
    expect(environment.ledger.snapshot().executions).toHaveLength(1);
    expect(environment.ledger.snapshot().settlements).toHaveLength(1);
    expect(environment.auditLog.entries().map((entry) => entry.action)).toEqual([
      "grant_access",
      "grant_access",
      "create_pair",
      "grant_access",
      "open_rfq",
      "submit_quote",
      "accept_quote"
    ]);
  });
});
