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
  buildPairDashboardView,
  projectPairSummary,
  projectParticipantAccess,
  projectTradingActivity,
  projectVenueHealth
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

const pair = createPairInstance({
  pairId: "pair-ats",
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
const dealerGrant = createAccessGrant({
  grantId: "grant-dealer",
  pairId: pair.pairId,
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
  quantity: 50,
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
  quantity: 50,
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
const buyOrder = createDarkOrder({
  orderId: "buy-1",
  pair,
  accessGrants: [subscriberGrant],
  participantId: "subscriber-1",
  side: "buy",
  quantity: 25,
  limitPrice: 101,
  createdAt
});
const sellGrant = createAccessGrant({
  grantId: "grant-subscriber-2",
  pairId: pair.pairId,
  subjectId: "subscriber-2",
  role: "subscriber",
  grantedAt: createdAt,
  grantedBy: "operator-1"
});
const sellOrder = createDarkOrder({
  orderId: "sell-1",
  pair,
  accessGrants: [sellGrant],
  participantId: "subscriber-2",
  side: "sell",
  quantity: 25,
  limitPrice: 100,
  createdAt
});
const match = createMatchProposal({
  proposalId: "proposal-1",
  pair,
  buyOrder,
  sellOrder,
  proposedPrice: 100.5,
  proposedQuantity: 25,
  referencePrice: 100.5,
  createdAt
});

describe("query model projectors", () => {
  it("projects pair summaries and participant access views", () => {
    expect(projectPairSummary(pair)).toEqual({
      pairId: "pair-ats",
      mode: "ATSPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha", "dealer-beta"],
      paused: false,
      rulebookVersion: "v1",
      approvalStatus: "approved",
      attestationStatus: "attested"
    });
    expect(
      projectParticipantAccess(pair.pairId, [subscriberGrant, dealerGrant, sellGrant])
    ).toEqual({
      pairId: "pair-ats",
      participants: [
        {
          subjectId: "dealer-alpha",
          roles: ["dealer"],
          entitlements: ["respond_quote", "view_pair"]
        },
        {
          subjectId: "subscriber-1",
          roles: ["subscriber"],
          entitlements: ["submit_dark_order", "submit_rfq", "view_pair"]
        },
        {
          subjectId: "subscriber-2",
          roles: ["subscriber"],
          entitlements: ["submit_dark_order", "submit_rfq", "view_pair"]
        }
      ]
    });
  });

  it("projects trading activity into UI-facing views", () => {
    expect(
      projectTradingActivity(pair.pairId, {
        rfqs: [rfq],
        quotes: [quote],
        executions: [execution],
        darkOrders: [buyOrder, sellOrder],
        matches: [match]
      })
    ).toEqual({
      pairId: "pair-ats",
      rfqs: [
        {
          rfqId: "rfq-1",
          pairId: "pair-ats",
          requesterId: "subscriber-1",
          side: "buy",
          quantity: 50,
          status: "open",
          dealerCount: 1
        }
      ],
      quotes: [
        {
          quoteId: "quote-1",
          pairId: "pair-ats",
          dealerId: "dealer-alpha",
          price: 100.5,
          quantity: 50,
          status: "active"
        }
      ],
      executions: [
        {
          executionId: "execution-1",
          pairId: "pair-ats",
          buyerId: "subscriber-1",
          sellerId: "dealer-alpha",
          price: 100.5,
          quantity: 50,
          settlementStatus: "pending",
          source: "rfq"
        }
      ],
      darkOrders: [
        {
          orderId: "buy-1",
          pairId: "pair-ats",
          participantId: "subscriber-1",
          side: "buy",
          quantity: 25,
          limitPrice: 101,
          status: "resting"
        },
        {
          orderId: "sell-1",
          pairId: "pair-ats",
          participantId: "subscriber-2",
          side: "sell",
          quantity: 25,
          limitPrice: 100,
          status: "resting"
        }
      ],
      matches: [
        {
          proposalId: "proposal-1",
          pairId: "pair-ats",
          proposedPrice: 100.5,
          proposedQuantity: 25,
          referencePrice: 100.5,
          status: "proposed"
        }
      ]
    });
    expect(projectTradingActivity(pair.pairId, {})).toEqual({
      pairId: "pair-ats",
      rfqs: [],
      quotes: [],
      executions: [],
      darkOrders: [],
      matches: []
    });
  });

  it("projects venue health and aggregates a pair dashboard", () => {
    expect(projectVenueHealth(pair, [subscriberGrant, dealerGrant])).toEqual({
      title: "ATSPair kernel health",
      status: "healthy",
      detail:
        "Operator operator-1 governs 2 dealer perimeter(s) and 2 active participant grant(s).",
      summary: {
        pairId: "pair-ats",
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        paused: false,
        rulebookVersion: "v1",
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

    const pausedPair = createPairInstance({
      ...pair,
      pauseState: {
        state: "paused",
        changedAt: "2026-04-02T00:03:00.000Z",
        changedBy: "operator-1",
        reason: "supervisory hold"
      }
    });

    expect(projectVenueHealth(pausedPair, [subscriberGrant])).toEqual({
      title: "ATSPair kernel health",
      status: "paused",
      detail: "Pair paused by operator-1: supervisory hold.",
      summary: {
        pairId: "pair-ats",
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        paused: true,
        rulebookVersion: "v1",
        activeParticipantCount: 1,
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
    expect(projectVenueHealth(pair, [subscriberGrant], ["PAIR_IS_PAUSED"])).toEqual({
      title: "ATSPair kernel health",
      status: "rejected",
      detail: "1 venue policy issue(s) require remediation before trading can resume.",
      summary: {
        pairId: "pair-ats",
        mode: "ATSPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha", "dealer-beta"],
        paused: false,
        rulebookVersion: "v1",
        activeParticipantCount: 1,
        ledgerFacts: ["Shared RFQ state", "Shared execution state"],
        offLedgerFacts: [
          "Operator query cache",
          "Operator analytics",
          "Telemetry projection",
          "Transient UI state"
        ]
      },
      violations: ["PAIR_IS_PAUSED"]
    });

    expect(
      buildPairDashboardView({
        pair,
        grants: [subscriberGrant, dealerGrant],
        records: {
          rfqs: [rfq],
          quotes: [quote]
        }
      })
    ).toEqual({
      pair: projectPairSummary(pair),
      access: projectParticipantAccess(pair.pairId, [subscriberGrant, dealerGrant]),
      activity: projectTradingActivity(pair.pairId, {
        rfqs: [rfq],
        quotes: [quote]
      }),
      health: projectVenueHealth(pair, [subscriberGrant, dealerGrant], [])
    });
  });
});
