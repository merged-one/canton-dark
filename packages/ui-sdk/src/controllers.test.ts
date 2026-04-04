import { describe, expect, it, vi } from "vitest";

import {
  mountDealerWorkbench,
  mountDemoOrchestrator,
  mountOperatorConsole,
  mountSubscriberTerminal
} from "./index";

const jsonResponse = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json"
    }
  });

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
};

const asFetch = (value: ReturnType<typeof vi.fn>): typeof fetch => value as unknown as typeof fetch;

const asStorage = (value: ReturnType<typeof createStorage>): Storage => value as unknown as Storage;

const requestUrl = (input: RequestInfo | URL): string => {
  if (input instanceof Request) {
    return input.url;
  }

  return input instanceof URL ? input.toString() : input;
};

const parseRequestBodyAt = (value: ReturnType<typeof vi.fn>, callIndex: number): unknown => {
  const init = value.mock.calls[callIndex]?.[1] as RequestInit | undefined;

  if (typeof init?.body !== "string") {
    throw new Error(`Expected JSON request body for call ${callIndex}.`);
  }

  return JSON.parse(init.body) as unknown;
};

const findCallIndex = (
  value: ReturnType<typeof vi.fn>,
  suffix: string,
  method?: string
): number => {
  const index = value.mock.calls.findIndex(([input, init]) => {
    const url = requestUrl(input as RequestInfo | URL);

    return (
      url.endsWith(suffix) &&
      (method === undefined || (init as RequestInit | undefined)?.method === method)
    );
  });

  if (index === -1) {
    throw new Error(`Expected request ending with ${suffix}.`);
  }

  return index;
};

const findLastCallIndex = (
  value: ReturnType<typeof vi.fn>,
  suffix: string,
  method?: string
): number => {
  const entries = [...value.mock.calls.entries()];
  const match = [...entries].reverse().find(([, [input, init]]) => {
    const url = requestUrl(input as RequestInfo | URL);

    return (
      url.endsWith(suffix) &&
      (method === undefined || (init as RequestInit | undefined)?.method === method)
    );
  });

  if (match === undefined) {
    throw new Error(`Expected request ending with ${suffix}.`);
  }

  return match[0];
};

const flushUpdates = async (): Promise<void> => {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise((resolve) => setTimeout(resolve, 0));
};

const submit = (root: HTMLElement, selector: string): void => {
  root
    .querySelector<HTMLFormElement>(selector)
    ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
};

const click = (root: HTMLElement, selector: string): void => {
  root.querySelector<HTMLButtonElement>(selector)?.click();
};

const setValue = (root: HTMLElement, selector: string, value: string): void => {
  const field = root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
    selector
  );

  if (field !== null) {
    field.value = value;
  }
};

const setChecked = (root: HTMLElement, selector: string, checked: boolean): void => {
  const field = root.querySelector<HTMLInputElement>(selector);

  if (field !== null) {
    field.checked = checked;
  }
};

const demoStatus = {
  currentTime: "2026-04-02T00:00:00.000Z",
  dealerId: "dealer-alpha",
  dealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
  mode: "phase2-ready" as const,
  operatorId: "operator-demo",
  pairId: "pair-phase2-demo",
  seed: 424242,
  subscriberId: "subscriber-1"
};

const emptyDemoStatus = {
  ...demoStatus,
  mode: "empty" as const
};

const pair = {
  approvalStatus: "approved" as const,
  attestationStatus: "attested" as const,
  dealerId: "dealer-alpha",
  mode: "ATSPair" as const,
  operatorId: "operator-demo",
  pairId: "pair-phase2-demo",
  paused: false,
  rulebookVersion: "v2"
};

const rfq = {
  createdAt: "2026-04-02T00:00:01.000Z",
  dealerId: "dealer-alpha",
  instrumentId: "CUSIP-ATS-1",
  quantity: 50,
  rfqId: "rfq-1",
  side: "buy" as const,
  status: "quoted" as const,
  subscriberId: "subscriber-1"
};

const invitationAlpha = {
  dealerId: "dealer-alpha",
  invitationId: "invite-alpha",
  invitationVersion: 1,
  invitedAt: "2026-04-02T00:00:01.000Z",
  invitedBy: "subscriber-1",
  responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
  respondedAt: "2026-04-02T00:02:00.000Z",
  rfqId: "rfq-1",
  status: "responded" as const,
  subscriberId: "subscriber-1"
};

const invitationBeta = {
  dealerId: "dealer-beta",
  invitationId: "invite-beta",
  invitationVersion: 1,
  invitedAt: "2026-04-02T00:00:01.000Z",
  invitedBy: "subscriber-1",
  responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
  rfqId: "rfq-1",
  status: "open" as const,
  subscriberId: "subscriber-1"
};

const invitationGamma = {
  dealerId: "dealer-gamma",
  invitationId: "invite-gamma",
  invitationVersion: 1,
  invitedAt: "2026-04-02T00:00:01.000Z",
  invitedBy: "subscriber-1",
  responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
  rfqId: "rfq-1",
  status: "expired" as const,
  subscriberId: "subscriber-1"
};

const quoteAlphaOpen = {
  createdAt: "2026-04-02T00:02:00.000Z",
  dealerId: "dealer-alpha",
  expiresAt: "2026-04-02T00:20:00.000Z",
  price: 99.5,
  quantity: 50,
  quoteId: "quote-alpha",
  rfqId: "rfq-1",
  status: "open" as const,
  subscriberId: "subscriber-1"
};

const quoteAlphaAccepted = {
  ...quoteAlphaOpen,
  status: "accepted" as const
};

const quoteBetaWithdrawn = {
  createdAt: "2026-04-02T00:03:00.000Z",
  dealerId: "dealer-beta",
  expiresAt: "2026-04-02T00:20:00.000Z",
  price: 101.25,
  quantity: 50,
  quoteId: "quote-beta",
  rfqId: "rfq-1",
  status: "withdrawn" as const,
  subscriberId: "subscriber-1"
};

const execution = {
  acceptedAt: "2026-04-02T00:04:00.000Z",
  dealerId: "dealer-alpha",
  executionId: "execution-1",
  instrumentId: "CUSIP-ATS-1",
  pairId: pair.pairId,
  price: 99.5,
  quantity: 50,
  quoteId: "quote-alpha",
  rfqId: "rfq-1",
  side: "buy" as const,
  subscriberId: "subscriber-1"
};

const executionWithoutContext = {
  ...execution,
  quoteId: undefined,
  subscriberId: undefined
};

const settlement = {
  createdAt: "2026-04-02T00:04:00.000Z",
  executionId: "execution-1",
  instructionId: "settlement-1",
  pairId: pair.pairId,
  status: "pending" as const,
  updatedAt: "2026-04-02T00:04:00.000Z"
};

const operatorOversightView = {
  access: {
    pairId: pair.pairId,
    participants: [
      {
        entitlements: ["respond_quote", "view_pair"],
        roles: ["dealer"],
        subjectId: "dealer-alpha"
      },
      {
        entitlements: ["accept_quote", "submit_rfq", "view_pair"],
        roles: ["subscriber"],
        subjectId: "subscriber-1"
      }
    ]
  },
  audits: [
    {
      action: "create_pair",
      actorId: "operator-demo",
      at: "2026-04-02T00:00:00.000Z",
      detail: "ATSPair created.",
      entityId: pair.pairId,
      pairId: pair.pairId
    }
  ],
  dealerUniverse: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
  executions: [execution],
  health: {
    detail:
      "Operator operator-demo oversees 3 directed dealers with 2 active participant grant(s).",
    status: "healthy" as const,
    summary: {
      activeParticipantCount: 2,
      dealers: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
      ledgerFacts: ["RFQ sessions"],
      mode: "ATSPair" as const,
      offLedgerFacts: ["Transient UI state"],
      operatorId: "operator-demo",
      pairId: pair.pairId,
      paused: false,
      rulebookVersion: "v2"
    },
    title: "ATSPair health",
    violations: []
  },
  invitations: [invitationAlpha, invitationBeta, invitationGamma],
  inviteRevisionPolicy: "before_first_response" as const,
  oversightRole: "blinded" as const,
  pair,
  quoteLadders: [],
  quotes: [
    {
      createdAt: quoteAlphaOpen.createdAt,
      dealerId: "dealer-alpha",
      expiresAt: quoteAlphaOpen.expiresAt,
      price: null,
      quantity: null,
      quoteId: "quote-alpha",
      rfqId: "rfq-1",
      status: "open" as const,
      subscriberId: "subscriber-1"
    }
  ],
  revisions: [],
  rfqs: [rfq],
  settlements: [settlement],
  withdrawals: [
    {
      dealerId: "dealer-beta",
      pairId: pair.pairId,
      quoteId: "quote-beta",
      reason: "manual pullback",
      rfqId: "rfq-1",
      subscriberId: "subscriber-1",
      withdrawalId: "withdrawal-beta",
      withdrawnAt: "2026-04-02T00:03:30.000Z",
      withdrawnBy: "dealer-beta"
    }
  ]
};

const operatorGrantedView = {
  ...operatorOversightView,
  access: {
    ...operatorOversightView.access,
    participants: [
      ...operatorOversightView.access.participants,
      {
        entitlements: ["respond_quote", "view_pair"],
        roles: ["dealer"],
        subjectId: "dealer-beta"
      }
    ]
  }
};

const pausedOperatorView = {
  ...operatorGrantedView,
  pair: {
    ...operatorGrantedView.pair,
    paused: true
  },
  health: {
    ...operatorGrantedView.health,
    detail: "Pair paused by operator-demo: manual review.",
    status: "paused" as const,
    summary: {
      ...operatorGrantedView.health.summary,
      paused: true
    }
  }
};

const operatorFullOversightView = {
  ...operatorOversightView,
  health: {
    ...operatorOversightView.health,
    detail:
      "Operator operator-demo oversees a single routed dealer with full oversight visibility.",
    status: "rejected" as const,
    summary: {
      ...operatorOversightView.health.summary,
      dealers: ["dealer-beta"],
      mode: "SingleDealerPair" as const
    }
  },
  inviteRevisionPolicy: "locked" as const,
  oversightRole: "full" as const,
  pair: {
    ...pair,
    dealerId: "dealer-beta",
    mode: "SingleDealerPair" as const
  },
  quoteLadders: [
    {
      invitations: [
        {
          ...invitationBeta,
          dealerId: "dealer-beta"
        }
      ],
      pairId: pair.pairId,
      quotes: [
        {
          comparable: true,
          createdAt: quoteAlphaOpen.createdAt,
          dealerId: "dealer-beta",
          expiresAt: quoteAlphaOpen.expiresAt,
          price: 100.75,
          quantity: 75,
          quoteId: "quote-beta-full",
          rank: 1,
          rfqId: "rfq-1",
          status: "open" as const
        }
      ],
      rfqId: "rfq-1",
      responseWindowClosesAt: invitationBeta.responseWindowClosesAt,
      side: "buy" as const,
      subscriberId: "subscriber-1",
      tieBreakRule:
        "Best price, then larger quantity, then earliest quote creation time, then lexicographic quote id."
    }
  ],
  quotes: [
    {
      createdAt: quoteAlphaOpen.createdAt,
      dealerId: "dealer-beta",
      expiresAt: quoteAlphaOpen.expiresAt,
      price: 100.75,
      quantity: 75,
      quoteId: "quote-beta-full",
      rfqId: "rfq-1",
      status: "open" as const,
      subscriberId: "subscriber-1"
    }
  ],
  revisions: [
    {
      dealerId: "dealer-beta",
      nextQuoteId: "quote-beta-full",
      pairId: pair.pairId,
      previousQuoteId: "quote-beta-initial",
      revisedAt: "2026-04-02T00:03:00.000Z",
      revisedBy: "dealer-beta",
      revisionId: "revision-beta-1",
      rfqId: "rfq-1",
      subscriberId: "subscriber-1"
    }
  ],
  withdrawals: [
    {
      ...operatorOversightView.withdrawals[0],
      reason: undefined
    }
  ]
};

const operatorFallbackView = {
  ...operatorFullOversightView,
  executions: [executionWithoutContext],
  quoteLadders: (() => {
    const quoteLadder = operatorFullOversightView.quoteLadders[0];
    const firstQuote = quoteLadder?.quotes[0];
    if (!quoteLadder || !firstQuote) {
      throw new Error("Expected operatorFullOversightView quote ladder fixture");
    }

    return [
      {
        ...quoteLadder,
        quotes: [
          {
            ...firstQuote,
            rank: undefined
          }
        ]
      }
    ];
  })()
};

const subscriberReadyView = {
  availableDealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
  canOpenRfq: true,
  entitlements: ["accept_quote", "submit_rfq", "view_pair"],
  executions: [],
  pair,
  quotes: [],
  rfqs: [],
  settlements: [],
  subscriberId: "subscriber-1"
};

const subscriberQuotedView = {
  ...subscriberReadyView,
  quotes: [quoteAlphaOpen, quoteBetaWithdrawn],
  rfqs: [rfq]
};

const subscriberAcceptedView = {
  ...subscriberReadyView,
  executions: [execution],
  quotes: [quoteAlphaAccepted],
  rfqs: [
    {
      ...rfq,
      status: "accepted" as const
    }
  ],
  settlements: [settlement]
};

const subscriberRejectedView = {
  ...subscriberReadyView,
  quotes: [
    {
      ...quoteAlphaOpen,
      status: "stale" as const
    }
  ],
  rfqs: [
    {
      ...rfq,
      status: "rejected" as const
    }
  ]
};

const subscriberSelectionView = {
  ...subscriberReadyView,
  availableDealerIds: ["dealer-outsider"],
  quotes: [quoteAlphaOpen],
  rfqs: [
    {
      ...rfq,
      createdAt: "2026-04-02T00:00:01.000Z",
      instrumentId: "CUSIP-ATS-OLDER",
      rfqId: "rfq-older",
      status: "open" as const
    },
    {
      ...rfq,
      createdAt: "2026-04-02T00:00:03.000Z",
      instrumentId: "CUSIP-ATS-LATEST",
      rfqId: "rfq-latest",
      status: "quoted" as const
    }
  ]
};

const comparisonOpenView = {
  invitations: [invitationAlpha, invitationBeta, invitationGamma],
  pairId: pair.pairId,
  quotes: [
    {
      comparable: true,
      createdAt: quoteAlphaOpen.createdAt,
      dealerId: "dealer-alpha",
      expiresAt: quoteAlphaOpen.expiresAt,
      price: 99.5,
      quantity: 50,
      quoteId: "quote-alpha",
      rank: 1,
      rfqId: "rfq-1",
      status: "open" as const
    },
    {
      comparable: false,
      createdAt: quoteBetaWithdrawn.createdAt,
      dealerId: "dealer-beta",
      expiresAt: quoteBetaWithdrawn.expiresAt,
      price: 101.25,
      quantity: 50,
      quoteId: "quote-beta",
      rfqId: "rfq-1",
      status: "withdrawn" as const
    }
  ],
  rfqId: "rfq-1",
  responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
  side: "buy" as const,
  subscriberId: "subscriber-1",
  tieBreakRule:
    "Best price, then larger quantity, then earliest quote creation time, then lexicographic quote id."
};

const comparisonAcceptedView = {
  ...comparisonOpenView,
  quotes: [
    {
      ...comparisonOpenView.quotes[0],
      status: "accepted" as const
    }
  ]
};

const comparisonRejectedView = {
  ...comparisonOpenView,
  quotes: [
    {
      ...comparisonOpenView.quotes[0],
      comparable: false,
      status: "stale" as const
    }
  ]
};

const comparisonLatestView = {
  ...comparisonOpenView,
  rfqId: "rfq-latest"
};

const comparisonOlderView = {
  ...comparisonOpenView,
  invitations: [
    {
      ...invitationAlpha,
      invitationId: "invite-older",
      rfqId: "rfq-older",
      responseWindowClosesAt: "2026-04-01T23:59:00.000Z"
    }
  ],
  quotes: [
    {
      ...quoteBetaWithdrawn,
      comparable: false,
      quoteId: "quote-older-withdrawn",
      rfqId: "rfq-older"
    }
  ],
  responseWindowClosesAt: "2026-04-01T23:59:00.000Z",
  rfqId: "rfq-older"
};

const dealerWorkbenchView = {
  dealerId: "dealer-alpha",
  executions: [],
  pair,
  quotes: [],
  rfqs: [
    {
      ...rfq,
      status: "open" as const
    }
  ]
};

const dealerHistoryView = {
  dealerId: "dealer-alpha",
  invitations: [invitationAlpha],
  pair,
  quotes: [],
  revisions: [],
  withdrawals: []
};

const dealerOpenHistoryView = {
  ...dealerHistoryView,
  quotes: [quoteAlphaOpen]
};

const dealerRevisedHistoryView = {
  ...dealerHistoryView,
  quotes: [
    {
      ...quoteAlphaOpen,
      quoteId: "quote-alpha-revised",
      price: 99.25
    }
  ],
  revisions: [
    {
      dealerId: "dealer-alpha",
      nextQuoteId: "quote-alpha-revised",
      pairId: pair.pairId,
      previousQuoteId: "quote-alpha",
      revisedAt: "2026-04-02T00:03:30.000Z",
      revisedBy: "dealer-alpha",
      revisionId: "revision-1",
      rfqId: "rfq-1",
      subscriberId: "subscriber-1"
    }
  ]
};

const dealerWithdrawnHistoryView = {
  ...dealerHistoryView,
  quotes: [
    {
      ...quoteAlphaOpen,
      status: "withdrawn" as const
    }
  ],
  withdrawals: [
    {
      dealerId: "dealer-alpha",
      pairId: pair.pairId,
      quoteId: "quote-alpha-revised",
      reason: "manual pullback",
      rfqId: "rfq-1",
      subscriberId: "subscriber-1",
      withdrawalId: "withdrawal-1",
      withdrawnAt: "2026-04-02T00:04:00.000Z",
      withdrawnBy: "dealer-alpha"
    }
  ]
};

const dealerWorkbenchWithExecutionView = {
  ...dealerWorkbenchView,
  executions: [execution],
  rfqs: [
    {
      ...rfq,
      createdAt: "2026-04-02T00:00:01.000Z",
      rfqId: "rfq-older",
      status: "open" as const
    },
    {
      ...rfq,
      createdAt: "2026-04-02T00:00:02.000Z",
      rfqId: "rfq-1",
      status: "quoted" as const
    }
  ]
};

const dealerHistoryMultiOpenView = {
  ...dealerHistoryView,
  invitations: [
    {
      ...invitationAlpha,
      invitationId: "invite-older",
      invitedAt: "2026-04-02T00:00:01.000Z",
      rfqId: "rfq-older",
      status: "expired" as const
    },
    {
      ...invitationAlpha,
      invitationId: "invite-latest",
      invitedAt: "2026-04-02T00:00:02.000Z",
      rfqId: "rfq-1",
      status: "open" as const
    }
  ],
  quotes: [
    {
      ...quoteAlphaOpen,
      quoteId: "quote-older-open",
      rfqId: "rfq-older"
    },
    quoteAlphaOpen
  ],
  revisions: [
    {
      dealerId: "dealer-alpha",
      nextQuoteId: "quote-older-open",
      pairId: pair.pairId,
      previousQuoteId: "quote-older-initial",
      revisedAt: "2026-04-02T00:03:30.000Z",
      revisedBy: "dealer-alpha",
      revisionId: "revision-older-1",
      rfqId: "rfq-older",
      subscriberId: "subscriber-1"
    }
  ]
};

const dealerHistoryMultiWithdrawnView = {
  ...dealerHistoryMultiOpenView,
  quotes: [
    {
      ...dealerHistoryMultiOpenView.quotes[0],
      status: "withdrawn" as const
    },
    dealerHistoryMultiOpenView.quotes[1]
  ],
  withdrawals: [
    {
      dealerId: "dealer-alpha",
      pairId: pair.pairId,
      quoteId: "quote-older-open",
      reason: "manual pullback",
      rfqId: "rfq-older",
      subscriberId: "subscriber-1",
      withdrawalId: "withdrawal-older",
      withdrawnAt: "2026-04-02T00:04:00.000Z",
      withdrawnBy: "dealer-alpha"
    }
  ]
};

const dealerHistoryNoInvitationsView = {
  ...dealerHistoryView,
  invitations: [],
  quotes: [],
  revisions: [],
  withdrawals: []
};

const dealerWorkbenchFallbackView = {
  ...dealerWorkbenchWithExecutionView,
  executions: [executionWithoutContext]
};

const dealerHistoryFallbackView = {
  ...dealerHistoryMultiOpenView,
  invitations: [dealerHistoryMultiOpenView.invitations[1]],
  withdrawals: [
    {
      ...dealerHistoryMultiWithdrawnView.withdrawals[0],
      reason: undefined
    }
  ]
};

describe("ui-sdk controllers", () => {
  it("renders operator ATSPair workflows and issues create, access, pause, reactivate, and refresh commands", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let oversightReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(emptyDemoStatus);
      }

      if (url.endsWith("/pairs")) {
        return new Response(null, { status: 201 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/access")) {
        return new Response(null, { status: 201 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/pause")) {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/views/operator-oversight")) {
        oversightReads += 1;

        return jsonResponse(
          [
            operatorOversightView,
            operatorGrantedView,
            pausedOperatorView,
            operatorGrantedView,
            operatorGrantedView
          ][oversightReads - 1]
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("No pair is currently loaded.");

    submit(root, "[data-testid='operator-create-form']");
    await flushUpdates();

    setValue(root, "#operator-subject-id", "dealer-beta");
    setValue(root, "#operator-access-role", "dealer");
    submit(root, "[data-testid='operator-access-form']");
    await flushUpdates();

    click(root, "[data-action='toggle-pause']");
    await flushUpdates();
    click(root, "[data-action='toggle-pause']");
    await flushUpdates();
    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    expect(parseRequestBodyAt(fetchImpl, findCallIndex(fetchImpl, "/pairs", "POST"))).toEqual({
      dealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
      inviteRevisionPolicy: "before_first_response",
      jurisdiction: "US",
      mode: "ATSPair",
      operatorId: "operator-demo",
      operatorOversightRole: "blinded",
      pairId: "pair-phase2-demo",
      rulebookSummary: "phase 2 ats demo",
      rulebookVersion: "v2"
    });
    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/access", "POST")
      )
    ).toEqual({
      role: "dealer",
      subjectId: "dealer-beta"
    });
    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/pause", "POST")
      )
    ).toEqual({
      reason: "manual review",
      state: "paused"
    });
    expect(
      parseRequestBodyAt(
        fetchImpl,
        findLastCallIndex(fetchImpl, "/pairs/pair-phase2-demo/pause", "POST")
      )
    ).toEqual({
      state: "active"
    });
    expect(root.textContent).toContain("dealer-beta");
    expect(root.textContent).toContain("Dealer universe");
    expect(root.textContent).toContain("Refreshed pair pair-phase2-demo.");
  });

  it("updates the operator session, surfaces authorization errors, and clears the current pair when blank", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(operatorOversightView))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message:
              "Only the pair operator may access the operator view for pair pair-phase2-demo."
          },
          403
        )
      );

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    setValue(root, "#operator-actor-id", "operator-outsider");
    submit(root, "[data-testid='operator-session-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "Only the pair operator may access the operator view for pair pair-phase2-demo."
    );
    expect(storage.getItem("canton-dark.demo.session.operator")).toContain("operator-outsider");

    setValue(root, "#operator-pair-id", "");
    submit(root, "[data-testid='operator-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No pair is currently loaded.");
  });

  it("renders full oversight with quote ladders and creates a SingleDealerPair payload", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(emptyDemoStatus);
      }

      if (url.endsWith("/pairs")) {
        return new Response(null, { status: 201 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/access")) {
        return new Response(null, { status: 201 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/views/operator-oversight")) {
        return jsonResponse(operatorFullOversightView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    setValue(root, "#operator-mode", "SingleDealerPair");
    setValue(root, "#operator-single-dealer-id", "dealer-beta");
    setValue(root, "#operator-oversight-role", "full");
    setValue(root, "#operator-invite-policy", "locked");
    submit(root, "[data-testid='operator-create-form']");
    await flushUpdates();

    setValue(root, "#operator-subject-id", "settlement-bot");
    setValue(root, "#operator-access-role", "settlement_delegate");
    submit(root, "[data-testid='operator-access-form']");
    await flushUpdates();

    expect(parseRequestBodyAt(fetchImpl, findCallIndex(fetchImpl, "/pairs", "POST"))).toEqual({
      dealerId: "dealer-beta",
      jurisdiction: "US",
      mode: "SingleDealerPair",
      operatorId: "operator-demo",
      pairId: "pair-phase2-demo",
      rulebookSummary: "phase 2 ats demo",
      rulebookVersion: "v2"
    });
    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/access", "POST")
      )
    ).toEqual({
      role: "settlement_delegate",
      subjectId: "settlement-bot"
    });
    expect(root.textContent).toContain("revision-beta-1");
    expect(root.textContent).toContain("quote-beta-full");
    expect(root.textContent).not.toContain(
      "Blinded oversight redacts live quote ladders and non-accepted quote economics."
    );
  });

  it("renders operator fallback cells for missing ranks and execution context", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/views/operator-oversight")) {
        return jsonResponse(operatorFallbackView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("Quote ladders");
    expect(root.textContent).toContain("Executions");
    expect(root.textContent).toContain("n/a");
  });

  it("ignores inert operator actions and returns early when pause is clicked without a loaded pair", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse(emptyDemoStatus));

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    const toggleButton = root.querySelector<HTMLButtonElement>("[data-action='toggle-pause']");

    if (toggleButton === null) {
      throw new Error("Expected the toggle pause button to render.");
    }

    toggleButton.disabled = false;
    toggleButton.dataset.action = "noop";
    toggleButton.click();
    await flushUpdates();

    toggleButton.dataset.action = "toggle-pause";
    toggleButton.click();
    await flushUpdates();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain("No pair is currently loaded.");
  });

  it("renders subscriber loading, opens a directed RFQ, and invites the selected dealers", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let subscriberReads = 0;
    let ladderReads = 0;
    let demoReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        demoReads += 1;

        return jsonResponse(demoReads === 1 ? emptyDemoStatus : demoStatus);
      }

      if (url.includes("/views/subscriber")) {
        subscriberReads += 1;

        return jsonResponse(subscriberReads === 1 ? subscriberReadyView : subscriberQuotedView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs")) {
        return new Response(null, { status: 201 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-1/invite-dealers")) {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-1/quote-ladder")) {
        ladderReads += 1;

        return jsonResponse(comparisonOpenView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("No pair is currently visible for this subscriber.");

    setValue(root, "#subscriber-pair-id", "pair-phase2-demo");
    submit(root, "[data-testid='subscriber-pair-form']");
    await flushUpdates();

    setValue(root, "#subscriber-instrument-id", "CUSIP-ATS-2");
    setValue(root, "#subscriber-quantity", "75");
    setValue(root, "#subscriber-response-window", "15");
    setChecked(root, "#subscriber-dealer-dealer-gamma", false);
    submit(root, "[data-testid='subscriber-rfq-form']");
    await flushUpdates();
    click(root, "[data-action='refresh-pair']");
    await flushUpdates();
    click(root, "[data-action='select-rfq']");
    await flushUpdates();

    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/rfqs", "POST")
      )
    ).toMatchObject({
      instrumentId: "CUSIP-ATS-2",
      quantity: 75,
      side: "buy",
      responseWindowClosesAt: "2026-04-02T00:15:00.000Z"
    });
    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/rfqs/rfq-1/invite-dealers", "POST")
      )
    ).toEqual({
      dealerIds: ["dealer-alpha", "dealer-beta"]
    });
    expect(root.textContent).toContain("Subscriber compare-quotes screen");
    expect(root.textContent).toContain("Directed invitations");
    expect(ladderReads).toBeGreaterThan(0);
  });

  it("renders the subscriber compare screen and accepts a quote", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let subscriberReads = 0;
    let ladderReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/subscriber")) {
        subscriberReads += 1;

        return jsonResponse([subscriberQuotedView, subscriberAcceptedView][subscriberReads - 1]);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-1/quote-ladder")) {
        ladderReads += 1;

        return jsonResponse(ladderReads === 1 ? comparisonOpenView : comparisonAcceptedView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/quotes/quote-alpha/accept")) {
        return new Response(null, { status: 200 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("Quote comparison");
    click(root, "[data-action='accept-quote']");
    await flushUpdates();

    expect(root.textContent).toContain("Accepted quote quote-alpha.");
    expect(root.textContent).toContain("settlement-1");
  });

  it("renders paused subscriber visibility, rejects all quotes, and surfaces session authorization errors", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let subscriberReads = 0;
    let ladderReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/subscriber")) {
        subscriberReads += 1;

        if (subscriberReads === 1) {
          return jsonResponse(subscriberQuotedView);
        }

        if (subscriberReads === 2) {
          return jsonResponse(subscriberRejectedView);
        }

        return jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message:
              "Only subscriber subscriber-outsider may access the subscriber view for pair pair-phase2-demo."
          },
          403
        );
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-1/quote-ladder")) {
        ladderReads += 1;

        return jsonResponse(ladderReads === 1 ? comparisonOpenView : comparisonRejectedView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-1/reject-all")) {
        expect(init?.method).toBe("POST");
        return new Response(null, { status: 200 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    click(root, "[data-action='reject-all']");
    await flushUpdates();
    expect(root.textContent).toContain("Rejected all quotes for RFQ rfq-1.");

    setValue(root, "#subscriber-actor-id", "subscriber-outsider");
    submit(root, "[data-testid='subscriber-session-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "Only subscriber subscriber-outsider may access the subscriber view for pair pair-phase2-demo."
    );
  });

  it("reconciles invited dealers, switches RFQs, validates empty invite sets, and clears the subscriber pair", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/subscriber")) {
        return jsonResponse(subscriberSelectionView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-latest/quote-ladder")) {
        return jsonResponse(comparisonLatestView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-older/quote-ladder")) {
        return jsonResponse(comparisonOlderView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(
      root.querySelector<HTMLInputElement>("#subscriber-dealer-dealer-outsider")?.checked
    ).toBe(true);

    click(root, "[data-action='select-rfq']");
    await flushUpdates();

    expect(
      findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/rfqs/rfq-older/quote-ladder")
    ).toBeGreaterThan(-1);
    expect(root.textContent).toContain("past response window");

    setChecked(root, "#subscriber-dealer-dealer-outsider", false);
    setValue(root, "#subscriber-side", "sell");
    submit(root, "[data-testid='subscriber-rfq-form']");
    await flushUpdates();

    expect(root.textContent).toContain("Select at least one dealer for an ATSPair RFQ.");

    setValue(root, "#subscriber-pair-id", "");
    submit(root, "[data-testid='subscriber-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No pair is currently visible for this subscriber.");
  });

  it("reselects the latest visible subscriber RFQ and ignores inert quote-comparison actions", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let subscriberReads = 0;
    const latestOnlyView = {
      ...subscriberReadyView,
      executions: [executionWithoutContext],
      quotes: [quoteAlphaOpen],
      rfqs: [subscriberSelectionView.rfqs[1]]
    };
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/subscriber")) {
        subscriberReads += 1;

        return jsonResponse(
          subscriberReads === 1
            ? {
                ...subscriberSelectionView,
                executions: [executionWithoutContext]
              }
            : latestOnlyView
        );
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-latest/quote-ladder")) {
        return jsonResponse(comparisonLatestView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-older/quote-ladder")) {
        return jsonResponse(comparisonOlderView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    click(root, "[data-action='select-rfq']");
    await flushUpdates();
    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    const rejectAllButton = root.querySelector<HTMLButtonElement>("[data-action='reject-all']");

    if (rejectAllButton === null) {
      throw new Error("Expected the reject-all action to render.");
    }

    rejectAllButton.dataset.action = "noop";
    rejectAllButton.click();
    await flushUpdates();

    expect(root.textContent).toContain("rfq-latest");
    expect(root.textContent).toContain("n/a");
  });

  it("skips dealer invites when a scripted RFQ submit runs after the subscriber pair is cleared", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(emptyDemoStatus))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(new Response(null, { status: 201 }));

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    setValue(root, "#subscriber-pair-id", "");
    submit(root, "[data-testid='subscriber-pair-form']");
    await flushUpdates();

    submit(root, "[data-testid='subscriber-rfq-form']");
    await flushUpdates();

    expect(findCallIndex(fetchImpl, "/pairs//rfqs", "POST")).toBeGreaterThan(-1);
    expect(
      fetchImpl.mock.calls.some(([input]) =>
        requestUrl(input as RequestInfo | URL).includes("/invite-dealers")
      )
    ).toBe(false);
    expect(root.textContent).toContain("Opened RFQ for CUSIP-ATS-1.");
  });

  it("renders dealer invitation detail workflows and submits, revises, and withdraws quotes", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let workbenchReads = 0;
    let historyReads = 0;
    let demoReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        demoReads += 1;

        return jsonResponse({
          ...demoStatus,
          currentTime: `2026-04-02T00:0${demoReads - 1}:00.000Z`
        });
      }

      if (url.includes("/views/dealer-workbench")) {
        workbenchReads += 1;

        return jsonResponse(
          [dealerWorkbenchView, dealerWorkbenchView, dealerWorkbenchView, dealerWorkbenchView][
            workbenchReads - 1
          ]
        );
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-alpha/history")) {
        historyReads += 1;

        return jsonResponse(
          [
            dealerHistoryView,
            dealerOpenHistoryView,
            dealerRevisedHistoryView,
            dealerWithdrawnHistoryView
          ][historyReads - 1]
        );
      }

      if (url.endsWith("/pairs/pair-phase2-demo/rfqs/rfq-1/quotes")) {
        return new Response(null, { status: 201 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/quotes/quote-alpha/revise")) {
        return new Response(null, { status: 200 });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/quotes/quote-alpha-revised/withdraw")) {
        return new Response(null, { status: 200 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    click(root, "[data-action='select-invitation']");
    submit(root, "[data-testid='dealer-quote-form']");
    await flushUpdates();
    submit(root, "[data-testid='dealer-quote-form']");
    await flushUpdates();
    click(root, "[data-action='refresh-pair']");
    await flushUpdates();
    click(root, "[data-action='withdraw-quote']");
    await flushUpdates();

    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/rfqs/rfq-1/quotes", "POST")
      )
    ).toMatchObject({
      price: 100.5,
      quantity: 50
    });
    expect(
      parseRequestBodyAt(
        fetchImpl,
        findCallIndex(fetchImpl, "/pairs/pair-phase2-demo/quotes/quote-alpha/revise", "POST")
      )
    ).toMatchObject({
      price: 100.5,
      quantity: 50
    });
    expect(root.textContent).toContain("Current quote");
    expect(root.textContent).toContain("No open quote");
    expect(root.textContent).toContain("withdrawal-1");
  });

  it("blocks ATSPair creation when fewer than two dealers are selected", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(emptyDemoStatus);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    setChecked(root, "#operator-universe-dealer-beta", false);
    setChecked(root, "#operator-universe-dealer-gamma", false);
    submit(root, "[data-testid='operator-create-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "ATSPair venues require at least two dealers in the dealer universe."
    );
  });

  it("renders dealer empty state, handles missing-selection errors, and surfaces authorization failures", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let demoReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        demoReads += 1;

        return jsonResponse(demoReads === 1 ? emptyDemoStatus : demoStatus);
      }

      if (url.includes("/views/dealer-workbench")) {
        return jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message:
              "Only dealer dealer-outsider may access the dealer workbench for pair pair-phase2-demo."
          },
          403
        );
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-outsider/history")) {
        return jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message:
              "Only dealer dealer-outsider may access the dealer workbench for pair pair-phase2-demo."
          },
          403
        );
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("No pair is currently visible for this dealer.");

    submit(root, "[data-testid='dealer-quote-form']");
    await flushUpdates();
    expect(root.textContent).toContain("Select an RFQ before submitting or revising a quote.");

    setValue(root, "#dealer-actor-id", "dealer-outsider");
    submit(root, "[data-testid='dealer-session-form']");
    await flushUpdates();
    expect(root.textContent).toContain(
      "Only dealer dealer-outsider may access the dealer workbench for pair pair-phase2-demo."
    );
  });

  it("renders dealer executions, switches invitation detail, withdraws the selected quote, and clears the pair", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let historyReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/dealer-workbench")) {
        return jsonResponse(dealerWorkbenchWithExecutionView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-alpha/history")) {
        historyReads += 1;

        return jsonResponse(
          historyReads === 1 ? dealerHistoryMultiOpenView : dealerHistoryMultiWithdrawnView
        );
      }

      if (url.endsWith("/pairs/pair-phase2-demo/quotes/quote-older-open/withdraw")) {
        return new Response(null, { status: 200 });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    click(root, "[data-action='select-invitation']");
    await flushUpdates();
    click(root, "[data-action='withdraw-quote']");
    await flushUpdates();

    expect(root.textContent).toContain("execution-1");
    expect(root.textContent).toContain("withdrawal-older");

    setValue(root, "#dealer-pair-id", "");
    submit(root, "[data-testid='dealer-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No pair is currently visible for this dealer.");
  });

  it("retains a manually selected routed RFQ when history has no explicit invitations", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/dealer-workbench")) {
        return jsonResponse(dealerWorkbenchWithExecutionView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-alpha/history")) {
        return jsonResponse(dealerHistoryNoInvitationsView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    click(root, "[data-action='select-rfq']");
    await flushUpdates();

    expect(root.querySelector<HTMLInputElement>("#dealer-selected-rfq")?.value).toBe("rfq-older");
    expect(root.textContent).toContain("Loaded RFQ rfq-older.");

    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    expect(root.querySelector<HTMLInputElement>("#dealer-selected-rfq")?.value).toBe("rfq-older");
    expect(root.textContent).toContain("No invitations are visible for this dealer.");
  });

  it("surfaces the dealer missing-selection error when no routed RFQ or invitation is selected", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/dealer-workbench")) {
        return jsonResponse({
          ...dealerWorkbenchView,
          rfqs: []
        });
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-alpha/history")) {
        return jsonResponse(dealerHistoryNoInvitationsView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    submit(root, "[data-testid='dealer-quote-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No invitations are visible for this dealer.");
    expect(root.textContent).toContain("No routed RFQs are visible for this dealer.");
    expect(root.textContent).toContain("Select an RFQ before submitting or revising a quote.");
  });

  it("preserves dealer RFQ state without invitations, renders n/a fallbacks, and ignores inert actions", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    let demoReads = 0;
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        demoReads += 1;

        return jsonResponse({
          ...demoStatus,
          currentTime: `2026-04-02T00:0${demoReads - 1}:00.000Z`
        });
      }

      if (url.includes("/views/dealer-workbench")) {
        return jsonResponse(dealerWorkbenchFallbackView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-alpha/history")) {
        return jsonResponse(dealerHistoryFallbackView);
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    click(root, "[data-action='select-rfq']");
    await flushUpdates();

    const latestRfqButton = root.querySelector<HTMLButtonElement>("[data-action='select-rfq']");

    if (latestRfqButton === null) {
      throw new Error("Expected the non-selected RFQ action to render.");
    }

    latestRfqButton.dataset.action = "select-invitation";
    latestRfqButton.dataset.id = "missing-invitation";
    latestRfqButton.click();
    await flushUpdates();

    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    const withdrawButton = root.querySelector<HTMLButtonElement>("[data-action='withdraw-quote']");

    if (withdrawButton === null) {
      throw new Error("Expected the withdraw action to render.");
    }

    withdrawButton.dataset.action = "noop";
    withdrawButton.click();
    await flushUpdates();

    expect(fetchImpl.mock.calls.some(([input]) => requestUrl(input).includes("/withdraw"))).toBe(
      false
    );
    expect(root.textContent).toContain("invite-latest");
    expect(root.textContent).toContain("execution-1");
    expect(root.textContent).toContain("n/a");
  });

  it("renders a dealer withdrawal placeholder when the visible withdrawal omits a reason", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi.fn(async (input: RequestInfo | URL) => {
      const url = requestUrl(input);

      if (url.endsWith("/demo/status")) {
        return jsonResponse(demoStatus);
      }

      if (url.includes("/views/dealer-workbench")) {
        return jsonResponse(dealerWorkbenchView);
      }

      if (url.endsWith("/pairs/pair-phase2-demo/dealers/dealer-alpha/history")) {
        return jsonResponse({
          ...dealerHistoryNoInvitationsView,
          withdrawals: [
            {
              ...dealerWithdrawnHistoryView.withdrawals[0],
              quoteId: "quote-alpha",
              reason: undefined
            }
          ]
        });
      }

      throw new Error(`Unhandled request: ${url}`);
    });

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase2-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("withdrawal-1");
    expect(root.textContent).toContain("n/a");
  });

  it("renders demo orchestration controls for phase 1, phase 2, and clock advance", async () => {
    const root = document.createElement("div");
    const phase3Status = {
      ...demoStatus,
      buyOrderId: "dark-order-buy-1",
      mode: "phase3-ready" as const,
      proposalId: "match-proposal-1",
      secondarySubscriberId: "subscriber-2",
      sellOrderId: "dark-order-sell-1"
    };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(emptyDemoStatus))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "phase1-complete" as const }))
      .mockResolvedValueOnce(jsonResponse(phase3Status))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(
        jsonResponse({
          ...demoStatus,
          currentTime: "2026-04-02T00:05:00.000Z"
        })
      );

    await mountDemoOrchestrator({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      root
    });

    click(root, "[data-action='seed-empty']");
    await flushUpdates();
    click(root, "[data-action='seed-ready']");
    await flushUpdates();
    click(root, "[data-action='seed-complete']");
    await flushUpdates();
    click(root, "[data-action='seed-phase3-ready']");
    await flushUpdates();
    expect(root.textContent).toContain("match-proposal-1");
    click(root, "[data-action='seed-phase2-ready']");
    await flushUpdates();
    click(root, "[data-action='advance-clock']");
    await flushUpdates();

    expect(root.textContent).toContain("dealer-beta");
    expect(root.textContent).toContain("Advanced API clock by five minutes.");
  });

  it("renders proposal placeholders when phase 3 order ids are unavailable and ignores inert demo actions", async () => {
    const root = document.createElement("div");
    const fetchImpl = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        ...demoStatus,
        buyOrderId: undefined,
        mode: "phase3-ready" as const,
        proposalId: "match-proposal-2",
        secondarySubscriberId: "subscriber-2",
        sellOrderId: undefined
      })
    );

    await mountDemoOrchestrator({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      root
    });

    const advanceButton = root.querySelector<HTMLButtonElement>("[data-action='advance-clock']");

    if (advanceButton === null) {
      throw new Error("Expected the advance clock button to render.");
    }

    advanceButton.dataset.action = "noop";
    advanceButton.click();
    await flushUpdates();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(root.textContent).toContain("match-proposal-2");
    expect(root.textContent).toContain("n/a");
  });

  it("surfaces demo orchestrator reset failures", async () => {
    const root = document.createElement("div");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "DEMO_RESET_FAILED",
            message: "Demo reset failed."
          },
          500
        )
      );

    await mountDemoOrchestrator({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      root
    });

    click(root, "[data-action='seed-empty']");
    await flushUpdates();
    expect(root.textContent).toContain("Demo reset failed.");
  });

  it("falls back to the global fetch implementation when no fetch override is provided", async () => {
    const operatorRoot = document.createElement("div");
    const subscriberRoot = document.createElement("div");
    const dealerRoot = document.createElement("div");
    const demoRoot = document.createElement("div");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(emptyDemoStatus))
      .mockResolvedValueOnce(jsonResponse(emptyDemoStatus))
      .mockResolvedValueOnce(jsonResponse(emptyDemoStatus))
      .mockResolvedValueOnce(jsonResponse(demoStatus));

    vi.stubGlobal("fetch", asFetch(fetchImpl));

    try {
      await mountOperatorConsole({
        apiBaseUrl: "http://unit.test",
        location: new URL("http://localhost/"),
        root: operatorRoot,
        storage: asStorage(createStorage())
      });
      await mountSubscriberTerminal({
        apiBaseUrl: "http://unit.test",
        location: new URL("http://localhost/"),
        root: subscriberRoot,
        storage: asStorage(createStorage())
      });
      await mountDealerWorkbench({
        apiBaseUrl: "http://unit.test",
        location: new URL("http://localhost/"),
        root: dealerRoot,
        storage: asStorage(createStorage())
      });
      await mountDemoOrchestrator({
        apiBaseUrl: "http://unit.test",
        root: demoRoot
      });
    } finally {
      vi.unstubAllGlobals();
    }

    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(operatorRoot.textContent).toContain("No pair is currently loaded.");
    expect(subscriberRoot.textContent).toContain(
      "No pair is currently visible for this subscriber."
    );
    expect(dealerRoot.textContent).toContain("No pair is currently visible for this dealer.");
    expect(demoRoot.textContent).toContain("Demo Orchestrator");
  });
});
