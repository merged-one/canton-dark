import { describe, expect, it } from "vitest";

import type {
  AccessGrant,
  AuditRecord,
  DealerInvitation,
  DealerQuote,
  ExecutionTicket,
  PairInstance,
  QuoteRevision,
  QuoteWithdrawal,
  RFQSession,
  SettlementInstruction
} from "@canton-dark/domain-core";

import {
  createVenueApplication,
  type LedgerPort,
  type VenueApplicationDependencies
} from "./index";

const clone = <T>(value: T): T => structuredClone(value);

const createTestDependencies = () => {
  const ids = new Map<string, number>();
  const now = {
    value: new Date("2026-04-02T00:00:00.000Z")
  };
  const pairs = new Map<string, PairInstance>();
  const accessGrants = new Map<string, AccessGrant[]>();
  const rfqs = new Map<string, RFQSession>();
  const quotes = new Map<string, DealerQuote>();
  const invitations = new Map<string, DealerInvitation>();
  const quoteRevisions = new Map<string, QuoteRevision>();
  const quoteWithdrawals = new Map<string, QuoteWithdrawal>();
  const executions = new Map<string, ExecutionTicket>();
  const settlements = new Map<string, SettlementInstruction>();
  const audits: AuditRecord[] = [];

  const ledger: LedgerPort = {
    async getExecutionTicket(executionId) {
      return clone(executions.get(executionId) ?? null);
    },
    async getPair(pairId) {
      return clone(pairs.get(pairId) ?? null);
    },
    async getQuote(quoteId) {
      return clone(quotes.get(quoteId) ?? null);
    },
    async getRfq(rfqId) {
      return clone(rfqs.get(rfqId) ?? null);
    },
    async getSettlementInstruction(instructionId) {
      return clone(settlements.get(instructionId) ?? null);
    },
    async listAccessGrants(pairId) {
      return clone(accessGrants.get(pairId) ?? []);
    },
    async listExecutionTickets(pairId) {
      return clone([...executions.values()].filter((execution) => execution.pairId === pairId));
    },
    async listInvitations(pairId) {
      return clone([...invitations.values()].filter((invitation) => invitation.pairId === pairId));
    },
    async listPairs() {
      return clone([...pairs.values()]);
    },
    async listQuoteRevisions(pairId) {
      return clone([...quoteRevisions.values()].filter((revision) => revision.pairId === pairId));
    },
    async listQuoteWithdrawals(pairId) {
      return clone(
        [...quoteWithdrawals.values()].filter((withdrawal) => withdrawal.pairId === pairId)
      );
    },
    async listQuotes(pairId) {
      return clone([...quotes.values()].filter((quote) => quote.pairId === pairId));
    },
    async listRfqs(pairId) {
      return clone([...rfqs.values()].filter((rfq) => rfq.pairId === pairId));
    },
    async listSettlementInstructions(pairId) {
      return clone([...settlements.values()].filter((settlement) => settlement.pairId === pairId));
    },
    async saveAccessGrant(grant) {
      accessGrants.set(grant.pairId, [...(accessGrants.get(grant.pairId) ?? []), clone(grant)]);
    },
    async saveExecutionTicket(execution) {
      executions.set(execution.executionId, clone(execution));
    },
    async saveInvitation(invitation) {
      invitations.set(invitation.invitationId, clone(invitation));
    },
    async savePair(pair) {
      pairs.set(pair.pairId, clone(pair));
    },
    async saveQuote(quote) {
      quotes.set(quote.quoteId, clone(quote));
    },
    async saveQuoteRevision(revision) {
      quoteRevisions.set(revision.revisionId, clone(revision));
    },
    async saveQuoteWithdrawal(withdrawal) {
      quoteWithdrawals.set(withdrawal.withdrawalId, clone(withdrawal));
    },
    async saveRfq(rfq) {
      rfqs.set(rfq.rfqId, clone(rfq));
    },
    async saveSettlementInstruction(instruction) {
      settlements.set(instruction.instructionId, clone(instruction));
    }
  };

  const deps: VenueApplicationDependencies = {
    clock: {
      now: () => new Date(now.value)
    },
    idGenerator: {
      nextId: (namespace) => {
        const next = (ids.get(namespace) ?? 0) + 1;

        ids.set(namespace, next);

        return `${namespace}-${next.toString().padStart(6, "0")}`;
      }
    },
    ledger,
    auditLog: {
      async list(pairId) {
        return clone(audits.filter((entry) => pairId === undefined || entry.pairId === pairId));
      },
      async record(entry) {
        audits.push(clone(entry));
      }
    }
  };

  return {
    app: createVenueApplication(deps),
    state: {
      accessGrants,
      audits,
      executions,
      invitations,
      ledger,
      pairs,
      quoteRevisions,
      quoteWithdrawals,
      quotes,
      rfqs,
      settlements
    },
    clock: {
      advanceBy(milliseconds: number) {
        now.value = new Date(now.value.getTime() + milliseconds);
      },
      set(next: string) {
        now.value = new Date(next);
      }
    }
  };
};

describe("createVenueApplication", () => {
  it("runs the phase 1 lifecycle end to end and exposes scoped query views", async () => {
    const { app, state, clock } = createTestDependencies();

    expect(await app.listPairs()).toEqual([]);

    const pair = await app.createPair({
      actorId: "operator-1",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      pairId: "pair-demo",
      rulebookReleaseId: "rulebook-demo",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    const subscriberGrant = await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber",
      note: "subscriber access"
    });
    clock.advanceBy(1_000);
    const pausedPair = await app.pausePair({
      actorId: "operator-1",
      pairId: pair.pairId,
      state: "paused",
      reason: "manual review"
    });
    clock.advanceBy(1_000);
    const activePair = await app.pausePair({
      actorId: "operator-1",
      pairId: pair.pairId,
      state: "active"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 25
    });
    clock.advanceBy(1_000);
    const quoted = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 100.5,
      quantity: 25,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    const accepted = await app.acceptQuote({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: quoted.quote.quoteId
    });
    clock.advanceBy(1_000);
    const unchangedSettlement = await app.markSettlementProgression({
      actorId: "operator-1",
      pairId: pair.pairId,
      instructionId: accepted.settlementInstruction.instructionId,
      status: "pending"
    });
    clock.advanceBy(1_000);
    const affirmedSettlement = await app.markSettlementProgression({
      actorId: "operator-1",
      pairId: pair.pairId,
      instructionId: accepted.settlementInstruction.instructionId,
      status: "affirmed"
    });

    expect(pair).toEqual({
      pairId: "pair-demo",
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
        attestedBy: "operator-1",
        jurisdiction: "US"
      },
      rulebookRelease: {
        releaseId: "rulebook-demo",
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
    expect(subscriberGrant.note).toBe("subscriber access");
    expect(pausedPair.pauseState).toEqual({
      state: "paused",
      changedAt: "2026-04-02T00:00:02.000Z",
      changedBy: "operator-1",
      reason: "manual review"
    });
    expect(activePair.pauseState).toEqual({
      state: "active",
      changedAt: "2026-04-02T00:00:03.000Z",
      changedBy: "operator-1"
    });
    expect(quoted.rfq.status).toBe("quoted");
    expect(quoted.quote.status).toBe("open");
    expect(accepted.executionTicket.price).toBe(100.5);
    expect(unchangedSettlement.status).toBe("pending");
    expect(affirmedSettlement.status).toBe("affirmed");
    expect((await app.listPairs()).map((item) => item.pairId)).toEqual(["pair-demo"]);

    expect(await app.getVenueHealth(pair.pairId)).toEqual({
      title: "SingleDealerPair health",
      status: "healthy",
      detail:
        "Operator operator-1 oversees dealer dealer-alpha with 3 active participant grant(s).",
      summary: {
        pairId: "pair-demo",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        paused: false,
        rulebookVersion: "v1",
        activeParticipantCount: 3,
        ledgerFacts: [
          "Operator approvals",
          "Rulebook releases",
          "Access grants",
          "RFQ sessions",
          "Dealer invitations",
          "Dealer quotes",
          "Quote revisions",
          "Quote withdrawals",
          "Execution tickets",
          "Settlement instructions"
        ],
        offLedgerFacts: [
          "Operator query cache",
          "Operator analytics",
          "Telemetry projection",
          "Transient UI state"
        ]
      },
      violations: []
    });
    const health = await app.getVenueHealth(pair.pairId);

    if (health === null) {
      throw new Error("Expected health view for existing pair.");
    }

    expect(await app.getOperatorView(pair.pairId, "operator-1")).toEqual({
      pair: {
        pairId: "pair-demo",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        paused: false,
        rulebookVersion: "v1",
        approvalStatus: "approved",
        attestationStatus: "attested"
      },
      access: {
        pairId: "pair-demo",
        participants: [
          {
            subjectId: "dealer-alpha",
            roles: ["dealer"],
            entitlements: ["respond_quote", "view_pair"]
          },
          {
            subjectId: "operator-1",
            roles: ["operator"],
            entitlements: [
              "approve_pair",
              "manage_access",
              "pause_pair",
              "progress_settlement",
              "view_audit",
              "view_pair"
            ]
          },
          {
            subjectId: "subscriber-1",
            roles: ["subscriber"],
            entitlements: ["accept_quote", "submit_rfq", "view_pair"]
          }
        ]
      },
      rfqs: [
        {
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 25,
          status: "accepted",
          createdAt: "2026-04-02T00:00:04.000Z"
        }
      ],
      quotes: [
        {
          quoteId: quoted.quote.quoteId,
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 25,
          expiresAt: "2026-04-02T00:20:00.000Z",
          status: "accepted",
          createdAt: "2026-04-02T00:00:05.000Z"
        }
      ],
      executions: [
        {
          executionId: accepted.executionTicket.executionId,
          pairId: "pair-demo",
          rfqId: rfq.rfqId,
          quoteId: quoted.quote.quoteId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 25,
          price: 100.5,
          acceptedAt: "2026-04-02T00:00:06.000Z"
        }
      ],
      settlements: [
        {
          instructionId: accepted.settlementInstruction.instructionId,
          executionId: accepted.executionTicket.executionId,
          status: "affirmed",
          createdAt: "2026-04-02T00:00:06.000Z",
          updatedAt: "2026-04-02T00:00:08.000Z"
        }
      ],
      health
    });
    expect(await app.getSubscriberView(pair.pairId, "subscriber-1", "subscriber-1")).toEqual({
      pair: {
        pairId: "pair-demo",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        paused: false,
        rulebookVersion: "v1",
        approvalStatus: "approved",
        attestationStatus: "attested"
      },
      subscriberId: "subscriber-1",
      entitlements: ["accept_quote", "submit_rfq", "view_pair"],
      canOpenRfq: true,
      rfqs: [
        {
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 25,
          status: "accepted",
          createdAt: "2026-04-02T00:00:04.000Z"
        }
      ],
      quotes: [
        {
          quoteId: quoted.quote.quoteId,
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 25,
          expiresAt: "2026-04-02T00:20:00.000Z",
          status: "accepted",
          createdAt: "2026-04-02T00:00:05.000Z"
        }
      ],
      executions: [accepted.executionTicket],
      settlements: [
        {
          instructionId: accepted.settlementInstruction.instructionId,
          executionId: accepted.executionTicket.executionId,
          status: "affirmed",
          createdAt: "2026-04-02T00:00:06.000Z",
          updatedAt: "2026-04-02T00:00:08.000Z"
        }
      ]
    });
    expect(await app.getDealerWorkbenchView(pair.pairId, "dealer-alpha", "dealer-alpha")).toEqual({
      pair: {
        pairId: "pair-demo",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        paused: false,
        rulebookVersion: "v1",
        approvalStatus: "approved",
        attestationStatus: "attested"
      },
      dealerId: "dealer-alpha",
      rfqs: [
        {
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 25,
          status: "accepted",
          createdAt: "2026-04-02T00:00:04.000Z"
        }
      ],
      quotes: [
        {
          quoteId: quoted.quote.quoteId,
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 25,
          expiresAt: "2026-04-02T00:20:00.000Z",
          status: "accepted",
          createdAt: "2026-04-02T00:00:05.000Z"
        }
      ],
      executions: [accepted.executionTicket]
    });
    const auditTrail = await app.getAuditTrail(pair.pairId, "operator-1");

    expect(auditTrail?.pairId).toBe("pair-demo");
    expect(auditTrail?.entries.map((entry) => entry.action)).toEqual([
      "create_pair",
      "grant_access",
      "grant_access",
      "grant_access",
      "pause_pair",
      "unpause_pair",
      "open_rfq",
      "submit_quote",
      "accept_quote",
      "mark_settlement_progression",
      "mark_settlement_progression"
    ]);
    expect(state.audits).toHaveLength(11);
  });

  it("enforces permissions, single-dealer access control, and not-found behavior", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-1",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-2",
      role: "subscriber",
      entitlements: ["view_audit"]
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-1",
      side: "sell",
      quantity: 10
    });
    clock.advanceBy(1_000);
    const quote = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 100,
      quantity: 10,
      expiresAt: "2026-04-02T00:30:00.000Z"
    });

    await expect(
      app.grantAccess({
        actorId: "subscriber-1",
        pairId: pair.pairId,
        subjectId: "auditor-1",
        role: "auditor"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    await expect(
      app.grantAccess({
        actorId: "operator-1",
        pairId: pair.pairId,
        subjectId: "dealer-beta",
        role: "dealer"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER" }));
    await expect(
      app.pausePair({
        actorId: "subscriber-1",
        pairId: pair.pairId,
        state: "paused",
        reason: "nope"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    await expect(
      app.openRfq({
        actorId: "subscriber-1",
        pairId: "missing",
        instrumentId: "CUSIP-1",
        side: "buy",
        quantity: 10
      })
    ).rejects.toThrow("Pair missing was not found.");
    await expect(
      app.rejectRfq({
        actorId: "dealer-alpha",
        pairId: pair.pairId,
        rfqId: "missing"
      })
    ).rejects.toThrow("RFQ missing was not found.");
    await expect(
      app.cancelRfq({
        actorId: "subscriber-2",
        pairId: pair.pairId,
        rfqId: rfq.rfqId
      })
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));

    state.accessGrants.set(pair.pairId, [
      ...(state.accessGrants.get(pair.pairId) ?? []),
      {
        grantId: "manual-dealer-beta",
        pairId: pair.pairId,
        subjectId: "dealer-beta",
        role: "dealer",
        grantedAt: "2026-04-02T00:00:00.000Z",
        grantedBy: "operator-1",
        entitlements: ["respond_quote", "view_pair"]
      }
    ]);

    await expect(
      app.rejectRfq({
        actorId: "dealer-beta",
        pairId: pair.pairId,
        rfqId: rfq.rfqId
      })
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    await expect(
      app.acceptQuote({
        actorId: "subscriber-1",
        pairId: pair.pairId,
        rfqId: rfq.rfqId,
        quoteId: "missing"
      })
    ).rejects.toThrow("Quote missing was not found.");
    await expect(
      app.markSettlementProgression({
        actorId: "operator-1",
        pairId: pair.pairId,
        instructionId: "missing",
        status: "affirmed"
      })
    ).rejects.toThrow("Settlement instruction missing was not found.");
    await expect(app.getOperatorView(pair.pairId, "subscriber-1")).rejects.toThrow(
      expect.objectContaining({ code: "MISSING_ENTITLEMENT" })
    );
    await expect(
      app.getSubscriberView(pair.pairId, "subscriber-1", "subscriber-2")
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    await expect(
      app.getDealerWorkbenchView(pair.pairId, "dealer-alpha", "subscriber-1")
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
    await expect(app.getAuditTrail(pair.pairId, "subscriber-1")).rejects.toThrow(
      expect.objectContaining({ code: "MISSING_ENTITLEMENT" })
    );
    expect(await app.getAuditTrail(pair.pairId, "subscriber-2")).not.toBeNull();
    expect(await app.getOperatorView("missing", "operator-1")).toBeNull();
    expect(await app.getSubscriberView("missing", "subscriber-1", "subscriber-1")).toBeNull();
    expect(await app.getDealerWorkbenchView("missing", "dealer-alpha", "dealer-alpha")).toBeNull();
    expect(await app.getAuditTrail("missing", "operator-1")).toBeNull();
    expect(await app.getVenueHealth("missing")).toBeNull();
    expect(quote.quote.status).toBe("open");
  });

  it("supports idempotent cancel and reject flows without mutating terminal state twice", async () => {
    const { app, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-1",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const cancellableRfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-1",
      side: "buy",
      quantity: 10
    });
    clock.advanceBy(1_000);
    const cancelled = await app.cancelRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: cancellableRfq.rfqId
    });
    clock.advanceBy(1_000);
    const cancelledAgain = await app.cancelRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: cancellableRfq.rfqId
    });
    clock.advanceBy(1_000);
    const rejectableRfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-2",
      side: "sell",
      quantity: 5
    });
    clock.advanceBy(1_000);
    const rejected = await app.rejectRfq({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rejectableRfq.rfqId,
      reason: "notional too small"
    });
    clock.advanceBy(1_000);
    const rejectedAgain = await app.rejectRfq({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rejectableRfq.rfqId
    });

    expect(cancelled.status).toBe("cancelled");
    expect(cancelledAgain).toEqual(cancelled);
    expect(rejected.status).toBe("rejected");
    expect(rejectedAgain).toEqual(rejected);
  });

  it("expires quotes before acceptance and keeps settlement progression permissioned", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-1",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-1",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-3",
      side: "buy",
      quantity: 12
    });
    clock.advanceBy(1_000);
    const { quote } = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 99.5,
      quantity: 12,
      expiresAt: "2026-04-02T00:00:05.000Z"
    });
    clock.set("2026-04-02T00:00:06.000Z");

    await expect(
      app.acceptQuote({
        actorId: "subscriber-1",
        pairId: pair.pairId,
        rfqId: rfq.rfqId,
        quoteId: quote.quoteId
      })
    ).rejects.toThrow(expect.objectContaining({ code: "QUOTE_EXPIRED" }));

    expect(state.quotes.get(quote.quoteId)?.status).toBe("expired");
    expect(state.rfqs.get(rfq.rfqId)?.status).toBe("quote_expired");
    expect(state.audits.map((entry) => entry.action)).toContain("expire_quote");

    const expiredRfq = state.rfqs.get(rfq.rfqId);
    const expiredQuote = state.quotes.get(quote.quoteId);

    if (expiredRfq === undefined || expiredQuote === undefined) {
      throw new Error("Expected expired RFQ and quote state to be present.");
    }

    state.rfqs.set(rfq.rfqId, {
      ...expiredRfq,
      status: "quote_expired"
    });
    state.quotes.set(quote.quoteId, {
      ...expiredQuote,
      status: "open"
    });

    await expect(
      app.acceptQuote({
        actorId: "subscriber-1",
        pairId: pair.pairId,
        rfqId: rfq.rfqId,
        quoteId: quote.quoteId
      })
    ).rejects.toThrow(expect.objectContaining({ code: "QUOTE_EXPIRED" }));
    expect(state.rfqs.get(rfq.rfqId)?.status).toBe("quote_expired");

    const secondPair = await app.createPair({
      actorId: "operator-2",
      operatorId: "operator-2",
      dealerId: "dealer-beta",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-2",
      pairId: secondPair.pairId,
      subjectId: "subscriber-2",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const secondRfq = await app.openRfq({
      actorId: "subscriber-2",
      pairId: secondPair.pairId,
      instrumentId: "CUSIP-4",
      side: "buy",
      quantity: 2
    });
    clock.advanceBy(1_000);
    const secondQuote = await app.submitQuote({
      actorId: "dealer-beta",
      pairId: secondPair.pairId,
      rfqId: secondRfq.rfqId,
      price: 101,
      quantity: 2,
      expiresAt: "2026-04-02T00:10:00.000Z"
    });
    clock.advanceBy(1_000);
    const secondAccepted = await app.acceptQuote({
      actorId: "subscriber-2",
      pairId: secondPair.pairId,
      rfqId: secondRfq.rfqId,
      quoteId: secondQuote.quote.quoteId
    });

    await expect(
      app.markSettlementProgression({
        actorId: "subscriber-2",
        pairId: secondPair.pairId,
        instructionId: secondAccepted.settlementInstruction.instructionId,
        status: "affirmed"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
  });

  it("supports ATSPair directed multi-dealer RFQ flow with blinded oversight and quote lineage", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "blinded",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-ATS",
      side: "buy",
      quantity: 20,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
    });
    clock.advanceBy(1_000);
    const initialInvite = await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha"]
    });

    expect(initialInvite.invitations.map((invitation) => invitation.dealerId)).toEqual([
      "dealer-alpha"
    ]);

    clock.advanceBy(1_000);
    const revisedInvite = await app.reviseInviteSet({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha", "dealer-beta"]
    });

    expect(revisedInvite.rfq.invitedDealerIds).toEqual(["dealer-alpha", "dealer-beta"]);

    clock.advanceBy(1_000);
    const betaQuote = await app.submitQuote({
      actorId: "dealer-beta",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 101,
      quantity: 20,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });

    await expect(
      app.reviseInviteSet({
        actorId: "subscriber-1",
        pairId: pair.pairId,
        rfqId: rfq.rfqId,
        dealerIds: ["dealer-alpha"]
      })
    ).rejects.toThrow(expect.objectContaining({ code: "INVITE_SET_LOCKED" }));

    clock.advanceBy(1_000);
    const alphaQuote = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 99.5,
      quantity: 20,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    const revisedAlpha = await app.reviseQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: alphaQuote.quote.quoteId,
      price: 98.75,
      quantity: 20,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    await app.withdrawQuote({
      actorId: "dealer-beta",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: betaQuote.quote.quoteId,
      reason: "manual pullback"
    });

    const ladder = await app.getSubscriberQuoteLadder(pair.pairId, rfq.rfqId, "subscriber-1");
    const alphaHistory = await app.getDealerInvitationHistory(
      pair.pairId,
      "dealer-alpha",
      "dealer-alpha"
    );
    const betaHistory = await app.getDealerInvitationHistory(
      pair.pairId,
      "dealer-beta",
      "dealer-beta"
    );
    const oversight = await app.getOperatorOversightView(pair.pairId, "operator-ats");

    expect(
      ladder?.quotes.find((quote) => quote.quoteId === revisedAlpha.nextQuote.quoteId)?.rank
    ).toBe(1);
    expect(alphaHistory?.quotes.every((quote) => quote.dealerId === "dealer-alpha")).toBe(true);
    expect(betaHistory?.quotes.every((quote) => quote.dealerId === "dealer-beta")).toBe(true);
    expect(betaHistory?.withdrawals).toHaveLength(1);
    expect(oversight?.oversightRole).toBe("blinded");
    expect(oversight?.quoteLadders).toEqual([]);
    expect(
      oversight?.quotes.every((quote) => quote.status === "accepted" || quote.price === null)
    ).toBe(true);
    expect(state.quoteRevisions.size).toBe(1);
    expect(state.quoteWithdrawals.size).toBe(1);
    expect(state.invitations.size).toBe(2);

    const accepted = await app.acceptQuote({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: revisedAlpha.nextQuote.quoteId
    });

    expect(accepted.quote.quoteId).toBe(revisedAlpha.nextQuote.quoteId);
    expect(
      (await app.getSubscriberQuoteLadder(pair.pairId, rfq.rfqId, "subscriber-1"))?.quotes.find(
        (quote) => quote.quoteId === revisedAlpha.nextQuote.quoteId
      )?.rank
    ).toBe(1);
  });

  it("treats invite retries and reject-all retries as idempotent ATSPair operations", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "full",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-ATS-RETRY",
      side: "sell",
      quantity: 12,
      responseWindowClosesAt: "2026-04-02T00:15:00.000Z"
    });
    clock.advanceBy(1_000);
    const inviteOnce = await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha", "dealer-beta"]
    });
    const inviteTwice = await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha", "dealer-beta"]
    });
    clock.advanceBy(1_000);
    const quote = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 100,
      quantity: 12,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    const rejectedOnce = await app.rejectAllQuotes({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      reason: "no fill"
    });
    const rejectedTwice = await app.rejectAllQuotes({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      reason: "no fill"
    });

    expect(inviteOnce.invitations.map((invitation) => invitation.invitationId)).toEqual(
      inviteTwice.invitations.map((invitation) => invitation.invitationId)
    );
    expect(rejectedOnce.rfq).toEqual(rejectedTwice.rfq);
    expect(state.quotes.get(quote.quote.quoteId)?.status).toBe("stale");
  });

  it("routes blinded ATS operators to oversight views and returns null for missing ATS read models", async () => {
    const { app, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "blinded",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });

    await expect(app.getOperatorView(pair.pairId, "operator-ats")).rejects.toThrow(
      expect.objectContaining({ code: "MISSING_ENTITLEMENT" })
    );
    expect(await app.getSubscriberQuoteLadder("missing", "rfq-1", "subscriber-1")).toBeNull();
    expect(
      await app.getDealerInvitationHistory("missing", "dealer-alpha", "dealer-alpha")
    ).toBeNull();
    expect(await app.getOperatorOversightView("missing", "operator-ats")).toBeNull();

    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-MISSING-LADDER",
      side: "buy",
      quantity: 5,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
    });

    expect(
      await app.getSubscriberQuoteLadder(pair.pairId, "missing-rfq", "subscriber-1")
    ).toBeNull();
    expect(rfq.rfqId).toBeTruthy();
  });

  it("rejects out-of-scope ATS dealer grants and missing RFQ cancellation", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "full",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);

    await expect(
      app.grantAccess({
        actorId: "operator-ats",
        pairId: pair.pairId,
        subjectId: "dealer-gamma",
        role: "dealer"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "INVALID_INVITATION_DEALER" }));

    await expect(
      app.cancelRfq({
        actorId: "operator-ats",
        pairId: pair.pairId,
        rfqId: "missing-rfq"
      })
    ).rejects.toThrow("RFQ missing-rfq was not found.");

    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-OPERATOR-INVITE",
      side: "buy",
      quantity: 5,
      responseWindowClosesAt: "2026-04-02T00:00:04.000Z"
    });
    clock.advanceBy(1_000);
    const inviteResult = await app.inviteDealers({
      actorId: "operator-ats",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha"]
    });

    clock.set("2026-04-02T00:00:04.000Z");

    await expect(
      app.inviteDealers({
        actorId: "operator-ats",
        pairId: pair.pairId,
        rfqId: rfq.rfqId,
        dealerIds: ["dealer-alpha", "dealer-beta"]
      })
    ).rejects.toThrow(expect.objectContaining({ code: "RESPONSE_WINDOW_EXPIRED" }));

    expect(state.invitations.get(inviteResult.invitations[0]?.invitationId ?? "")?.status).toBe(
      "expired"
    );
  });

  it("persists synchronized expiry state and stales competing ATS quotes on acceptance", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "full",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const expiringRfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-SYNC",
      side: "buy",
      quantity: 10,
      responseWindowClosesAt: "2026-04-02T00:00:06.000Z"
    });
    clock.advanceBy(1_000);
    await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: expiringRfq.rfqId,
      dealerIds: ["dealer-alpha", "dealer-beta"]
    });
    clock.advanceBy(1_000);
    const expiringQuote = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: expiringRfq.rfqId,
      price: 100,
      quantity: 10,
      expiresAt: "2026-04-02T00:00:06.500Z"
    });

    clock.set("2026-04-02T00:00:07.000Z");

    const syncedOversight = await app.getOperatorOversightView(pair.pairId, "operator-ats");

    expect(
      syncedOversight?.invitations.find((invitation) => invitation.dealerId === "dealer-beta")
        ?.status
    ).toBe("expired");
    expect(
      syncedOversight?.quotes.find((quote) => quote.quoteId === expiringQuote.quote.quoteId)?.status
    ).toBe("expired");
    expect(
      state.invitations.get(
        [...state.invitations.values()].find((invitation) => invitation.dealerId === "dealer-beta")
          ?.invitationId ?? ""
      )?.status
    ).toBe("expired");
    expect(state.quotes.get(expiringQuote.quote.quoteId)?.status).toBe("expired");

    clock.set("2026-04-02T00:01:00.000Z");

    const competitiveRfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-STALING",
      side: "buy",
      quantity: 15,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
    });
    clock.advanceBy(1_000);
    await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: competitiveRfq.rfqId,
      dealerIds: ["dealer-alpha", "dealer-beta"]
    });
    clock.advanceBy(1_000);
    const quoteAlpha = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: competitiveRfq.rfqId,
      price: 99.5,
      quantity: 15,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    const quoteBeta = await app.submitQuote({
      actorId: "dealer-beta",
      pairId: pair.pairId,
      rfqId: competitiveRfq.rfqId,
      price: 100.25,
      quantity: 15,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });

    const accepted = await app.acceptQuote({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: competitiveRfq.rfqId,
      quoteId: quoteAlpha.quote.quoteId
    });

    expect(accepted.quote.quoteId).toBe(quoteAlpha.quote.quoteId);
    expect(state.quotes.get(quoteBeta.quote.quoteId)?.status).toBe("stale");
  });

  it("supports ATS re-quoting after withdrawal and reject-all without a reason", async () => {
    const { app, state, clock } = createTestDependencies();

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "full",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });
    clock.advanceBy(1_000);
    const dealerGrant = await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "dealer-alpha",
      role: "dealer"
    });
    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-REQUOTING",
      side: "sell",
      quantity: 8,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
    });
    clock.advanceBy(1_000);
    await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha"]
    });
    clock.advanceBy(1_000);
    const firstQuote = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 102,
      quantity: 8,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    const withdrawn = await app.withdrawQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: firstQuote.quote.quoteId
    });
    const withdrawnAgain = await app.withdrawQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      quoteId: firstQuote.quote.quoteId
    });
    clock.advanceBy(1_000);
    const secondQuote = await app.submitQuote({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      price: 101.75,
      quantity: 8,
      expiresAt: "2026-04-02T00:20:00.000Z"
    });
    clock.advanceBy(1_000);
    const rejected = await app.rejectAllQuotes({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId
    });

    expect(dealerGrant.subjectId).toBe("dealer-alpha");
    expect(withdrawn.quote.status).toBe("withdrawn");
    expect(withdrawnAgain.quote.quoteId).toBe(firstQuote.quote.quoteId);
    expect(secondQuote.quote.quoteId).not.toBe(firstQuote.quote.quoteId);
    expect(rejected.rfq.status).toBe("rejected");
    expect(state.quotes.get(secondQuote.quote.quoteId)?.status).toBe("stale");
  });

  it("covers createPair defaults and ATS dealer-owned rejection", async () => {
    const { app, state, clock } = createTestDependencies();

    await expect(
      app.createPair({
        actorId: "operator-1",
        operatorId: "operator-1",
        jurisdiction: "US",
        rulebookSummary: "initial",
        rulebookVersion: "v1"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER" }));
    await expect(
      app.createPair({
        actorId: "operator-ats",
        operatorId: "operator-ats",
        mode: "ATSPair",
        jurisdiction: "US",
        rulebookSummary: "initial",
        rulebookVersion: "v1"
      })
    ).rejects.toThrow(expect.objectContaining({ code: "ATS_PAIR_REQUIRES_MULTIPLE_DEALERS" }));

    const pair = await app.createPair({
      actorId: "operator-ats",
      operatorId: "operator-ats",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      inviteRevisionPolicy: "before_first_response",
      jurisdiction: "US",
      rulebookSummary: "initial",
      rulebookVersion: "v1"
    });

    expect(pair.operatorOversightRole).toBe("full");
    expect(pair.inviteRevisionPolicy).toBe("before_first_response");

    clock.advanceBy(1_000);
    await app.grantAccess({
      actorId: "operator-ats",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber"
    });
    clock.advanceBy(1_000);
    const rfq = await app.openRfq({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      instrumentId: "CUSIP-ATS-REJECT",
      side: "buy",
      quantity: 11,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
    });
    clock.advanceBy(1_000);
    await app.inviteDealers({
      actorId: "subscriber-1",
      pairId: pair.pairId,
      rfqId: rfq.rfqId,
      dealerIds: ["dealer-alpha"]
    });
    const storedRfq = state.rfqs.get(rfq.rfqId) ?? rfq;
    const legacyRfq = { ...storedRfq };

    delete legacyRfq.invitedDealerIds;

    state.rfqs.set(rfq.rfqId, legacyRfq);

    const rejected = await app.rejectRfq({
      actorId: "dealer-alpha",
      pairId: pair.pairId,
      rfqId: rfq.rfqId
    });

    expect(rejected.status).toBe("rejected");
  });
});
