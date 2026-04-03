import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { createDeterministicPropertyConfig } from "@canton-dark/testkit";

import { createVenueApplication, type VenueApplicationDependencies } from "./index";

const createPropertyDependencies = (): VenueApplicationDependencies => {
  const ids = new Map<string, number>();
  const pairs = new Map<string, object>();
  const noop = async (): Promise<void> => undefined;

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
    ledger: {
      append: noop,
      async getDarkOrder() {
        return null;
      },
      async getPair(pairId) {
        return structuredClone(pairs.get(pairId) ?? null) as never;
      },
      async getQuote() {
        return null;
      },
      async getRfq() {
        return null;
      },
      async listAccessGrants() {
        return [];
      },
      async listDarkOrders() {
        return [];
      },
      async listEvents() {
        return [];
      },
      async listExecutions() {
        return [];
      },
      async listMatchProposals() {
        return [];
      },
      async listQuotes() {
        return [];
      },
      async listRfqs() {
        return [];
      },
      saveAccessGrant: noop,
      saveDarkOrder: noop,
      saveExecution: noop,
      saveMatchProposal: noop,
      async savePair(pair) {
        pairs.set(pair.pairId, structuredClone(pair));
      },
      saveQuote: noop,
      saveRfq: noop
    },
    projections: {
      async get() {
        return null;
      },
      put: noop
    },
    riskControl: {
      async evaluate() {
        return { approved: true };
      }
    },
    settlement: {
      async submit() {
        return "pending";
      }
    },
    auditLog: {
      record: noop
    },
    notifications: {
      send: noop
    },
    referencePrices: {
      async get() {
        return 100;
      }
    }
  };
};

describe("app-services properties", () => {
  it("pair ids stay unique across repeated registrations", async () => {
    await fc.assert(
      fc.asyncProperty(fc.integer({ min: 2, max: 20 }), async (count) => {
        const app = createVenueApplication(createPropertyDependencies());
        const pairIds = [] as string[];

        for (let index = 0; index < count; index += 1) {
          const pair = await app.registerPair({
            actorId: "operator-1",
            mode: "SingleDealerPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            jurisdiction: "US",
            rulebookVersion: "v1",
            rulebookSummary: "initial"
          });

          pairIds.push(pair.pairId);
        }

        expect(new Set(pairIds).size).toBe(pairIds.length);
      }),
      createDeterministicPropertyConfig({ numRuns: 12 })
    );
  });
});
