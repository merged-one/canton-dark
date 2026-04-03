import fc from "fast-check";
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
import { createDeterministicPropertyConfig } from "@canton-dark/testkit";

import {
  createVenueApplication,
  type LedgerPort,
  type VenueApplicationDependencies
} from "./index";

const createPropertyDependencies = (): VenueApplicationDependencies => {
  const ids = new Map<string, number>();
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
      return structuredClone(executions.get(executionId) ?? null);
    },
    async getPair(pairId) {
      return structuredClone(pairs.get(pairId) ?? null);
    },
    async getQuote(quoteId) {
      return structuredClone(quotes.get(quoteId) ?? null);
    },
    async getRfq(rfqId) {
      return structuredClone(rfqs.get(rfqId) ?? null);
    },
    async getSettlementInstruction(instructionId) {
      return structuredClone(settlements.get(instructionId) ?? null);
    },
    async listAccessGrants(pairId) {
      return structuredClone(accessGrants.get(pairId) ?? []);
    },
    async listExecutionTickets(pairId) {
      return structuredClone(
        [...executions.values()].filter((execution) => execution.pairId === pairId)
      );
    },
    async listInvitations(pairId) {
      return structuredClone(
        [...invitations.values()].filter((invitation) => invitation.pairId === pairId)
      );
    },
    async listPairs() {
      return structuredClone([...pairs.values()]);
    },
    async listQuoteRevisions(pairId) {
      return structuredClone(
        [...quoteRevisions.values()].filter((revision) => revision.pairId === pairId)
      );
    },
    async listQuoteWithdrawals(pairId) {
      return structuredClone(
        [...quoteWithdrawals.values()].filter((withdrawal) => withdrawal.pairId === pairId)
      );
    },
    async listQuotes(pairId) {
      return structuredClone([...quotes.values()].filter((quote) => quote.pairId === pairId));
    },
    async listRfqs(pairId) {
      return structuredClone([...rfqs.values()].filter((rfq) => rfq.pairId === pairId));
    },
    async listSettlementInstructions(pairId) {
      return structuredClone(
        [...settlements.values()].filter((settlement) => settlement.pairId === pairId)
      );
    },
    async saveAccessGrant(grant) {
      accessGrants.set(grant.pairId, [
        ...(accessGrants.get(grant.pairId) ?? []),
        structuredClone(grant)
      ]);
    },
    async saveExecutionTicket(execution) {
      executions.set(execution.executionId, structuredClone(execution));
    },
    async saveInvitation(invitation) {
      invitations.set(invitation.invitationId, structuredClone(invitation));
    },
    async savePair(pair) {
      pairs.set(pair.pairId, structuredClone(pair));
    },
    async saveQuote(quote) {
      quotes.set(quote.quoteId, structuredClone(quote));
    },
    async saveQuoteRevision(revision) {
      quoteRevisions.set(revision.revisionId, structuredClone(revision));
    },
    async saveQuoteWithdrawal(withdrawal) {
      quoteWithdrawals.set(withdrawal.withdrawalId, structuredClone(withdrawal));
    },
    async saveRfq(rfq) {
      rfqs.set(rfq.rfqId, structuredClone(rfq));
    },
    async saveSettlementInstruction(instruction) {
      settlements.set(instruction.instructionId, structuredClone(instruction));
    }
  };

  return {
    clock: {
      now: () => new Date("2026-04-02T00:00:00.000Z")
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
        return structuredClone(
          audits.filter((entry) => pairId === undefined || entry.pairId === pairId)
        );
      },
      async record(entry) {
        audits.push(structuredClone(entry));
      }
    }
  };
};

describe("app-services properties", () => {
  it("pair ids stay unique across repeated registrations", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 20 }), async (count) => {
        const app = createVenueApplication(createPropertyDependencies());
        const pairIds: string[] = [];

        for (let index = 0; index < count; index += 1) {
          const pair = await app.createPair({
            actorId: "operator-1",
            operatorId: "operator-1",
            dealerId: "dealer-alpha",
            jurisdiction: "US",
            rulebookSummary: "initial",
            rulebookVersion: "v1"
          });

          pairIds.push(pair.pairId);
        }

        expect(new Set(pairIds).size).toBe(pairIds.length);
      }),
      createDeterministicPropertyConfig({ numRuns: 12 })
    );
  });

  it("privacy-scoped ATS views never leak another dealer's quote history", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 95, max: 105 }),
        fc.integer({ min: 95, max: 105 }),
        async (alphaPrice, betaPrice) => {
          const app = createVenueApplication(createPropertyDependencies());
          const pair = await app.createPair({
            actorId: "operator-1",
            operatorId: "operator-1",
            mode: "ATSPair",
            dealerIds: ["dealer-alpha", "dealer-beta"],
            operatorOversightRole: "blinded",
            jurisdiction: "US",
            rulebookSummary: "initial",
            rulebookVersion: "v1"
          });

          await app.grantAccess({
            actorId: "operator-1",
            pairId: pair.pairId,
            subjectId: "subscriber-1",
            role: "subscriber"
          });

          const rfq = await app.openRfq({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            instrumentId: "CUSIP-ATS-PROP",
            side: "buy",
            quantity: 10,
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
          });

          await app.inviteDealers({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            dealerIds: ["dealer-alpha", "dealer-beta"]
          });

          await app.submitQuote({
            actorId: "dealer-alpha",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            price: alphaPrice,
            quantity: 10,
            expiresAt: "2026-04-02T00:20:00.000Z"
          });
          await app.submitQuote({
            actorId: "dealer-beta",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            price: betaPrice,
            quantity: 10,
            expiresAt: "2026-04-02T00:20:00.000Z"
          });

          const alphaHistory = await app.getDealerInvitationHistory(
            pair.pairId,
            "dealer-alpha",
            "dealer-alpha"
          );
          const subscriberLadder = await app.getSubscriberQuoteLadder(
            pair.pairId,
            rfq.rfqId,
            "subscriber-1"
          );
          const oversight = await app.getOperatorOversightView(pair.pairId, "operator-1");

          expect(alphaHistory?.quotes.every((quote) => quote.dealerId === "dealer-alpha")).toBe(
            true
          );
          expect(subscriberLadder?.quotes).toHaveLength(2);
          expect(oversight?.quoteLadders).toEqual([]);
          expect(
            oversight?.quotes.every((quote) => quote.status === "accepted" || quote.price === null)
          ).toBe(true);
          await expect(
            app.getDealerInvitationHistory(pair.pairId, "dealer-alpha", "dealer-beta")
          ).rejects.toThrow(expect.objectContaining({ code: "MISSING_ENTITLEMENT" }));
        }
      ),
      createDeterministicPropertyConfig({ numRuns: 10 })
    );
  });

  it("invite-set and reject-all retries remain idempotent for ATSPair workflows", async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.subarray(["dealer-alpha", "dealer-beta"] as const, { minLength: 1, maxLength: 2 }),
        async (dealerSet) => {
          const app = createVenueApplication(createPropertyDependencies());
          const pair = await app.createPair({
            actorId: "operator-1",
            operatorId: "operator-1",
            mode: "ATSPair",
            dealerIds: ["dealer-alpha", "dealer-beta"],
            operatorOversightRole: "full",
            jurisdiction: "US",
            rulebookSummary: "initial",
            rulebookVersion: "v1"
          });

          await app.grantAccess({
            actorId: "operator-1",
            pairId: pair.pairId,
            subjectId: "subscriber-1",
            role: "subscriber"
          });

          const rfq = await app.openRfq({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            instrumentId: "CUSIP-ATS-RETRY-PROP",
            side: "sell",
            quantity: 8,
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
          });

          const firstInvite = await app.inviteDealers({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            dealerIds: dealerSet
          });
          const secondInvite = await app.inviteDealers({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            dealerIds: dealerSet
          });

          expect(firstInvite.invitations.map((invitation) => invitation.invitationId)).toEqual(
            secondInvite.invitations.map((invitation) => invitation.invitationId)
          );

          const quotingDealer = dealerSet[0] ?? "dealer-alpha";
          await app.submitQuote({
            actorId: quotingDealer,
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            price: 100,
            quantity: 8,
            expiresAt: "2026-04-02T00:20:00.000Z"
          });

          const firstReject = await app.rejectAllQuotes({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            reason: "retry"
          });
          const secondReject = await app.rejectAllQuotes({
            actorId: "subscriber-1",
            pairId: pair.pairId,
            rfqId: rfq.rfqId,
            reason: "retry"
          });

          expect(firstReject.rfq).toEqual(secondReject.rfq);
        }
      ),
      createDeterministicPropertyConfig({ numRuns: 8 })
    );
  });
});
