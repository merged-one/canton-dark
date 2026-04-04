import { describe, expect, it } from "vitest";

import {
  createDealerInvitations,
  createAccessGrant,
  createDealerQuote,
  createPairInstance,
  type AuditRecord,
  type DealerInvitation,
  type DealerQuote,
  type ExecutionTicket,
  type QuoteRevision,
  type QuoteWithdrawal,
  type RFQSession,
  type SettlementInstruction
} from "@canton-dark/domain-core";

import {
  projectAuditTrail,
  projectDealerInvitationHistory,
  projectDealerWorkbenchView,
  projectOperatorOversightView,
  projectOperatorView,
  projectPairSummary,
  projectParticipantAccess,
  projectSubscriberQuoteLadder,
  projectSubscriberView,
  projectVenueHealth
} from "./index";

const createdAt = "2026-04-02T00:00:00.000Z";

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

const operatorGrant = createAccessGrant({
  grantId: "grant-operator",
  pairId: pair.pairId,
  subjectId: pair.operatorId,
  role: "operator",
  grantedAt: createdAt,
  grantedBy: "operator-1"
});
const dealerGrant = createAccessGrant({
  grantId: "grant-dealer",
  pairId: pair.pairId,
  subjectId: pair.dealerId,
  role: "dealer",
  grantedAt: createdAt,
  grantedBy: "operator-1"
});
const subscriberGrant = createAccessGrant({
  grantId: "grant-subscriber",
  pairId: pair.pairId,
  subjectId: "subscriber-1",
  role: "subscriber",
  grantedAt: createdAt,
  grantedBy: "operator-1"
});

const rfq: RFQSession = {
  rfqId: "rfq-1",
  pairId: pair.pairId,
  dealerId: pair.dealerId,
  subscriberId: "subscriber-1",
  instrumentId: "CUSIP-1",
  side: "buy",
  quantity: 10,
  createdAt: "2026-04-02T00:01:00.000Z",
  updatedAt: "2026-04-02T00:02:00.000Z",
  status: "quoted"
};

const quote: DealerQuote = {
  quoteId: "quote-1",
  pairId: pair.pairId,
  rfqId: rfq.rfqId,
  dealerId: pair.dealerId,
  subscriberId: "subscriber-1",
  price: 100.5,
  quantity: 10,
  createdAt: "2026-04-02T00:02:00.000Z",
  expiresAt: "2026-04-02T00:05:00.000Z",
  updatedAt: "2026-04-02T00:02:00.000Z",
  status: "open"
};

const execution: ExecutionTicket = {
  executionId: "execution-1",
  pairId: pair.pairId,
  rfqId: rfq.rfqId,
  quoteId: quote.quoteId,
  dealerId: pair.dealerId,
  subscriberId: "subscriber-1",
  instrumentId: rfq.instrumentId,
  side: rfq.side,
  quantity: quote.quantity,
  price: quote.price,
  acceptedAt: "2026-04-02T00:03:00.000Z"
};

const settlement: SettlementInstruction = {
  instructionId: "instruction-1",
  executionId: execution.executionId,
  pairId: pair.pairId,
  status: "pending",
  createdAt: "2026-04-02T00:03:00.000Z",
  updatedAt: "2026-04-02T00:03:00.000Z"
};

const auditTrail: AuditRecord[] = [
  {
    action: "open_rfq",
    actorId: "subscriber-1",
    at: "2026-04-02T00:01:00.000Z",
    detail: "RFQ opened.",
    entityId: rfq.rfqId,
    pairId: pair.pairId
  },
  {
    action: "create_pair",
    actorId: "operator-1",
    at: createdAt,
    detail: "Pair created.",
    entityId: pair.pairId,
    pairId: pair.pairId
  }
];

describe("query-model projectors", () => {
  it("projects pair summaries, participant access, and venue health", () => {
    expect(projectPairSummary(pair)).toEqual({
      pairId: "pair-1",
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealerId: "dealer-alpha",
      paused: false,
      rulebookVersion: "v1",
      approvalStatus: "approved",
      attestationStatus: "attested"
    });
    expect(
      projectParticipantAccess(pair.pairId, [operatorGrant, dealerGrant, subscriberGrant])
    ).toEqual({
      pairId: "pair-1",
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
    });
    expect(projectVenueHealth(pair, [operatorGrant, dealerGrant, subscriberGrant])).toEqual({
      title: "SingleDealerPair health",
      status: "healthy",
      detail:
        "Operator operator-1 oversees dealer dealer-alpha with 3 active participant grant(s).",
      summary: {
        pairId: "pair-1",
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
  });

  it("projects operator, subscriber, dealer, and audit views with read-scope filtering", () => {
    const rfqSameTime: RFQSession = {
      ...rfq,
      rfqId: "rfq-2",
      instrumentId: "CUSIP-2"
    };
    const rfqLater: RFQSession = {
      ...rfq,
      rfqId: "rfq-3",
      instrumentId: "CUSIP-3",
      createdAt: "2026-04-02T00:04:00.000Z"
    };
    const quoteSameTime: DealerQuote = {
      ...quote,
      quoteId: "quote-2",
      rfqId: "rfq-2"
    };
    const quoteLater: DealerQuote = {
      ...quote,
      quoteId: "quote-3",
      rfqId: "rfq-3",
      createdAt: "2026-04-02T00:04:00.000Z"
    };
    const executionSameTime: ExecutionTicket = {
      ...execution,
      executionId: "execution-2"
    };
    const executionLater: ExecutionTicket = {
      ...execution,
      executionId: "execution-3",
      acceptedAt: "2026-04-02T00:04:00.000Z"
    };

    expect(
      projectOperatorView({
        pair,
        grants: [operatorGrant, dealerGrant, subscriberGrant],
        rfqs: [rfqLater, rfqSameTime, rfq],
        quotes: [quoteLater, quoteSameTime, quote],
        executions: [executionLater, executionSameTime, execution],
        settlements: [settlement]
      })
    ).toEqual({
      pair: projectPairSummary(pair),
      access: projectParticipantAccess(pair.pairId, [operatorGrant, dealerGrant, subscriberGrant]),
      rfqs: [
        {
          rfqId: "rfq-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:01:00.000Z"
        },
        {
          rfqId: "rfq-2",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-2",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:01:00.000Z"
        },
        {
          rfqId: "rfq-3",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-3",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:04:00.000Z"
        }
      ],
      quotes: [
        {
          quoteId: "quote-1",
          rfqId: "rfq-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        },
        {
          quoteId: "quote-2",
          rfqId: "rfq-2",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        },
        {
          quoteId: "quote-3",
          rfqId: "rfq-3",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:04:00.000Z"
        }
      ],
      executions: [execution, executionSameTime, executionLater],
      settlements: [
        {
          instructionId: "instruction-1",
          executionId: "execution-1",
          pairId: "pair-1",
          status: "pending",
          createdAt: "2026-04-02T00:03:00.000Z",
          updatedAt: "2026-04-02T00:03:00.000Z"
        }
      ],
      health: projectVenueHealth(pair, [operatorGrant, dealerGrant, subscriberGrant])
    });

    expect(
      projectSubscriberView({
        pair,
        grants: [operatorGrant, dealerGrant, subscriberGrant],
        rfqs: [rfqLater, rfqSameTime, rfq],
        quotes: [quoteLater, quoteSameTime, quote],
        executions: [executionLater, executionSameTime, execution],
        settlements: [settlement],
        subscriberId: "subscriber-1"
      })
    ).toEqual({
      availableDealerIds: ["dealer-alpha"],
      pair: projectPairSummary(pair),
      subscriberId: "subscriber-1",
      entitlements: ["accept_quote", "submit_rfq", "view_pair"],
      canOpenRfq: true,
      rfqs: [
        {
          rfqId: "rfq-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:01:00.000Z"
        },
        {
          rfqId: "rfq-2",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-2",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:01:00.000Z"
        },
        {
          rfqId: "rfq-3",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-3",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:04:00.000Z"
        }
      ],
      quotes: [
        {
          quoteId: "quote-1",
          rfqId: "rfq-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        },
        {
          quoteId: "quote-2",
          rfqId: "rfq-2",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        },
        {
          quoteId: "quote-3",
          rfqId: "rfq-3",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:04:00.000Z"
        }
      ],
      executions: [execution, executionSameTime, executionLater],
      settlements: [
        {
          instructionId: "instruction-1",
          executionId: "execution-1",
          pairId: "pair-1",
          status: "pending",
          createdAt: "2026-04-02T00:03:00.000Z",
          updatedAt: "2026-04-02T00:03:00.000Z"
        }
      ]
    });

    expect(
      projectDealerWorkbenchView({
        pair,
        dealerId: "dealer-alpha",
        rfqs: [rfqLater, rfqSameTime, rfq],
        quotes: [quoteLater, quoteSameTime, quote],
        executions: [executionLater, executionSameTime, execution]
      })
    ).toEqual({
      pair: projectPairSummary(pair),
      dealerId: "dealer-alpha",
      rfqs: [
        {
          rfqId: "rfq-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:01:00.000Z"
        },
        {
          rfqId: "rfq-2",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-2",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:01:00.000Z"
        },
        {
          rfqId: "rfq-3",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          instrumentId: "CUSIP-3",
          side: "buy",
          quantity: 10,
          status: "quoted",
          createdAt: "2026-04-02T00:04:00.000Z"
        }
      ],
      quotes: [
        {
          quoteId: "quote-1",
          rfqId: "rfq-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        },
        {
          quoteId: "quote-2",
          rfqId: "rfq-2",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        },
        {
          quoteId: "quote-3",
          rfqId: "rfq-3",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 100.5,
          quantity: 10,
          expiresAt: "2026-04-02T00:05:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:04:00.000Z"
        }
      ],
      executions: [execution, executionSameTime, executionLater]
    });

    expect(
      projectAuditTrail(pair.pairId, [
        ...auditTrail,
        {
          action: "accept_quote",
          actorId: "subscriber-1",
          at: createdAt,
          detail: "Quote accepted.",
          entityId: quote.quoteId,
          pairId: pair.pairId
        }
      ])
    ).toEqual({
      pairId: "pair-1",
      entries: [
        {
          action: "accept_quote",
          actorId: "subscriber-1",
          at: "2026-04-02T00:00:00.000Z",
          detail: "Quote accepted.",
          entityId: "quote-1",
          pairId: "pair-1"
        },
        {
          action: "create_pair",
          actorId: "operator-1",
          at: "2026-04-02T00:00:00.000Z",
          detail: "Pair created.",
          entityId: "pair-1",
          pairId: "pair-1"
        },
        {
          action: "open_rfq",
          actorId: "subscriber-1",
          at: "2026-04-02T00:01:00.000Z",
          detail: "RFQ opened.",
          entityId: "rfq-1",
          pairId: "pair-1"
        }
      ]
    });

    expect(
      projectSubscriberView({
        pair,
        grants: [operatorGrant, dealerGrant, subscriberGrant],
        rfqs: [rfq],
        quotes: [quote],
        executions: [execution],
        settlements: [settlement],
        subscriberId: "subscriber-2"
      })
    ).toEqual({
      availableDealerIds: ["dealer-alpha"],
      pair: projectPairSummary(pair),
      subscriberId: "subscriber-2",
      entitlements: [],
      canOpenRfq: false,
      rfqs: [],
      quotes: [],
      executions: [],
      settlements: []
    });
  });

  it("projects paused and rejected health branches", () => {
    const pausedPair = createPairInstance({
      ...pair,
      createdAt,
      pauseState: {
        state: "paused",
        changedAt: "2026-04-02T00:10:00.000Z",
        changedBy: "operator-1",
        reason: "manual hold"
      }
    });

    expect(projectVenueHealth(pausedPair, [operatorGrant])).toEqual({
      title: "SingleDealerPair health",
      status: "paused",
      detail: "Pair paused by operator-1: manual hold.",
      summary: {
        pairId: "pair-1",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        paused: true,
        rulebookVersion: "v1",
        activeParticipantCount: 1,
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

    expect(
      projectVenueHealth(
        {
          ...pair,
          operatorApproval: {
            ...pair.operatorApproval,
            status: "rejected"
          }
        },
        [operatorGrant]
      )
    ).toEqual({
      title: "SingleDealerPair health",
      status: "rejected",
      detail: "1 venue policy issue(s) require remediation before new trading activity.",
      summary: {
        pairId: "pair-1",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        paused: false,
        rulebookVersion: "v1",
        activeParticipantCount: 1,
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
      violations: ["Operator approval is not active."]
    });

    expect(
      projectVenueHealth(
        {
          ...pair,
          regulatoryAttestation: {
            ...pair.regulatoryAttestation,
            status: "expired"
          }
        },
        [operatorGrant]
      )
    ).toEqual({
      title: "SingleDealerPair health",
      status: "rejected",
      detail: "1 venue policy issue(s) require remediation before new trading activity.",
      summary: {
        pairId: "pair-1",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
        paused: false,
        rulebookVersion: "v1",
        activeParticipantCount: 1,
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
      violations: ["Regulatory attestation is not active."]
    });
  });

  it("omits quote-ladder response windows when the RFQ does not define one", () => {
    const ladder = projectSubscriberQuoteLadder({
      invitations: [
        {
          invitationId: "rfq-no-window:dealer-alpha:1",
          pairId: pair.pairId,
          rfqId: "rfq-no-window",
          dealerId: pair.dealerId,
          subscriberId: "subscriber-1",
          invitationVersion: 1,
          invitedAt: "2026-04-02T00:01:30.000Z",
          invitedBy: "subscriber-1",
          responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
          updatedAt: "2026-04-02T00:01:30.000Z",
          status: "open"
        }
      ],
      pair,
      quotes: [
        {
          ...quote,
          quoteId: "quote-no-window",
          rfqId: "rfq-no-window"
        }
      ],
      rfq: {
        ...rfq,
        rfqId: "rfq-no-window",
        status: "open"
      }
    });

    expect(ladder).toMatchObject({
      pairId: pair.pairId,
      rfqId: "rfq-no-window",
      subscriberId: "subscriber-1"
    });
    expect(ladder).not.toHaveProperty("responseWindowClosesAt");
  });

  it("projects ATSPair quote ladders, dealer history, and blinded operator oversight without quote leakage", () => {
    const atsPair = createPairInstance({
      pairId: "pair-ats-1",
      mode: "ATSPair",
      operatorId: "operator-ats",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "blinded",
      inviteRevisionPolicy: "before_first_response",
      createdAt,
      operatorApproval: {
        status: "approved",
        approvedAt: createdAt,
        approvedBy: "operator-ats"
      },
      regulatoryAttestation: {
        status: "attested",
        attestedAt: createdAt,
        attestedBy: "auditor-1",
        jurisdiction: "US"
      },
      rulebookRelease: {
        releaseId: "rulebook-ats-1",
        version: "v2",
        effectiveAt: createdAt,
        publishedBy: "operator-ats",
        summary: "ats release"
      }
    });
    const atsRfq: RFQSession = {
      rfqId: "rfq-ats-1",
      pairId: atsPair.pairId,
      dealerId: atsPair.dealerId,
      invitedDealerIds: ["dealer-alpha", "dealer-beta"],
      currentInvitationVersion: 0,
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-ATS-1",
      side: "buy",
      quantity: 25,
      createdAt: "2026-04-02T00:01:00.000Z",
      updatedAt: "2026-04-02T00:01:00.000Z",
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      status: "quoted"
    };
    const atsGrants = [
      createAccessGrant({
        grantId: "grant-ats-operator",
        pairId: atsPair.pairId,
        subjectId: atsPair.operatorId,
        role: "operator",
        grantedAt: createdAt,
        grantedBy: atsPair.operatorId
      }),
      createAccessGrant({
        grantId: "grant-ats-alpha",
        pairId: atsPair.pairId,
        subjectId: "dealer-alpha",
        role: "dealer",
        grantedAt: createdAt,
        grantedBy: atsPair.operatorId
      }),
      createAccessGrant({
        grantId: "grant-ats-beta",
        pairId: atsPair.pairId,
        subjectId: "dealer-beta",
        role: "dealer",
        grantedAt: createdAt,
        grantedBy: atsPair.operatorId
      }),
      createAccessGrant({
        grantId: "grant-ats-subscriber",
        pairId: atsPair.pairId,
        subjectId: "subscriber-1",
        role: "subscriber",
        grantedAt: createdAt,
        grantedBy: atsPair.operatorId
      })
    ];
    const invitationResult = createDealerInvitations({
      accessGrants: atsGrants,
      createdAt: "2026-04-02T00:01:30.000Z",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      invitations: [],
      invitedBy: "subscriber-1",
      pair: atsPair,
      rfq: atsRfq
    });
    const invitations: DealerInvitation[] = [...invitationResult.invitations];
    const alphaQuote = createDealerQuote({
      accessGrants: atsGrants,
      createdAt: "2026-04-02T00:02:00.000Z",
      dealerId: "dealer-alpha",
      expiresAt: "2026-04-02T00:20:00.000Z",
      invitations,
      pair: atsPair,
      price: 99.25,
      quantity: 25,
      quoteId: "quote-ats-alpha",
      rfq: atsRfq
    });
    const betaQuote: DealerQuote = {
      ...createDealerQuote({
        accessGrants: atsGrants,
        createdAt: "2026-04-02T00:02:30.000Z",
        dealerId: "dealer-beta",
        expiresAt: "2026-04-02T00:20:00.000Z",
        invitations,
        pair: atsPair,
        price: 101.5,
        quantity: 25,
        quoteId: "quote-ats-beta",
        rfq: atsRfq
      }),
      status: "withdrawn",
      withdrawnAt: "2026-04-02T00:03:30.000Z",
      withdrawnBy: "dealer-beta",
      withdrawalReason: "manual pullback",
      updatedAt: "2026-04-02T00:03:30.000Z"
    };
    const revision: QuoteRevision = {
      revisionId: "revision-ats-1",
      pairId: atsPair.pairId,
      rfqId: atsRfq.rfqId,
      dealerId: "dealer-alpha",
      subscriberId: "subscriber-1",
      previousQuoteId: "quote-ats-alpha-0",
      nextQuoteId: alphaQuote.quoteId,
      revisedAt: "2026-04-02T00:02:00.000Z",
      revisedBy: "dealer-alpha"
    };
    const withdrawal: QuoteWithdrawal = {
      withdrawalId: "withdrawal-ats-1",
      pairId: atsPair.pairId,
      rfqId: atsRfq.rfqId,
      quoteId: betaQuote.quoteId,
      dealerId: "dealer-beta",
      subscriberId: "subscriber-1",
      withdrawnAt: "2026-04-02T00:03:30.000Z",
      withdrawnBy: "dealer-beta",
      reason: "manual pullback"
    };
    const ladder = projectSubscriberQuoteLadder({
      invitations,
      pair: atsPair,
      quotes: [betaQuote, alphaQuote],
      rfq: atsRfq
    });
    const alphaHistory = projectDealerInvitationHistory({
      dealerId: "dealer-alpha",
      invitations,
      pair: atsPair,
      quotes: [betaQuote, alphaQuote],
      revisions: [revision],
      withdrawals: [withdrawal]
    });
    const oversight = projectOperatorOversightView({
      auditEntries: [
        {
          action: "invite_dealers",
          actorId: "subscriber-1",
          at: "2026-04-02T00:01:30.000Z",
          detail: "Directed invite set created.",
          entityId: atsRfq.rfqId,
          pairId: atsPair.pairId
        }
      ],
      executions: [],
      grants: atsGrants,
      invitations,
      pair: atsPair,
      quotes: [betaQuote, alphaQuote],
      revisions: [revision],
      rfqs: [atsRfq],
      settlements: [],
      withdrawals: [withdrawal]
    });

    expect(ladder).toEqual({
      invitations: [
        {
          invitationId: "rfq-ats-1:dealer-alpha:1",
          rfqId: atsRfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          invitationVersion: 1,
          invitedAt: "2026-04-02T00:01:30.000Z",
          invitedBy: "subscriber-1",
          responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
          status: "open"
        },
        {
          invitationId: "rfq-ats-1:dealer-beta:1",
          rfqId: atsRfq.rfqId,
          dealerId: "dealer-beta",
          subscriberId: "subscriber-1",
          invitationVersion: 1,
          invitedAt: "2026-04-02T00:01:30.000Z",
          invitedBy: "subscriber-1",
          responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
          status: "open"
        }
      ],
      pairId: atsPair.pairId,
      rfqId: atsRfq.rfqId,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      subscriberId: "subscriber-1",
      side: "buy",
      tieBreakRule:
        "Best price, then larger quantity, then earliest quote creation time, then lexicographic quote id.",
      quotes: [
        {
          quoteId: "quote-ats-alpha",
          rfqId: atsRfq.rfqId,
          dealerId: "dealer-alpha",
          price: 99.25,
          quantity: 25,
          expiresAt: "2026-04-02T00:20:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z",
          comparable: true,
          rank: 1
        },
        {
          quoteId: "quote-ats-beta",
          rfqId: atsRfq.rfqId,
          dealerId: "dealer-beta",
          price: 101.5,
          quantity: 25,
          expiresAt: "2026-04-02T00:20:00.000Z",
          status: "withdrawn",
          createdAt: "2026-04-02T00:02:30.000Z",
          comparable: false
        }
      ]
    });
    expect(alphaHistory).toEqual({
      pair: projectPairSummary(atsPair),
      dealerId: "dealer-alpha",
      invitations: [
        {
          invitationId: "rfq-ats-1:dealer-alpha:1",
          rfqId: atsRfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          invitationVersion: 1,
          invitedAt: "2026-04-02T00:01:30.000Z",
          invitedBy: "subscriber-1",
          responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
          status: "open"
        }
      ],
      quotes: [
        {
          quoteId: "quote-ats-alpha",
          rfqId: atsRfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          price: 99.25,
          quantity: 25,
          expiresAt: "2026-04-02T00:20:00.000Z",
          status: "open",
          createdAt: "2026-04-02T00:02:00.000Z"
        }
      ],
      revisions: [revision],
      withdrawals: []
    });
    expect(oversight.oversightRole).toBe("blinded");
    expect(oversight.access.participants).toHaveLength(4);
    expect(oversight.dealerUniverse).toEqual(["dealer-alpha", "dealer-beta"]);
    expect(oversight.health.status).toBe("healthy");
    expect(oversight.inviteRevisionPolicy).toBe("before_first_response");
    expect(oversight.quoteLadders).toEqual([]);
    expect(oversight.executions).toEqual([]);
    expect(oversight.settlements).toEqual([]);
    expect(oversight.quotes).toEqual([
      {
        quoteId: "quote-ats-alpha",
        rfqId: atsRfq.rfqId,
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        expiresAt: "2026-04-02T00:20:00.000Z",
        status: "open",
        createdAt: "2026-04-02T00:02:00.000Z",
        price: null,
        quantity: null
      },
      {
        quoteId: "quote-ats-beta",
        rfqId: atsRfq.rfqId,
        dealerId: "dealer-beta",
        subscriberId: "subscriber-1",
        expiresAt: "2026-04-02T00:20:00.000Z",
        status: "withdrawn",
        createdAt: "2026-04-02T00:02:30.000Z",
        price: null,
        quantity: null
      }
    ]);
  });

  it("projects full operator oversight ladders and sorts revision and withdrawal ties deterministically", () => {
    const fullPair = createPairInstance({
      pairId: "pair-ats-full-1",
      mode: "ATSPair",
      operatorId: "operator-ats",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      operatorOversightRole: "full",
      inviteRevisionPolicy: "before_first_response",
      createdAt,
      operatorApproval: {
        status: "approved",
        approvedAt: createdAt,
        approvedBy: "operator-ats"
      },
      regulatoryAttestation: {
        status: "attested",
        attestedAt: createdAt,
        attestedBy: "auditor-1",
        jurisdiction: "US"
      },
      rulebookRelease: {
        releaseId: "rulebook-ats-full-1",
        version: "v2",
        effectiveAt: createdAt,
        publishedBy: "operator-ats",
        summary: "ats full release"
      }
    });
    const rfq: RFQSession = {
      rfqId: "rfq-ats-full-1",
      pairId: fullPair.pairId,
      dealerId: fullPair.dealerId,
      invitedDealerIds: ["dealer-alpha", "dealer-beta"],
      currentInvitationVersion: 1,
      subscriberId: "subscriber-1",
      instrumentId: "CUSIP-ATS-FULL-1",
      side: "sell",
      quantity: 30,
      createdAt: "2026-04-02T00:01:00.000Z",
      updatedAt: "2026-04-02T00:01:00.000Z",
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      status: "quoted"
    };
    const quotes: DealerQuote[] = [
      {
        quoteId: "quote-full-2",
        rfqId: rfq.rfqId,
        pairId: fullPair.pairId,
        dealerId: "dealer-beta",
        subscriberId: "subscriber-1",
        price: 102,
        quantity: 30,
        createdAt: "2026-04-02T00:02:30.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z",
        updatedAt: "2026-04-02T00:02:30.000Z",
        status: "open"
      },
      {
        quoteId: "quote-full-1",
        rfqId: rfq.rfqId,
        pairId: fullPair.pairId,
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        price: 103,
        quantity: 30,
        createdAt: "2026-04-02T00:02:00.000Z",
        expiresAt: "2026-04-02T00:20:00.000Z",
        updatedAt: "2026-04-02T00:02:00.000Z",
        status: "open"
      }
    ];
    const invitations: DealerInvitation[] = [
      {
        invitationId: "rfq-ats-full-1:dealer-beta:1",
        pairId: fullPair.pairId,
        rfqId: rfq.rfqId,
        dealerId: "dealer-beta",
        subscriberId: "subscriber-1",
        invitationVersion: 1,
        invitedAt: "2026-04-02T00:01:00.000Z",
        invitedBy: "subscriber-1",
        responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
        updatedAt: "2026-04-02T00:03:00.000Z",
        status: "withdrawn",
        withdrawnAt: "2026-04-02T00:03:00.000Z",
        withdrawnBy: "subscriber-1",
        withdrawalReason: "rebalanced"
      },
      {
        invitationId: "rfq-ats-full-1:dealer-alpha:1",
        pairId: fullPair.pairId,
        rfqId: rfq.rfqId,
        dealerId: "dealer-alpha",
        subscriberId: "subscriber-1",
        invitationVersion: 1,
        invitedAt: "2026-04-02T00:01:00.000Z",
        invitedBy: "subscriber-1",
        responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
        updatedAt: "2026-04-02T00:02:00.000Z",
        status: "responded",
        respondedAt: "2026-04-02T00:02:00.000Z",
        firstQuoteId: "quote-full-1"
      }
    ];
    const grants = [
      createAccessGrant({
        grantId: "grant-ats-full-operator",
        pairId: fullPair.pairId,
        subjectId: "operator-ats",
        role: "operator",
        grantedAt: createdAt,
        grantedBy: "operator-ats"
      }),
      createAccessGrant({
        grantId: "grant-ats-full-alpha",
        pairId: fullPair.pairId,
        subjectId: "dealer-alpha",
        role: "dealer",
        grantedAt: createdAt,
        grantedBy: "operator-ats"
      }),
      createAccessGrant({
        grantId: "grant-ats-full-beta",
        pairId: fullPair.pairId,
        subjectId: "dealer-beta",
        role: "dealer",
        grantedAt: createdAt,
        grantedBy: "operator-ats"
      }),
      createAccessGrant({
        grantId: "grant-ats-full-subscriber",
        pairId: fullPair.pairId,
        subjectId: "subscriber-1",
        role: "subscriber",
        grantedAt: createdAt,
        grantedBy: "operator-ats"
      })
    ];
    const oversight = projectOperatorOversightView({
      auditEntries: [],
      executions: [],
      grants,
      invitations,
      pair: fullPair,
      quotes,
      revisions: [
        {
          revisionId: "revision-b",
          pairId: fullPair.pairId,
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          previousQuoteId: "quote-prev-b",
          nextQuoteId: "quote-next-b",
          revisedAt: "2026-04-02T00:03:00.000Z",
          revisedBy: "dealer-alpha"
        },
        {
          revisionId: "revision-a",
          pairId: fullPair.pairId,
          rfqId: rfq.rfqId,
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          previousQuoteId: "quote-prev-a",
          nextQuoteId: "quote-next-a",
          revisedAt: "2026-04-02T00:03:00.000Z",
          revisedBy: "dealer-alpha"
        },
        {
          revisionId: "revision-c",
          pairId: fullPair.pairId,
          rfqId: rfq.rfqId,
          dealerId: "dealer-beta",
          subscriberId: "subscriber-1",
          previousQuoteId: "quote-prev-c",
          nextQuoteId: "quote-next-c",
          revisedAt: "2026-04-02T00:03:00.000Z",
          revisedBy: "dealer-beta"
        }
      ],
      rfqs: [rfq],
      settlements: [],
      withdrawals: [
        {
          withdrawalId: "withdrawal-b",
          pairId: fullPair.pairId,
          rfqId: rfq.rfqId,
          quoteId: "quote-full-2",
          dealerId: "dealer-beta",
          subscriberId: "subscriber-1",
          withdrawnAt: "2026-04-02T00:04:00.000Z",
          withdrawnBy: "dealer-beta",
          reason: "late pullback"
        },
        {
          withdrawalId: "withdrawal-a",
          pairId: fullPair.pairId,
          rfqId: rfq.rfqId,
          quoteId: "quote-full-1",
          dealerId: "dealer-alpha",
          subscriberId: "subscriber-1",
          withdrawnAt: "2026-04-02T00:04:00.000Z",
          withdrawnBy: "dealer-alpha",
          reason: "late pullback"
        },
        {
          withdrawalId: "withdrawal-c",
          pairId: fullPair.pairId,
          rfqId: rfq.rfqId,
          quoteId: "quote-full-3",
          dealerId: "dealer-gamma",
          subscriberId: "subscriber-1",
          withdrawnAt: "2026-04-02T00:04:00.000Z",
          withdrawnBy: "dealer-gamma",
          reason: "late pullback"
        }
      ]
    });

    expect(projectVenueHealth(fullPair, grants).detail).toBe(
      "Operator operator-ats oversees 2 directed dealers with 4 active participant grant(s)."
    );
    expect(
      projectDealerWorkbenchView({
        pair: fullPair,
        dealerId: "dealer-beta",
        rfqs: [rfq],
        quotes,
        executions: []
      }).rfqs
    ).toHaveLength(1);
    expect(
      projectDealerInvitationHistory({
        dealerId: "dealer-beta",
        invitations,
        pair: fullPair,
        quotes,
        revisions: oversight.revisions,
        withdrawals: oversight.withdrawals
      }).invitations[0]
    ).toMatchObject({
      invitationId: "rfq-ats-full-1:dealer-beta:1",
      withdrawnAt: "2026-04-02T00:03:00.000Z",
      withdrawnBy: "subscriber-1",
      withdrawalReason: "rebalanced"
    });
    expect(oversight.quoteLadders).toHaveLength(1);
    expect(oversight.quoteLadders[0]).toMatchObject({
      invitations: [
        expect.objectContaining({ dealerId: "dealer-alpha" }),
        expect.objectContaining({ dealerId: "dealer-beta" })
      ],
      rfqId: rfq.rfqId,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      side: "sell",
      quotes: [
        expect.objectContaining({ quoteId: "quote-full-1", rank: 1 }),
        expect.objectContaining({ quoteId: "quote-full-2", rank: 2 })
      ]
    });
    expect(oversight.access.participants).toHaveLength(4);
    expect(oversight.health.status).toBe("healthy");
    expect(oversight.dealerUniverse).toEqual(["dealer-alpha", "dealer-beta"]);
    expect(oversight.revisions.map((revision) => revision.revisionId)).toEqual([
      "revision-a",
      "revision-b",
      "revision-c"
    ]);
    expect(oversight.withdrawals.map((withdrawal) => withdrawal.withdrawalId)).toEqual([
      "withdrawal-a",
      "withdrawal-b",
      "withdrawal-c"
    ]);
    expect(oversight.invitations.map((invitation) => invitation.invitationId)).toEqual([
      "rfq-ats-full-1:dealer-alpha:1",
      "rfq-ats-full-1:dealer-beta:1"
    ]);
  });
});
