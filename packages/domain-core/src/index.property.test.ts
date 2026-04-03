import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  compareQuotePriority,
  acceptDealerQuote,
  createAccessGrant,
  createDealerInvitations,
  createDealerQuote,
  createPairInstance,
  createRfqSession,
  expireDealerQuote,
  rankComparableQuotes,
  markRfqQuoteExpired,
  markRfqQuoted,
  resolveEntitlements,
  revokeAccessGrant,
  synchronizeRfqLifecycle
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

const createDeterministicPropertyConfig = (
  overrides: Partial<{
    endOnFailure: boolean;
    numRuns: number;
    path?: string;
    seed: number;
  }> = {}
) => {
  const parsedSeed = Number(process.env.FC_SEED ?? "424242");
  const parsedNumRuns = Number(process.env.FC_NUM_RUNS ?? "64");
  const path = process.env.FC_PATH ?? undefined;

  return {
    seed: Number.isFinite(parsedSeed) ? parsedSeed : 424242,
    numRuns: Number.isFinite(parsedNumRuns) ? parsedNumRuns : 64,
    endOnFailure: true,
    ...(path !== undefined ? { path } : {}),
    ...overrides
  };
};

describe("phase 1 domain-core properties", () => {
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
      createDeterministicPropertyConfig({ numRuns: 25 })
    );
  });

  it("quote acceptance only succeeds strictly before expiry", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 120 }), (secondsBeforeExpiry) => {
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
        const rfq = createRfqSession({
          rfqId: "rfq-1",
          pair,
          accessGrants: [subscriberGrant],
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 10,
          createdAt
        });
        const quotedRfq = markRfqQuoted(rfq, "2026-04-02T00:00:10.000Z");
        const quote = createDealerQuote({
          quoteId: "quote-1",
          pair,
          rfq,
          accessGrants: [dealerGrant],
          dealerId: "dealer-alpha",
          price: 100,
          quantity: 10,
          createdAt: "2026-04-02T00:00:10.000Z",
          expiresAt: "2026-04-02T00:05:00.000Z"
        });
        const acceptedAt = new Date(
          Date.parse("2026-04-02T00:05:00.000Z") - secondsBeforeExpiry * 1_000
        ).toISOString();

        expect(
          acceptDealerQuote({
            pair,
            rfq: quotedRfq,
            quote,
            accessGrants: [subscriberGrant],
            acceptedBy: "subscriber-1",
            acceptedAt,
            executionId: "execution-1",
            instructionId: "instruction-1"
          }).quote.status
        ).toBe("accepted");

        const expiredQuote = expireDealerQuote(quote, "2026-04-02T00:05:00.000Z");
        const expiredRfq = markRfqQuoteExpired(quotedRfq, "2026-04-02T00:05:00.000Z");

        expect(expiredQuote.status).toBe("expired");
        expect(expiredRfq.status).toBe("quote_expired");
      }),
      createDeterministicPropertyConfig({ numRuns: 15 })
    );
  });

  it("invite sets normalize to unique bound dealers before the first response", () => {
    const pair = createPairInstance({
      pairId: "pair-ats-1",
      mode: "ATSPair",
      operatorId: "operator-1",
      dealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
      operatorOversightRole: "full",
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
    const subscriberGrant = createAccessGrant({
      grantId: "grant-subscriber",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const dealerGrants = pair.dealerIds.map((dealerId, index) =>
      createAccessGrant({
        grantId: `grant-dealer-${index}`,
        pairId: pair.pairId,
        subjectId: dealerId,
        role: "dealer",
        grantedAt: createdAt,
        grantedBy: "operator-1"
      })
    );

    fc.assert(
      fc.property(
        fc.subarray(["dealer-alpha", "dealer-beta", "dealer-gamma"] as const, {
          minLength: 1,
          maxLength: 3
        }),
        (requestedDealers) => {
          const rfq = createRfqSession({
            rfqId: "rfq-ats-1",
            pair,
            accessGrants: [subscriberGrant],
            subscriberId: "subscriber-1",
            instrumentId: "CUSIP-ATS-1",
            side: "buy",
            quantity: 10,
            createdAt,
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
          });
          const duplicated = requestedDealers.flatMap((dealerId) => [dealerId, dealerId]);
          const invited = createDealerInvitations({
            pair,
            rfq,
            accessGrants: dealerGrants,
            dealerIds: duplicated,
            invitedBy: "subscriber-1",
            invitations: [],
            createdAt
          });

          expect(new Set(invited.rfq.invitedDealerIds ?? [])).toEqual(new Set(requestedDealers));
          expect(invited.invitations.map((invitation) => invitation.dealerId).sort()).toEqual(
            [...requestedDealers].sort()
          );
        }
      ),
      createDeterministicPropertyConfig({ numRuns: 24 })
    );
  });

  it("quote ranking is deterministic for both buy and sell ladders", () => {
    fc.assert(
      fc.property(
        fc.constantFrom<"buy" | "sell">("buy", "sell"),
        fc.array(
          fc.record({
            quoteId: fc
              .string({ minLength: 1, maxLength: 8 })
              .filter((value) => !value.includes(" ")),
            price: fc.integer({ min: 90, max: 110 }),
            quantity: fc.integer({ min: 1, max: 50 }),
            secondOffset: fc.integer({ min: 0, max: 10 })
          }),
          { minLength: 2, maxLength: 8 }
        ),
        (side, items) => {
          const quotes = items.map((item, index) => ({
            quoteId: `${item.quoteId}-${index}`,
            pairId: "pair-1",
            rfqId: "rfq-1",
            dealerId: `dealer-${index}`,
            subscriberId: "subscriber-1",
            price: item.price,
            quantity: item.quantity,
            createdAt: new Date(Date.parse(createdAt) + item.secondOffset * 1_000).toISOString(),
            expiresAt: "2026-04-02T00:05:00.000Z",
            updatedAt: createdAt,
            status: "open" as const
          }));
          const ranked = rankComparableQuotes(side, quotes);

          expect(ranked.map((entry) => entry.quote.quoteId)).toEqual(
            rankComparableQuotes(side, quotes).map((entry) => entry.quote.quoteId)
          );

          for (let index = 0; index < ranked.length - 1; index += 1) {
            const current = ranked[index];
            const next = ranked[index + 1];

            if (current === undefined || next === undefined) {
              throw new Error("Expected adjacent ranked quotes.");
            }

            expect(compareQuotePriority(side, current.quote, next.quote)).toBeLessThanOrEqual(0);
          }
        }
      ),
      createDeterministicPropertyConfig({ numRuns: 30 })
    );
  });

  it("response windows keep RFQs open until the configured expiry boundary", () => {
    const pair = createPairInstance({
      pairId: "pair-ats-expiry",
      mode: "ATSPair",
      operatorId: "operator-1",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "full",
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
    const subscriberGrant = createAccessGrant({
      grantId: "grant-subscriber-expiry",
      pairId: pair.pairId,
      subjectId: "subscriber-1",
      role: "subscriber",
      grantedAt: createdAt,
      grantedBy: "operator-1"
    });
    const rfq = createRfqSession({
      rfqId: "rfq-ats-expiry",
      pair,
      accessGrants: [subscriberGrant],
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-EXPIRY-ATS",
      side: "buy",
      quantity: 10,
      createdAt,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z"
    });
    const invited = createDealerInvitations({
      pair,
      rfq,
      accessGrants: pair.dealerIds.map((dealerId, index) =>
        createAccessGrant({
          grantId: `grant-${dealerId}-${index}`,
          pairId: pair.pairId,
          subjectId: dealerId,
          role: "dealer",
          grantedAt: createdAt,
          grantedBy: "operator-1"
        })
      ),
      dealerIds: ["dealer-alpha", "dealer-beta"],
      invitedBy: "subscriber-1",
      invitations: [],
      createdAt
    });

    fc.assert(
      fc.property(fc.integer({ min: 1, max: 599 }), (secondsBeforeClose) => {
        const beforeCloseAt = new Date(
          Date.parse("2026-04-02T00:10:00.000Z") - secondsBeforeClose * 1_000
        ).toISOString();

        expect(
          synchronizeRfqLifecycle({
            pair,
            rfq: invited.rfq,
            invitations: invited.invitations,
            quotes: [],
            observedAt: beforeCloseAt
          }).rfq.status
        ).toBe("open");

        expect(
          synchronizeRfqLifecycle({
            pair,
            rfq: invited.rfq,
            invitations: invited.invitations,
            quotes: [],
            observedAt: "2026-04-02T00:10:00.000Z"
          }).rfq.status
        ).toBe("quote_expired");
      }),
      createDeterministicPropertyConfig({ numRuns: 20 })
    );
  });
});
