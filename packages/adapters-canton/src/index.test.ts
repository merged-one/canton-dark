import { describe, expect, it } from "vitest";

import {
  createAccessGrant,
  createDarkOrder,
  createExecutionFromQuote,
  createMatchProposal,
  createPairInstance,
  createQuote,
  createRfq
} from "@canton-dark/domain-core";

import {
  createCantonLedgerPort,
  createCantonNotificationPort,
  createCantonReferencePricePort,
  createCantonSettlementPort,
  createStubCantonTransport,
  mapAccessGrantToCantonCommand,
  mapPairToCantonCommand
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

const pair = createPairInstance({
  pairId: "pair-1",
  mode: "SingleDealerPair",
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
    releaseId: "rulebook-1",
    version: "v1",
    effectiveAt: createdAt,
    publishedBy: "operator-1",
    summary: "initial"
  }
});

describe("adapters-canton", () => {
  it("maps domain objects into Canton submission commands", () => {
    const grant = createAccessGrant({
      grantId: "grant-1",
      pairId: "pair-1",
      subjectId: "subscriber-1",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });

    expect(mapPairToCantonCommand(pair)).toEqual({
      resource: "PairInstance",
      key: "pair-1",
      submitter: "operator-1",
      observers: ["dealer-alpha", "operator-1"],
      payload: {
        pairId: "pair-1",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        pauseState: {
          state: "active",
          changedAt: createdAt,
          changedBy: "operator-1"
        },
        rulebookVersion: "v1",
        regulatoryAttestation: {
          status: "attested",
          attestedAt: createdAt,
          attestedBy: "auditor-1",
          jurisdiction: "US"
        },
        operatorApproval: {
          status: "approved",
          approvedAt: createdAt,
          approvedBy: "operator-1"
        }
      }
    });
    expect(mapAccessGrantToCantonCommand(grant)).toEqual({
      resource: "AccessGrant",
      key: "grant-1",
      submitter: "operator-1",
      observers: ["subscriber-1"],
      payload: {
        pairId: "pair-1",
        subjectId: "subscriber-1",
        role: "subscriber",
        entitlements: ["submit_dark_order", "submit_rfq", "view_pair"],
        revokedAt: null,
        revokedBy: null
      }
    });
  });

  it("provides a clean ledger and boundary transport seam", async () => {
    const transport = createStubCantonTransport();
    const ledger = createCantonLedgerPort(transport);
    const subscriberGrant = createAccessGrant({
      grantId: "grant-subscriber",
      pairId: "pair-1",
      subjectId: "subscriber-1",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const dealerGrant = createAccessGrant({
      grantId: "grant-dealer",
      pairId: "pair-1",
      subjectId: "dealer-alpha",
      role: "dealer",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const rfq = createRfq({
      rfqId: "rfq-1",
      pair,
      accessGrants: [subscriberGrant, dealerGrant],
      requesterId: "subscriber-1",
      directedDealerIds: ["dealer-alpha"],
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 10,
      createdAt,
      expiresAt: "2026-04-02T00:05:00.000Z"
    });
    const quote = createQuote({
      quoteId: "quote-1",
      pair,
      rfq,
      accessGrants: [subscriberGrant, dealerGrant],
      dealerId: "dealer-alpha",
      price: 100.5,
      quantity: 10,
      createdAt,
      expiresAt: "2026-04-02T00:04:00.000Z"
    });
    const execution = createExecutionFromQuote({
      executionId: "execution-1",
      pair,
      quote,
      rfq,
      createdAt
    });
    const atsPair = createPairInstance({
      pairId: "pair-2",
      mode: "ATSPair",
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
    });
    const atsSubscriberGrant = createAccessGrant({
      grantId: "grant-subscriber-2",
      pairId: "pair-2",
      subjectId: "subscriber-2",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const atsSubscriberGrantTwo = createAccessGrant({
      grantId: "grant-subscriber-3",
      pairId: "pair-2",
      subjectId: "subscriber-3",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const buyOrder = createDarkOrder({
      orderId: "order-buy",
      pair: atsPair,
      accessGrants: [atsSubscriberGrant],
      participantId: "subscriber-2",
      side: "buy",
      quantity: 5,
      limitPrice: 101,
      createdAt
    });
    const sellOrder = createDarkOrder({
      orderId: "order-sell",
      pair: atsPair,
      accessGrants: [atsSubscriberGrantTwo],
      participantId: "subscriber-3",
      side: "sell",
      quantity: 5,
      limitPrice: 100,
      createdAt
    });
    const match = createMatchProposal({
      proposalId: "proposal-1",
      pair: atsPair,
      buyOrder,
      sellOrder,
      proposedPrice: 100.5,
      proposedQuantity: 5,
      referencePrice: 100.5,
      createdAt
    });

    await ledger.savePair(pair);
    await ledger.saveAccessGrant(subscriberGrant);
    await ledger.saveRfq(rfq);
    await ledger.saveQuote(quote);
    await ledger.saveExecution(execution);
    await ledger.saveDarkOrder(buyOrder);
    await ledger.saveMatchProposal(match);
    await ledger.append({
      type: "pair.registered",
      pairId: pair.pairId,
      aggregateId: pair.pairId,
      eventId: "event-1",
      occurredAt: createdAt,
      payload: pair
    });
    await ledger.append({
      type: "access.granted",
      pairId: pair.pairId,
      aggregateId: subscriberGrant.grantId,
      eventId: "event-2",
      occurredAt: createdAt,
      payload: subscriberGrant
    });
    await ledger.append({
      type: "rfq.submitted",
      pairId: pair.pairId,
      aggregateId: rfq.rfqId,
      eventId: "event-3",
      occurredAt: createdAt,
      payload: rfq
    });
    await ledger.append({
      type: "quote.recorded",
      pairId: pair.pairId,
      aggregateId: quote.quoteId,
      eventId: "event-4",
      occurredAt: createdAt,
      payload: quote
    });
    await ledger.append({
      type: "execution.recorded",
      pairId: pair.pairId,
      aggregateId: execution.executionId,
      eventId: "event-5",
      occurredAt: createdAt,
      payload: execution
    });
    await ledger.append({
      type: "dark-order.submitted",
      pairId: atsPair.pairId,
      aggregateId: buyOrder.orderId,
      eventId: "event-6",
      occurredAt: createdAt,
      payload: buyOrder
    });
    await ledger.append({
      type: "match.proposed",
      pairId: atsPair.pairId,
      aggregateId: match.proposalId,
      eventId: "event-7",
      occurredAt: createdAt,
      payload: match
    });

    expect(await ledger.getPair("pair-1")).toEqual(pair);
    expect(await ledger.getRfq("rfq-1")).toEqual(rfq);
    expect(await ledger.getQuote("quote-1")).toEqual(quote);
    expect(await ledger.getDarkOrder("order-buy")).toEqual(buyOrder);
    expect(await ledger.listAccessGrants("pair-1")).toEqual([subscriberGrant]);
    expect(await ledger.listQuotes("pair-1")).toEqual([quote]);
    expect(await ledger.listRfqs("pair-1")).toEqual([rfq]);
    expect(await ledger.listExecutions("pair-1")).toEqual([execution]);
    expect(await ledger.listDarkOrders("pair-2")).toEqual([buyOrder]);
    expect(await ledger.listMatchProposals("pair-2")).toEqual([match]);
    expect((await ledger.listEvents("pair-1")).map((event) => event.type)).toEqual([
      "pair.registered",
      "access.granted",
      "rfq.submitted",
      "quote.recorded",
      "execution.recorded"
    ]);
    expect((await ledger.listEvents()).map((event) => event.type)).toEqual([
      "pair.registered",
      "access.granted",
      "rfq.submitted",
      "quote.recorded",
      "execution.recorded",
      "dark-order.submitted",
      "match.proposed"
    ]);
    expect(transport.submissions().map((submission) => submission.resource)).toEqual([
      "PairInstance",
      "AccessGrant",
      "RFQ",
      "Quote",
      "Execution",
      "DarkOrder",
      "MatchProposal"
    ]);
  });

  it("supports notification, settlement, and reference-price boundaries", async () => {
    const transport = createStubCantonTransport();
    const notificationPort = createCantonNotificationPort(transport);
    const settlementPort = createCantonSettlementPort(transport, "affirmed");
    const referencePricePort = createCantonReferencePricePort(transport, 99.5);

    transport.prime("ReferencePrice", "pair-1:CUSIP-1", 100.25);

    await notificationPort.send({
      at: createdAt,
      kind: "rfq_submitted",
      pairId: "pair-1",
      recipientIds: ["dealer-alpha"],
      subject: "RFQ submitted",
      detail: "rfq-1"
    });
    expect(
      await settlementPort.submit({
        executionId: "execution-1",
        pairId: "pair-1",
        source: "rfq",
        buyerId: "subscriber-1",
        sellerId: "dealer-alpha",
        price: 100.5,
        quantity: 10,
        createdAt,
        settlementStatus: "pending"
      })
    ).toBe("affirmed");
    expect(await referencePricePort.get("pair-1", "CUSIP-1")).toBe(100.25);
    expect(await referencePricePort.get("pair-1", "CUSIP-2")).toBe(99.5);
    expect(transport.submissions().map((submission) => submission.resource)).toEqual([
      "Notification",
      "Execution"
    ]);
  });

  it("returns null and empty results for uncached Canton reads", async () => {
    const transport = createStubCantonTransport();
    const ledger = createCantonLedgerPort(transport);

    expect(await ledger.getDarkOrder("missing")).toBeNull();
    expect(await ledger.getPair("missing")).toBeNull();
    expect(await ledger.getQuote("missing")).toBeNull();
    expect(await ledger.getRfq("missing")).toBeNull();
    expect(await ledger.listAccessGrants("missing")).toEqual([]);
  });
});
