import { describe, expect, it } from "vitest";

import {
  createDeterministicClock,
  createInMemoryLedgerPort,
  createInMemoryProjectionStore,
  createInMemoryReferencePricePort,
  createInMemoryRiskControlPort,
  createInMemoryVenueRegistry,
  createMemoryVenueEnvironment,
  createSeededIdGenerator
} from "./index";

describe("adapters-memory", () => {
  it("keeps draft registries isolated from caller mutations", () => {
    const registry = createInMemoryVenueRegistry({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });

    const draft = registry.get();
    draft.dealers.push("dealer-beta");

    registry.replace({
      mode: "ATSPair",
      operatorId: "operator-2",
      dealers: ["dealer-alpha", "dealer-beta"],
      marketingLabel: "Canton Dark ATS"
    });

    expect(registry.get()).toEqual({
      mode: "ATSPair",
      operatorId: "operator-2",
      dealers: ["dealer-alpha", "dealer-beta"],
      marketingLabel: "Canton Dark ATS"
    });
  });

  it("provides deterministic clocks, seeded ids, and static reference prices", async () => {
    const clock = createDeterministicClock("2026-04-02T00:00:00.000Z");
    const ids = createSeededIdGenerator(123);
    const referencePrices = createInMemoryReferencePricePort();

    expect(clock.now().toISOString()).toBe("2026-04-02T00:00:00.000Z");
    clock.advanceBy(5_000);
    expect(clock.now().toISOString()).toBe("2026-04-02T00:00:05.000Z");
    clock.set(new Date("2026-04-02T00:00:10.000Z"));
    expect(clock.now().toISOString()).toBe("2026-04-02T00:00:10.000Z");
    expect(ids.seed).toBe(123);
    expect(ids.nextId("pair")).toBe("pair-00003f-000001");
    expect(ids.nextId("pair")).toBe("pair-00003f-000002");
    expect(await referencePrices.get("pair-1", "CUSIP-1")).toBe(100);
    referencePrices.set("pair-1", "CUSIP-1", 99.5);
    expect(await referencePrices.get("pair-1", "CUSIP-1")).toBe(99.5);
  });

  it("runs a trivial scenario end to end through the in-memory ports", async () => {
    const environment = createMemoryVenueEnvironment({
      seed: 77,
      referencePrices: {
        "pair-00004h-000001:CUSIP-1": 100.25
      }
    });
    const pair = await environment.application.registerPair({
      actorId: "operator-1",
      mode: "ATSPair",
      operatorId: "operator-1",
      dealers: ["dealer-beta", "dealer-alpha"],
      jurisdiction: "US",
      rulebookVersion: "v1",
      rulebookSummary: "initial"
    });

    await environment.application.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });

    const rfq = await environment.application.submitRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      directedDealerIds: ["dealer-alpha"],
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 25,
      expiresAt: "2026-04-02T00:05:00.000Z"
    });
    const quote = await environment.application.recordQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 100.75,
      quantity: 25,
      expiresAt: "2026-04-02T00:04:00.000Z"
    });
    const execution = await environment.application.executeQuote({
      actorId: "operator-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: quote.quoteId
    });

    expect(execution.settlementStatus).toBe("affirmed");
    expect(environment.ledger.snapshot().events.map((event) => event.type)).toEqual([
      "pair.registered",
      "access.granted",
      "access.granted",
      "access.granted",
      "access.granted",
      "rfq.submitted",
      "quote.recorded",
      "execution.recorded"
    ]);
    expect(environment.projections.snapshot().health[pair.pairId]).toEqual({
      title: "ATSPair kernel health",
      status: "healthy",
      detail:
        "Operator operator-1 governs 2 dealer perimeter(s) and 4 active participant grant(s).",
      summary: {
        pairId: pair.pairId,
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        paused: false,
        rulebookVersion: "v1",
        activeParticipantCount: 4,
        ledgerFacts: ["Shared RFQ state", "Shared execution state"],
        offLedgerFacts: [
          "Operator query cache",
          "Operator analytics",
          "Telemetry projection",
          "Transient UI state"
        ]
      },
      violations: []
    });
    expect(environment.riskControl.decisions().map((decision) => decision.action)).toEqual([
      "register_pair",
      "grant_access",
      "submit_rfq",
      "record_quote",
      "execute_quote"
    ]);
    expect(environment.auditLog.entries().map((entry) => entry.action)).toEqual([
      "register_pair",
      "grant_access",
      "submit_rfq",
      "record_quote",
      "execute_quote"
    ]);
    expect(environment.notifications.messages().map((message) => message.subject)).toEqual([
      "Pair registered",
      "Access granted",
      "RFQ submitted",
      "Quote recorded",
      "Execution recorded"
    ]);
    expect(environment.settlement.submissions()).toEqual([
      {
        executionId: execution.executionId,
        pairId: pair.pairId,
        source: "rfq",
        quoteId: quote.quoteId,
        quantity: 25,
        price: 100.75,
        buyerId: "subscriber-1",
        sellerId: "dealer-alpha",
        createdAt: execution.createdAt,
        settlementStatus: "pending"
      }
    ]);
  });

  it("exposes direct ledger and projection primitives for deterministic tests", async () => {
    const ledger = createInMemoryLedgerPort();
    const projections = createInMemoryProjectionStore();

    expect(await ledger.getDarkOrder("missing")).toBeNull();
    expect(await ledger.getPair("missing")).toBeNull();
    expect(await ledger.getQuote("missing")).toBeNull();
    expect(await ledger.getRfq("missing")).toBeNull();
    expect(await ledger.listAccessGrants("missing")).toEqual([]);
    expect(await ledger.listDarkOrders("missing")).toEqual([]);
    expect(await ledger.listEvents()).toEqual([]);
    expect(await ledger.listExecutions("missing")).toEqual([]);
    expect(await ledger.listMatchProposals("missing")).toEqual([]);
    expect(await ledger.listQuotes("missing")).toEqual([]);
    expect(await ledger.listRfqs("missing")).toEqual([]);

    await ledger.saveAccessGrant({
      grantId: "grant-1",
      pairId: "pair-1",
      subjectId: "subject-1",
      role: "subscriber",
      grantedAt: "2026-04-02T00:00:00.000Z",
      grantedBy: "operator-1",
      entitlements: ["submit_dark_order"]
    });
    await ledger.saveDarkOrder({
      orderId: "order-1",
      pairId: "pair-1",
      participantId: "subject-1",
      side: "buy",
      quantity: 5,
      limitPrice: 100,
      createdAt: "2026-04-02T00:00:00.000Z",
      status: "resting"
    });
    await ledger.saveMatchProposal({
      proposalId: "proposal-1",
      pairId: "pair-1",
      buyOrderId: "order-1",
      sellOrderId: "order-2",
      proposedPrice: 100,
      proposedQuantity: 5,
      referencePrice: 99.5,
      createdAt: "2026-04-02T00:00:00.000Z",
      status: "proposed"
    });
    await ledger.append({
      type: "match.proposed",
      pairId: "pair-1",
      aggregateId: "proposal-1",
      eventId: "event-1",
      occurredAt: "2026-04-02T00:00:00.000Z",
      payload: {
        proposalId: "proposal-1"
      }
    });

    expect(await ledger.getDarkOrder("order-1")).toEqual({
      orderId: "order-1",
      pairId: "pair-1",
      participantId: "subject-1",
      side: "buy",
      quantity: 5,
      limitPrice: 100,
      createdAt: "2026-04-02T00:00:00.000Z",
      status: "resting"
    });
    expect(await ledger.listMatchProposals("pair-1")).toEqual([
      {
        proposalId: "proposal-1",
        pairId: "pair-1",
        buyOrderId: "order-1",
        sellOrderId: "order-2",
        proposedPrice: 100,
        proposedQuantity: 5,
        referencePrice: 99.5,
        createdAt: "2026-04-02T00:00:00.000Z",
        status: "proposed"
      }
    ]);
    expect(await ledger.listEvents()).toEqual([
      {
        type: "match.proposed",
        pairId: "pair-1",
        aggregateId: "proposal-1",
        eventId: "event-1",
        occurredAt: "2026-04-02T00:00:00.000Z",
        payload: {
          proposalId: "proposal-1"
        }
      }
    ]);
    expect(await projections.get("health", "pair-1")).toBeNull();
    await projections.put("health", "pair-1", {
      status: "healthy"
    });
    expect(await projections.get("health", "pair-1")).toEqual({
      status: "healthy"
    });
    await expect(projections.put("unknown" as never, "pair-1", {})).rejects.toThrow(
      "Unknown projection collection unknown."
    );
  });

  it("captures blocked and quantity-based risk decisions and default memory wiring", async () => {
    const riskControl = createInMemoryRiskControlPort({
      blockedActions: ["submit_rfq"],
      maxQuantity: 10
    });
    const environment = createMemoryVenueEnvironment();

    expect(environment.idGenerator.nextId("pair")).toBe("pair-0093ci-000001");
    expect(
      await riskControl.evaluate({
        action: "submit_rfq",
        actorId: "operator-1",
        pair: {
          pairId: "pair-1"
        } as never
      })
    ).toEqual({
      approved: false,
      reason: "submit_rfq is blocked in the in-memory adapter."
    });
    expect(
      await riskControl.evaluate({
        action: "record_quote",
        actorId: "dealer-alpha",
        pair: {
          pairId: "pair-1"
        } as never,
        quantity: 11
      })
    ).toEqual({
      approved: false,
      reason: "Quantity 11 exceeds the in-memory risk limit 10."
    });
    expect(
      await riskControl.evaluate({
        action: "grant_access",
        actorId: "operator-1",
        pair: {
          pairId: "pair-1"
        } as never,
        quantity: 1
      })
    ).toEqual({
      approved: true
    });
    expect(riskControl.decisions()).toEqual([
      {
        action: "submit_rfq",
        approved: false,
        pairId: "pair-1",
        reason: "submit_rfq is blocked in the in-memory adapter."
      },
      {
        action: "record_quote",
        approved: false,
        pairId: "pair-1",
        reason: "Quantity 11 exceeds the in-memory risk limit 10."
      },
      {
        action: "grant_access",
        approved: true,
        pairId: "pair-1"
      }
    ]);
  });
});
