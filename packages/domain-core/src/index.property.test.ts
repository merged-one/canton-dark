import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  createAccessGrant,
  createPairInstance,
  createRfq,
  resolveEntitlements,
  revokeAccessGrant
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";
const createDeterministicPropertyConfig = (numRuns: number) => ({
  seed: 424242,
  numRuns,
  endOnFailure: true
});

describe("domain-core properties", () => {
  it("role permissions are monotonic under grants and revocations", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            grantId: fc.string({ minLength: 1, maxLength: 8 }),
            role: fc.constantFrom(
              "operator",
              "subscriber",
              "dealer",
              "settlement_delegate",
              "auditor"
            )
          }),
          { minLength: 1, maxLength: 8 }
        ),
        (items) => {
          const base = resolveEntitlements("subject-1", []);
          let activeGrants = [] as ReturnType<typeof createAccessGrant>[];

          for (const item of items) {
            const nextGrant = createAccessGrant({
              grantId: item.grantId,
              pairId: "pair-1",
              subjectId: "subject-1",
              role: item.role,
              grantedAt: createdAt,
              grantedBy: "operator-1"
            });
            const nextEntitlements = resolveEntitlements("subject-1", [...activeGrants, nextGrant]);

            expect(new Set(nextEntitlements)).toEqual(
              new Set([
                ...base,
                ...resolveEntitlements("subject-1", activeGrants),
                ...nextGrant.entitlements
              ])
            );
            activeGrants = [...activeGrants, nextGrant];
          }

          for (const grant of activeGrants) {
            const revoked = revokeAccessGrant(grant, "2026-04-02T00:01:00.000Z", "operator-1");
            const prior = resolveEntitlements("subject-1", activeGrants);
            const afterRevocation = resolveEntitlements(
              "subject-1",
              activeGrants.map((candidate) =>
                candidate.grantId === grant.grantId ? revoked : candidate
              )
            );

            expect(afterRevocation.every((entitlement) => prior.includes(entitlement))).toBe(true);
          }
        }
      ),
      createDeterministicPropertyConfig(25)
    );
  });

  it("paused pairs reject trading commands", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 10_000 }), (seed) => {
        const pair = createPairInstance({
          pairId: `pair-${seed}`,
          mode: "SingleDealerPair",
          operatorId: "operator-1",
          dealers: ["dealer-1"],
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
          },
          pauseState: {
            state: "paused",
            changedAt: createdAt,
            changedBy: "operator-1",
            reason: "test pause"
          }
        });

        const subscriberGrant = createAccessGrant({
          grantId: "grant-1",
          pairId: pair.pairId,
          subjectId: "subscriber-1",
          role: "subscriber",
          grantedAt: createdAt,
          grantedBy: "operator-1"
        });

        expect(() =>
          createRfq({
            rfqId: "rfq-1",
            pair,
            accessGrants: [subscriberGrant],
            requesterId: "subscriber-1",
            directedDealerIds: ["dealer-1"],
            instrumentId: "CUSIP-1",
            side: "buy",
            quantity: 10,
            createdAt,
            expiresAt: "2026-04-02T00:05:00.000Z"
          })
        ).toThrow(
          expect.objectContaining({
            code: "PAIR_IS_PAUSED"
          })
        );
      }),
      createDeterministicPropertyConfig(15)
    );
  });
});
