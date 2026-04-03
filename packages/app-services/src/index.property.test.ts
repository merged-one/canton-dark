import fc from "fast-check";
import { describe, expect, it } from "vitest";

import type {
  AccessGrant,
  AuditRecord,
  DealerQuote,
  ExecutionTicket,
  PairInstance,
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
    async listPairs() {
      return structuredClone([...pairs.values()]);
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
    async savePair(pair) {
      pairs.set(pair.pairId, structuredClone(pair));
    },
    async saveQuote(quote) {
      quotes.set(quote.quoteId, structuredClone(quote));
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
});
