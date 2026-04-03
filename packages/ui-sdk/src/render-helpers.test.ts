import { describe, expect, it } from "vitest";
import type { DealerWorkbenchView, OperatorView, SubscriberView } from "@canton-dark/query-models";

import {
  dealerMetrics,
  humanize,
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
          status: "pending",
          updatedAt: "2026-04-02T00:00:03.000Z"
        }
      ]
    } satisfies OperatorView;
    const subscriberView = {
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
  });
});
