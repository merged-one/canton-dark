import { describe, expect, it } from "vitest";

import type {
  AccessGrant,
  DarkOrder,
  Execution,
  MatchProposal,
  PairInstance,
  Quote,
  RFQ
} from "@canton-dark/domain-core";

import {
  buildVenueHealthReadModel,
  buildVenueHealthResponse,
  createVenueApplication,
  type AuditEntry,
  type LedgerEvent,
  type ProjectionCollection,
  type RiskAction,
  type VenueApplicationDependencies
} from "./index";

const startedAt = new Date("2026-04-02T00:00:00.000Z");

const createTestDependencies = (
  overrides: {
    riskRejectAction?: RiskAction;
    riskReason?: string;
    settlementStatus?: "affirmed" | "pending";
  } = {}
) => {
  let nowIndex = 0;
  const ids = new Map<string, number>();
  const pairStore = new Map<string, PairInstance>();
  const accessStore = new Map<string, AccessGrant[]>();
  const rfqStore = new Map<string, RFQ>();
  const quoteStore = new Map<string, Quote>();
  const executionStore = new Map<string, Execution>();
  const darkOrderStore = new Map<string, DarkOrder>();
  const matchStore = new Map<string, MatchProposal>();
  const projectionStore = new Map<ProjectionCollection, Map<string, unknown>>([
    ["pair-summary", new Map()],
    ["health", new Map()],
    ["access", new Map()],
    ["activity", new Map()],
    ["dashboard", new Map()]
  ]);
  const events: LedgerEvent[] = [];
  const audits: AuditEntry[] = [];
  const notifications: { detail: string; recipientIds: readonly string[]; subject: string }[] = [];
  const settlementSubmissions: Execution[] = [];

  const deps: VenueApplicationDependencies = {
    clock: {
      now: () => new Date(startedAt.getTime() + nowIndex++ * 1_000)
    },
    idGenerator: {
      nextId: (namespace) => {
        const next = (ids.get(namespace) ?? 0) + 1;

        ids.set(namespace, next);

        return `${namespace}-${next.toString().padStart(6, "0")}`;
      }
    },
    ledger: {
      async append(event) {
        events.push(structuredClone(event));
      },
      async getDarkOrder(orderId) {
        return structuredClone(darkOrderStore.get(orderId) ?? null);
      },
      async getPair(pairId) {
        return structuredClone(pairStore.get(pairId) ?? null);
      },
      async getQuote(quoteId) {
        return structuredClone(quoteStore.get(quoteId) ?? null);
      },
      async getRfq(rfqId) {
        return structuredClone(rfqStore.get(rfqId) ?? null);
      },
      async listAccessGrants(pairId) {
        return structuredClone(accessStore.get(pairId) ?? []);
      },
      async listDarkOrders(pairId) {
        return structuredClone(
          [...darkOrderStore.values()].filter((order) => order.pairId === pairId)
        );
      },
      async listEvents(pairId) {
        return structuredClone(
          events.filter((event) => pairId === undefined || event.pairId === pairId)
        );
      },
      async listExecutions(pairId) {
        return structuredClone(
          [...executionStore.values()].filter((execution) => execution.pairId === pairId)
        );
      },
      async listMatchProposals(pairId) {
        return structuredClone([...matchStore.values()].filter((match) => match.pairId === pairId));
      },
      async listQuotes(pairId) {
        return structuredClone([...quoteStore.values()].filter((quote) => quote.pairId === pairId));
      },
      async listRfqs(pairId) {
        return structuredClone([...rfqStore.values()].filter((rfq) => rfq.pairId === pairId));
      },
      async saveAccessGrant(grant) {
        accessStore.set(grant.pairId, [
          ...(accessStore.get(grant.pairId) ?? []),
          structuredClone(grant)
        ]);
      },
      async saveDarkOrder(order) {
        darkOrderStore.set(order.orderId, structuredClone(order));
      },
      async saveExecution(execution) {
        executionStore.set(execution.executionId, structuredClone(execution));
      },
      async saveMatchProposal(proposal) {
        matchStore.set(proposal.proposalId, structuredClone(proposal));
      },
      async savePair(pair) {
        pairStore.set(pair.pairId, structuredClone(pair));
      },
      async saveQuote(quote) {
        quoteStore.set(quote.quoteId, structuredClone(quote));
      },
      async saveRfq(rfq) {
        rfqStore.set(rfq.rfqId, structuredClone(rfq));
      }
    },
    projections: {
      async get(collection, key) {
        return structuredClone(
          ((projectionStore.get(collection) ?? new Map()).get(key) ?? null) as unknown
        );
      },
      async put(collection, key, value) {
        const target = projectionStore.get(collection);

        if (target === undefined) {
          throw new Error(`Unknown projection collection ${collection}.`);
        }

        target.set(key, structuredClone(value));
      }
    },
    riskControl: {
      async evaluate(input) {
        return input.action === overrides.riskRejectAction
          ? {
              approved: false,
              ...(overrides.riskReason !== undefined ? { reason: overrides.riskReason } : {})
            }
          : { approved: true };
      }
    },
    settlement: {
      async submit(execution) {
        settlementSubmissions.push(structuredClone(execution));

        return overrides.settlementStatus ?? "affirmed";
      }
    },
    auditLog: {
      async record(entry) {
        audits.push(structuredClone(entry));
      }
    },
    notifications: {
      async send(message) {
        notifications.push({
          detail: message.detail,
          recipientIds: structuredClone(message.recipientIds),
          subject: message.subject
        });
      }
    },
    referencePrices: {
      async get() {
        return 100.5;
      }
    }
  };

  return {
    app: createVenueApplication(deps),
    state: {
      audits,
      events,
      notifications,
      pairStore,
      projectionStore,
      settlementSubmissions
    }
  };
};

describe("createVenueApplication", () => {
  it("runs the memory-friendly lifecycle end to end and writes projections", async () => {
    const { app, state } = createTestDependencies();
    const pair = await app.registerPair({
      actorId: "operator-1",
      mode: "ATSPair",
      operatorId: "operator-1",
      dealers: ["dealer-beta", "dealer-alpha"],
      jurisdiction: "US",
      rulebookVersion: "v1",
      rulebookSummary: "initial"
    });
    const grant = await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber",
      note: "subscriber access"
    });
    const secondGrant = await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-2",
      role: "subscriber"
    });
    const pausedPair = await app.pausePair({
      actorId: "operator-1",
      pairId: pair.pairId,
      state: "paused",
      reason: "supervisory review"
    });
    const activePair = await app.pausePair({
      actorId: "operator-1",
      pairId: pair.pairId,
      state: "active"
    });
    const rfq = await app.submitRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      directedDealerIds: ["dealer-alpha"],
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 150,
      expiresAt: "2026-04-02T00:30:00.000Z"
    });
    const quote = await app.recordQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 101.25,
      quantity: 150,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    const execution = await app.executeQuote({
      actorId: "operator-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: quote.quoteId
    });
    const buyOrder = await app.submitDarkOrder({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      side: "buy",
      quantity: 40,
      limitPrice: 101
    });
    const sellOrder = await app.submitDarkOrder({
      actorId: "subscriber-2",
      pairId: pair.pairId,
      side: "sell",
      quantity: 40,
      limitPrice: 100
    });
    const match = await app.proposeMatch({
      actorId: "operator-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-1",
      buyOrderId: buyOrder.orderId,
      sellOrderId: sellOrder.orderId,
      proposedPrice: 100.5,
      proposedQuantity: 40
    });

    expect(pair.dealers).toEqual(["dealer-alpha", "dealer-beta"]);
    expect(grant.note).toBe("subscriber access");
    expect(secondGrant.entitlements).toEqual(["submit_dark_order", "submit_rfq", "view_pair"]);
    expect(pausedPair.pauseState).toEqual({
      state: "paused",
      changedAt: "2026-04-02T00:00:09.000Z",
      changedBy: "operator-1",
      reason: "supervisory review"
    });
    expect(activePair.pauseState).toEqual({
      state: "active",
      changedAt: "2026-04-02T00:00:11.000Z",
      changedBy: "operator-1"
    });
    expect(execution.settlementStatus).toBe("affirmed");
    expect(match.referencePrice).toBe(100.5);
    expect(state.events.map((event) => event.type)).toEqual([
      "pair.registered",
      "access.granted",
      "access.granted",
      "access.granted",
      "access.granted",
      "access.granted",
      "pair.pause-state.updated",
      "pair.pause-state.updated",
      "rfq.submitted",
      "quote.recorded",
      "execution.recorded",
      "dark-order.submitted",
      "dark-order.submitted",
      "match.proposed"
    ]);
    expect(state.audits.map((entry) => entry.action)).toEqual([
      "register_pair",
      "grant_access",
      "grant_access",
      "pause_pair",
      "pause_pair",
      "submit_rfq",
      "record_quote",
      "execute_quote",
      "submit_dark_order",
      "submit_dark_order",
      "propose_match"
    ]);
    expect(state.notifications).toEqual([
      {
        subject: "Pair registered",
        detail: "pair-000001 is active under operator operator-1.",
        recipientIds: ["dealer-alpha", "dealer-beta", "operator-1"]
      },
      {
        subject: "Access granted",
        detail: "subscriber-1 now holds subscriber access for pair-000001.",
        recipientIds: ["subscriber-1"]
      },
      {
        subject: "Access granted",
        detail: "subscriber-2 now holds subscriber access for pair-000001.",
        recipientIds: ["subscriber-2"]
      },
      {
        subject: "Pair pause state updated",
        detail: "pair-000001 paused by operator-1.",
        recipientIds: ["dealer-alpha", "dealer-beta", "operator-1", "subscriber-1", "subscriber-2"]
      },
      {
        subject: "Pair pause state updated",
        detail: "pair-000001 reactivated by operator-1.",
        recipientIds: ["dealer-alpha", "dealer-beta", "operator-1", "subscriber-1", "subscriber-2"]
      },
      {
        subject: "RFQ submitted",
        detail: `RFQ ${rfq.rfqId} requires dealer response.`,
        recipientIds: ["dealer-alpha"]
      },
      {
        subject: "Quote recorded",
        detail: `Quote ${quote.quoteId} is available for RFQ ${rfq.rfqId}.`,
        recipientIds: ["subscriber-1"]
      },
      {
        subject: "Execution recorded",
        detail: `Execution ${execution.executionId} completed at 101.25.`,
        recipientIds: ["subscriber-1", "dealer-alpha"]
      }
    ]);
    expect(state.settlementSubmissions).toEqual([
      {
        executionId: execution.executionId,
        pairId: pair.pairId,
        source: "rfq",
        quoteId: quote.quoteId,
        quantity: 150,
        price: 101.25,
        buyerId: "subscriber-1",
        sellerId: "dealer-alpha",
        createdAt: execution.createdAt,
        settlementStatus: "pending"
      }
    ]);
    await expect(app.getPairSummary(pair.pairId)).resolves.toEqual({
      pairId: pair.pairId,
      mode: "ATSPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha", "dealer-beta"],
      paused: false,
      rulebookVersion: "v1",
      approvalStatus: "approved",
      attestationStatus: "attested"
    });
    await expect(app.getTradingActivity(pair.pairId)).resolves.toEqual({
      pairId: pair.pairId,
      rfqs: [
        {
          rfqId: rfq.rfqId,
          pairId: pair.pairId,
          requesterId: "subscriber-1",
          side: "buy",
          quantity: 150,
          status: "open",
          dealerCount: 1
        }
      ],
      quotes: [
        {
          quoteId: quote.quoteId,
          pairId: pair.pairId,
          dealerId: "dealer-alpha",
          price: 101.25,
          quantity: 150,
          status: "active"
        }
      ],
      executions: [
        {
          executionId: execution.executionId,
          pairId: pair.pairId,
          buyerId: "subscriber-1",
          sellerId: "dealer-alpha",
          price: 101.25,
          quantity: 150,
          settlementStatus: "affirmed",
          source: "rfq"
        }
      ],
      darkOrders: [
        {
          orderId: buyOrder.orderId,
          pairId: pair.pairId,
          participantId: "subscriber-1",
          side: "buy",
          quantity: 40,
          limitPrice: 101,
          status: "resting"
        },
        {
          orderId: sellOrder.orderId,
          pairId: pair.pairId,
          participantId: "subscriber-2",
          side: "sell",
          quantity: 40,
          limitPrice: 100,
          status: "resting"
        }
      ],
      matches: [
        {
          proposalId: match.proposalId,
          pairId: pair.pairId,
          proposedPrice: 100.5,
          proposedQuantity: 40,
          referencePrice: 100.5,
          status: "proposed"
        }
      ]
    });
    await expect(app.getVenueHealth(pair.pairId)).resolves.toEqual({
      title: "ATSPair kernel health",
      status: "healthy",
      detail:
        "Operator operator-1 governs 2 dealer perimeter(s) and 5 active participant grant(s).",
      summary: {
        pairId: pair.pairId,
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        paused: false,
        rulebookVersion: "v1",
        activeParticipantCount: 5,
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
    await expect(app.getPairDashboard(pair.pairId)).resolves.toEqual(
      expect.objectContaining({
        pair: await app.getPairSummary(pair.pairId),
        activity: await app.getTradingActivity(pair.pairId),
        health: await app.getVenueHealth(pair.pairId)
      })
    );
    await expect(app.getPairDashboard("missing")).resolves.toBeNull();
    expect(state.pairStore.get(pair.pairId)).toBeDefined();
    expect(state.projectionStore.get("dashboard")?.get(pair.pairId)).toBeDefined();
  });

  it("rejects unauthorized and missing workflows", async () => {
    const { app } = createTestDependencies({ settlementStatus: "pending" });
    const pair = await app.registerPair({
      actorId: "operator-1",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      jurisdiction: "US",
      rulebookVersion: "v1",
      rulebookSummary: "initial"
    });

    await expect(
      app.pausePair({
        actorId: "dealer-alpha",
        pairId: pair.pairId,
        state: "paused",
        reason: "not allowed"
      })
    ).rejects.toThrow("missing pause_pair permission");
    await expect(
      app.recordQuote({
        actorId: "dealer-alpha",
        pairId: pair.pairId,
        rfqId: "missing",
        price: 100,
        quantity: 10,
        expiresAt: "2026-04-02T00:05:00.000Z"
      })
    ).rejects.toThrow("RFQ missing was not found.");
    await expect(
      app.executeQuote({
        actorId: "operator-1",
        pairId: pair.pairId,
        rfqId: "missing",
        quoteId: "missing"
      })
    ).rejects.toThrow("RFQ missing was not found.");
    await expect(
      app.proposeMatch({
        actorId: "operator-1",
        pairId: pair.pairId,
        instrumentId: "CUSIP-1",
        buyOrderId: "buy-1",
        sellOrderId: "sell-1",
        proposedPrice: 100,
        proposedQuantity: 10
      })
    ).rejects.toThrow("Dark order buy-1 was not found.");
    await expect(
      app.proposeMatch({
        actorId: "operator-1",
        pairId: "missing",
        instrumentId: "CUSIP-1",
        buyOrderId: "buy-1",
        sellOrderId: "sell-1",
        proposedPrice: 100,
        proposedQuantity: 10
      })
    ).rejects.toThrow("Pair missing was not found.");
  });

  it("surfaces risk-control rejections", async () => {
    const { app } = createTestDependencies({ riskRejectAction: "register_pair" });

    await expect(
      app.registerPair({
        actorId: "operator-1",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      })
    ).rejects.toThrow("register_pair was rejected by risk controls.");

    const explicitRisk = createTestDependencies({
      riskRejectAction: "grant_access",
      riskReason: "manual supervisory rejection"
    });
    const pair = await explicitRisk.app.registerPair({
      actorId: "operator-1",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      jurisdiction: "US",
      rulebookVersion: "v1",
      rulebookSummary: "initial"
    });

    await expect(
      explicitRisk.app.grantAccess({
        actorId: "operator-1",
        pairId: pair.pairId,
        subjectId: "subscriber-1",
        role: "subscriber"
      })
    ).rejects.toThrow("manual supervisory rejection");
  });

  it("accepts explicit registration and grant overrides", async () => {
    const { app } = createTestDependencies();
    const pair = await app.registerPair({
      actorId: "operator-1",
      attestedBy: "auditor-1",
      pairId: "pair-explicit",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      jurisdiction: "US",
      rulebookReleaseId: "rulebook-explicit",
      rulebookVersion: "v2",
      rulebookSummary: "revised"
    });
    const grant = await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "auditor-1",
      role: "auditor",
      entitlements: ["view_audit"]
    });
    const delegatedOperator = await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "operator-2",
      role: "operator"
    });
    const paused = await app.pausePair({
      actorId: "operator-2",
      pairId: pair.pairId,
      state: "paused",
      reason: "delegated control"
    });

    expect(pair).toEqual({
      ...pair,
      pairId: "pair-explicit",
      regulatoryAttestation: {
        ...pair.regulatoryAttestation,
        attestedBy: "auditor-1"
      },
      rulebookRelease: {
        ...pair.rulebookRelease,
        releaseId: "rulebook-explicit",
        version: "v2",
        summary: "revised"
      }
    });
    expect(grant.entitlements).toEqual(["view_audit", "view_pair"]);
    expect(delegatedOperator.entitlements).toEqual([
      "approve_pair",
      "manage_access",
      "pause_pair",
      "view_audit",
      "view_pair"
    ]);
    expect(paused.pauseState).toEqual({
      state: "paused",
      changedAt: paused.updatedAt,
      changedBy: "operator-2",
      reason: "delegated control"
    });
  });
});

describe("draft health wrappers", () => {
  it("builds compatibility health read models and responses", () => {
    expect(
      buildVenueHealthReadModel({
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        marketingLabel: "Canton Dark Pair"
      })
    ).toEqual({
      title: "SingleDealerPair bootstrap",
      status: "healthy",
      detail: "Operator operator-1 has 1 directed dealer configuration(s).",
      summary: {
        pairId: "draft-preview",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        paused: false,
        rulebookVersion: "draft",
        activeParticipantCount: 2,
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
    expect(
      buildVenueHealthReadModel({
        mode: "ATSPair",
        operatorId: "operator-2",
        dealers: ["dealer-alpha", "dealer-beta"],
        marketingLabel: "Canton Dark ATS"
      }).summary
    ).toEqual({
      pairId: "draft-preview",
      mode: "ATSPair",
      operatorId: "operator-2",
      dealers: ["dealer-alpha", "dealer-beta"],
      paused: false,
      rulebookVersion: "draft",
      activeParticipantCount: 3,
      ledgerFacts: ["Shared RFQ state", "Shared execution state"],
      offLedgerFacts: [
        "Operator query cache",
        "Operator analytics",
        "Telemetry projection",
        "Transient UI state"
      ]
    });
    expect(
      buildVenueHealthResponse(
        {
          mode: "ATSPair",
          operatorId: " ",
          dealers: [],
          marketingLabel: "Operator stock market mirror"
        },
        () => new Date("2026-04-02T01:00:00.000Z")
      )
    ).toEqual({
      service: "venue-api",
      generatedAt: "2026-04-02T01:00:00.000Z",
      venue: {
        title: "ATSPair bootstrap",
        status: "rejected",
        detail: "3 venue policy issue(s) require remediation before launch.",
        summary: {
          pairId: "draft-preview",
          mode: "ATSPair",
          operatorId: "",
          dealers: [],
          paused: false,
          rulebookVersion: "draft",
          activeParticipantCount: 0,
          ledgerFacts: ["Shared RFQ state", "Shared execution state"],
          offLedgerFacts: [
            "Operator query cache",
            "Operator analytics",
            "Telemetry projection",
            "Transient UI state"
          ]
        },
        violations: [
          "OPERATOR_ID_REQUIRED: Each venue configuration must identify the owning operator.",
          "DISALLOWED_USER_FACING_TERM: User-facing labels must avoid the terms 'exchange' and 'stock market'.",
          "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER: ATSPair venues must configure at least one directed dealer."
        ]
      }
    });
    expect(
      buildVenueHealthReadModel({
        mode: "SingleDealerPair",
        operatorId: " ",
        dealers: [],
        marketingLabel: "Draft Pair"
      }).summary
    ).toEqual({
      pairId: "draft-preview",
      mode: "SingleDealerPair",
      operatorId: "",
      dealers: [],
      paused: false,
      rulebookVersion: "draft",
      activeParticipantCount: 0,
      ledgerFacts: ["Shared RFQ state", "Shared execution state"],
      offLedgerFacts: [
        "Operator query cache",
        "Operator analytics",
        "Telemetry projection",
        "Transient UI state"
      ]
    });
    expect(
      Number.isNaN(
        Date.parse(
          buildVenueHealthResponse({
            mode: "SingleDealerPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            marketingLabel: "Canton Dark Pair"
          }).generatedAt
        )
      )
    ).toBe(false);
  });
});
