import { describe, expect, it } from "vitest";
import type { DealerWorkbenchView, OperatorView, SubscriberView } from "@canton-dark/query-models";

import {
  comparisonMetrics,
  dealerMetrics,
  formatCountdown,
  humanize,
  latestDealerInvitation,
  latestDealerOpenQuote,
  latestSubscriberRfq,
  latestOpenDealerRfq,
  latestOpenSubscriberQuote,
  operatorMetrics,
  renderActionButton,
  renderCode,
  renderStatus,
  subscriberMetrics
} from "./render-helpers";

describe("render helpers", () => {
  it("humanizes tokens and renders code/status fragments", () => {
    expect(humanize("")).toBe("");
    expect(humanize("quote_expired")).toBe("Quote Expired");
    expect(humanize("  multi-stage_status ")).toBe("Multi Stage Status");
    expect(renderCode("pair-demo")).toContain("pair-demo");
    expect(renderStatus("accepted")).toContain("tone-ok");
    expect(renderStatus("quote_expired")).toContain("tone-warn");
    expect(renderStatus("paused")).toContain("tone-warn");
    expect(renderStatus("cancelled")).toContain("tone-alert");
    expect(renderStatus("expired")).toContain("tone-alert");
    expect(renderStatus("failed")).toContain("tone-alert");
    expect(renderStatus("rejected")).toContain("tone-alert");
    expect(renderStatus("mystery")).toContain("tone-muted");
    expect(renderActionButton({ action: "select-rfq", id: "rfq-1", label: "Quote RFQ" })).toContain(
      'class="button button"'
    );
    expect(
      renderActionButton({
        action: "accept-quote",
        id: "quote-1",
        label: "Accept quote",
        tone: "button-primary"
      })
    ).toContain('class="button button-primary"');
  });

  it("derives metrics and latest actionable records for each role", () => {
    const operatorView = {
      access: {
        pairId: "pair-1",
        participants: [
          { entitlements: ["view_pair"], roles: ["subscriber"], subjectId: "subscriber-1" }
        ]
      },
      executions: [
        {
          acceptedAt: "2026-04-02T00:00:03.000Z",
          dealerId: "dealer-alpha",
          executionId: "execution-1",
          instrumentId: "CUSIP-1",
          pairId: "pair-1",
          price: 100.5,
          quantity: 50,
          quoteId: "quote-1",
          rfqId: "rfq-1",
          side: "buy",
          subscriberId: "subscriber-1"
        }
      ],
      health: {
        detail: "Healthy",
        status: "healthy",
        summary: {
          activeParticipantCount: 1,
          dealers: ["dealer-alpha"],
          ledgerFacts: [],
          mode: "SingleDealerPair",
          offLedgerFacts: [],
          operatorId: "operator-demo",
          pairId: "pair-1",
          paused: false,
          rulebookVersion: "v1"
        },
        title: "health",
        violations: []
      },
      pair: {
        approvalStatus: "approved",
        attestationStatus: "attested",
        dealerId: "dealer-alpha",
        mode: "SingleDealerPair",
        operatorId: "operator-demo",
        pairId: "pair-1",
        paused: false,
        rulebookVersion: "v1"
      },
      quotes: [
        {
          createdAt: "2026-04-02T00:00:02.000Z",
          dealerId: "dealer-alpha",
          expiresAt: "2026-04-02T00:20:00.000Z",
          price: 100.5,
          quantity: 50,
          quoteId: "quote-1",
          rfqId: "rfq-1",
          status: "open",
          subscriberId: "subscriber-1"
        }
      ],
      rfqs: [
        {
          createdAt: "2026-04-02T00:00:01.000Z",
          dealerId: "dealer-alpha",
          instrumentId: "CUSIP-1",
          quantity: 50,
          rfqId: "rfq-1",
          side: "buy",
          status: "open",
          subscriberId: "subscriber-1"
        }
      ],
      settlements: [
        {
          createdAt: "2026-04-02T00:00:03.000Z",
          executionId: "execution-1",
          instructionId: "settlement-1",
          pairId: "pair-1",
          status: "pending",
          updatedAt: "2026-04-02T00:00:03.000Z"
        }
      ]
    } satisfies OperatorView;
    const subscriberView = {
      availableDealerIds: ["dealer-alpha"],
      canOpenRfq: true,
      entitlements: ["view_pair"],
      executions: [],
      pair: operatorView.pair,
      quotes: [
        {
          createdAt: "2026-04-02T00:00:01.000Z",
          dealerId: "dealer-alpha",
          expiresAt: "2026-04-02T00:20:00.000Z",
          price: 100.5,
          quantity: 50,
          quoteId: "quote-older",
          rfqId: "rfq-1",
          status: "open",
          subscriberId: "subscriber-1"
        },
        {
          createdAt: "2026-04-02T00:00:02.000Z",
          dealerId: "dealer-alpha",
          expiresAt: "2026-04-02T00:20:00.000Z",
          price: 101.25,
          quantity: 50,
          quoteId: "quote-latest",
          rfqId: "rfq-2",
          status: "open",
          subscriberId: "subscriber-1"
        },
        {
          createdAt: "2026-04-02T00:00:03.000Z",
          dealerId: "dealer-alpha",
          expiresAt: "2026-04-02T00:20:00.000Z",
          price: 99.5,
          quantity: 50,
          quoteId: "quote-accepted",
          rfqId: "rfq-3",
          status: "accepted",
          subscriberId: "subscriber-1"
        }
      ],
      rfqs: [],
      settlements: [],
      subscriberId: "subscriber-1"
    } satisfies SubscriberView;
    const dealerView = {
      dealerId: "dealer-alpha",
      executions: [],
      pair: operatorView.pair,
      quotes: [],
      rfqs: [
        {
          createdAt: "2026-04-02T00:00:01.000Z",
          dealerId: "dealer-alpha",
          instrumentId: "CUSIP-1",
          quantity: 50,
          rfqId: "rfq-open",
          side: "buy",
          status: "open",
          subscriberId: "subscriber-1"
        },
        {
          createdAt: "2026-04-02T00:00:02.000Z",
          dealerId: "dealer-alpha",
          instrumentId: "CUSIP-2",
          quantity: 75,
          rfqId: "rfq-quoted",
          side: "sell",
          status: "quoted",
          subscriberId: "subscriber-1"
        },
        {
          createdAt: "2026-04-02T00:00:03.000Z",
          dealerId: "dealer-alpha",
          instrumentId: "CUSIP-3",
          quantity: 80,
          rfqId: "rfq-closed",
          side: "buy",
          status: "rejected",
          subscriberId: "subscriber-1"
        }
      ]
    } satisfies DealerWorkbenchView;
    const operatorQuote = operatorView.quotes[0];

    if (operatorQuote === undefined) {
      throw new Error("Expected operator quote fixture.");
    }

    expect(operatorMetrics(operatorView)).toEqual([
      { label: "Participants", value: "1" },
      { label: "RFQs", value: "1" },
      { label: "Quotes", value: "1" },
      { label: "Executions", value: "1" },
      { label: "Settlements", value: "1" }
    ]);
    expect(subscriberMetrics(subscriberView)).toEqual([
      { label: "RFQs", value: "0" },
      { label: "Quotes", value: "3" },
      { label: "Executions", value: "0" },
      { label: "Settlements", value: "0" }
    ]);
    expect(dealerMetrics(dealerView)).toEqual([
      { label: "Inbound RFQs", value: "3" },
      { label: "Quotes", value: "0" },
      { label: "Executions", value: "0" }
    ]);
    expect(latestOpenSubscriberQuote(subscriberView)?.quoteId).toBe("quote-latest");
    expect(
      latestOpenSubscriberQuote({
        ...subscriberView,
        quotes: [
          {
            createdAt: "2026-04-02T00:00:04.000Z",
            dealerId: "dealer-alpha",
            expiresAt: "2026-04-02T00:20:00.000Z",
            price: 99.5,
            quantity: 50,
            quoteId: "quote-closed",
            rfqId: "rfq-4",
            status: "accepted",
            subscriberId: "subscriber-1"
          }
        ]
      })
    ).toBeUndefined();
    expect(latestOpenDealerRfq(dealerView)?.rfqId).toBe("rfq-quoted");
    expect(
      latestOpenDealerRfq({
        ...dealerView,
        rfqs: [
          {
            createdAt: "2026-04-02T00:00:03.000Z",
            dealerId: "dealer-alpha",
            instrumentId: "CUSIP-3",
            quantity: 80,
            rfqId: "rfq-closed",
            side: "buy",
            status: "rejected",
            subscriberId: "subscriber-1"
          }
        ]
      })
    ).toBeUndefined();
    expect(latestSubscriberRfq({ ...subscriberView, rfqs: dealerView.rfqs })).toMatchObject({
      rfqId: "rfq-closed"
    });
    expect(
      latestDealerInvitation({
        dealerId: "dealer-alpha",
        pair: operatorView.pair,
        invitations: [
          {
            invitationId: "invite-1",
            rfqId: "rfq-1",
            dealerId: "dealer-alpha",
            subscriberId: "subscriber-1",
            invitationVersion: 1,
            invitedAt: "2026-04-02T00:00:00.000Z",
            invitedBy: "subscriber-1",
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
            status: "open"
          }
        ],
        quotes: [operatorQuote],
        revisions: [],
        withdrawals: []
      })?.invitationId
    ).toBe("invite-1");
    expect(
      latestDealerOpenQuote(
        {
          dealerId: "dealer-alpha",
          pair: operatorView.pair,
          invitations: [],
          quotes: [operatorQuote],
          revisions: [],
          withdrawals: []
        },
        "rfq-1"
      )?.quoteId
    ).toBe("quote-1");
    expect(
      latestDealerOpenQuote(
        {
          dealerId: "dealer-alpha",
          pair: operatorView.pair,
          invitations: [],
          quotes: [operatorQuote],
          revisions: [],
          withdrawals: []
        },
        undefined
      )
    ).toBeUndefined();
    expect(
      comparisonMetrics({
        invitations: [],
        pairId: "pair-1",
        quotes: [
          {
            comparable: true,
            createdAt: "2026-04-02T00:00:01.000Z",
            dealerId: "dealer-alpha",
            expiresAt: "2026-04-02T00:10:00.000Z",
            price: 100,
            quantity: 10,
            quoteId: "quote-1",
            rank: 1,
            rfqId: "rfq-1",
            status: "open"
          }
        ],
        rfqId: "rfq-1",
        side: "buy",
        subscriberId: "subscriber-1",
        tieBreakRule: "Best price"
      })
    ).toEqual([
      { label: "Invited", value: "0" },
      { label: "Quotes", value: "1" },
      { label: "Comparable", value: "1" }
    ]);
    expect(formatCountdown("2026-04-02T00:00:00.000Z", "2026-04-02T00:01:05.000Z")).toBe(
      "1m 05s remaining"
    );
    expect(formatCountdown("2026-04-02T00:02:00.000Z", "2026-04-02T00:01:05.000Z")).toBe(
      "0m 55s past response window"
    );
  });

  it("sorts dealer invitations and open quotes by recency within RFQ scope", () => {
    const pair = {
      approvalStatus: "approved" as const,
      attestationStatus: "attested" as const,
      dealerId: "dealer-alpha",
      mode: "ATSPair" as const,
      operatorId: "operator-demo",
      pairId: "pair-1",
      paused: false,
      rulebookVersion: "v1"
    };

    expect(
      latestDealerInvitation({
        dealerId: "dealer-alpha",
        invitations: [
          {
            dealerId: "dealer-alpha",
            invitationId: "invite-a",
            invitationVersion: 1,
            invitedAt: "2026-04-02T00:00:00.000Z",
            invitedBy: "subscriber-1",
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
            rfqId: "rfq-1",
            status: "open",
            subscriberId: "subscriber-1"
          },
          {
            dealerId: "dealer-alpha",
            invitationId: "invite-z",
            invitationVersion: 1,
            invitedAt: "2026-04-02T00:00:00.000Z",
            invitedBy: "subscriber-1",
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
            rfqId: "rfq-2",
            status: "open",
            subscriberId: "subscriber-1"
          }
        ],
        pair,
        quotes: [],
        revisions: [],
        withdrawals: []
      })?.invitationId
    ).toBe("invite-z");

    expect(
      latestDealerOpenQuote(
        {
          dealerId: "dealer-alpha",
          invitations: [],
          pair,
          quotes: [
            {
              createdAt: "2026-04-02T00:00:01.000Z",
              dealerId: "dealer-alpha",
              expiresAt: "2026-04-02T00:20:00.000Z",
              price: 101,
              quantity: 25,
              quoteId: "quote-older",
              rfqId: "rfq-1",
              status: "open",
              subscriberId: "subscriber-1"
            },
            {
              createdAt: "2026-04-02T00:00:02.000Z",
              dealerId: "dealer-alpha",
              expiresAt: "2026-04-02T00:20:00.000Z",
              price: 102,
              quantity: 30,
              quoteId: "quote-newer",
              rfqId: "rfq-1",
              status: "open",
              subscriberId: "subscriber-1"
            },
            {
              createdAt: "2026-04-02T00:00:03.000Z",
              dealerId: "dealer-alpha",
              expiresAt: "2026-04-02T00:20:00.000Z",
              price: 103,
              quantity: 35,
              quoteId: "quote-other-rfq",
              rfqId: "rfq-2",
              status: "open",
              subscriberId: "subscriber-1"
            }
          ],
          revisions: [],
          withdrawals: []
        },
        "rfq-1"
      )?.quoteId
    ).toBe("quote-newer");
  });
});
