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

const parseRequestBodyAt = (value: ReturnType<typeof vi.fn>, callIndex: number): unknown => {
  const init = value.mock.calls[callIndex]?.[1] as RequestInit | undefined;

  if (typeof init?.body !== "string") {
    throw new Error(`Expected JSON request body for call ${callIndex}.`);
  }

  return JSON.parse(init.body) as unknown;
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

const demoStatus = {
  currentTime: "2026-04-02T00:00:00.000Z",
  dealerId: "dealer-alpha",
  mode: "phase1-ready" as const,
  operatorId: "operator-demo",
  pairId: "pair-phase1-demo",
  seed: 424242,
  subscriberId: "subscriber-1"
};

const rfq = {
  createdAt: "2026-04-02T00:00:01.000Z",
  dealerId: "dealer-alpha",
  instrumentId: "CUSIP-1",
  quantity: 50,
  rfqId: "rfq-1",
  side: "buy" as const,
  status: "quoted" as const,
  subscriberId: "subscriber-1"
};

const quote = {
  createdAt: "2026-04-02T00:00:02.000Z",
  dealerId: "dealer-alpha",
  expiresAt: "2026-04-02T00:20:00.000Z",
  price: 100.5,
  quantity: 50,
  quoteId: "quote-1",
  rfqId: "rfq-1",
  status: "open" as const,
  subscriberId: "subscriber-1"
};

const execution = {
  acceptedAt: "2026-04-02T00:00:03.000Z",
  dealerId: "dealer-alpha",
  executionId: "execution-1",
  instrumentId: "CUSIP-1",
  pairId: "pair-phase1-demo",
  price: 100.5,
  quantity: 50,
  quoteId: "quote-1",
  rfqId: "rfq-1",
  side: "buy" as const,
  subscriberId: "subscriber-1"
};

const settlement = {
  createdAt: "2026-04-02T00:00:03.000Z",
  executionId: "execution-1",
  instructionId: "settlement-1",
  status: "pending" as const,
  updatedAt: "2026-04-02T00:00:03.000Z"
};

const operatorView = {
  pair: {
    approvalStatus: "approved" as const,
    attestationStatus: "attested" as const,
    dealerId: "dealer-alpha",
    mode: "SingleDealerPair" as const,
    operatorId: "operator-demo",
    pairId: "pair-phase1-demo",
    paused: false,
    rulebookVersion: "v1"
  },
  access: {
    pairId: "pair-phase1-demo",
    participants: [
      {
        entitlements: ["respond_quote", "view_pair"],
        roles: ["dealer"],
        subjectId: "dealer-alpha"
      }
    ]
  },
  executions: [execution],
  health: {
    detail: "Healthy pair.",
    status: "healthy" as const,
    summary: {
      activeParticipantCount: 2,
      dealers: ["dealer-alpha"],
      ledgerFacts: ["RFQ sessions"],
      mode: "SingleDealerPair" as const,
      offLedgerFacts: ["Transient UI state"],
      operatorId: "operator-demo",
      pairId: "pair-phase1-demo",
      paused: false,
      rulebookVersion: "v1"
    },
    title: "SingleDealerPair health",
    violations: []
  },
  quotes: [quote],
  rfqs: [rfq],
  settlements: [settlement]
};

const operatorGrantedView = {
  ...operatorView,
  access: {
    ...operatorView.access,
    participants: [
      ...operatorView.access.participants,
      {
        entitlements: ["accept_quote", "submit_rfq", "view_pair"],
        roles: ["subscriber"],
        subjectId: "subscriber-1"
      }
    ]
  },
  health: {
    ...operatorView.health,
    summary: {
      ...operatorView.health.summary,
      activeParticipantCount: 3
    }
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

const rejectedOperatorView = {
  ...operatorView,
  health: {
    ...operatorView.health,
    detail: "Rejected pair.",
    status: "rejected" as const
  }
};

const auditTrail = {
  entries: [
    {
      action: "create_pair",
      actorId: "operator-demo",
      at: "2026-04-02T00:00:00.000Z",
      detail: "Pair created.",
      entityId: "pair-phase1-demo",
      pairId: "pair-phase1-demo"
    }
  ],
  pairId: "pair-phase1-demo"
};

const auditTrailWithGrant = {
  ...auditTrail,
  entries: [
    ...auditTrail.entries,
    {
      action: "grant_access",
      actorId: "operator-demo",
      at: "2026-04-02T00:00:01.000Z",
      detail: "subscriber access granted to subscriber-1.",
      entityId: "grant-1",
      pairId: "pair-phase1-demo"
    }
  ]
};

const subscriberView = {
  canOpenRfq: true,
  entitlements: ["accept_quote", "submit_rfq", "view_pair"],
  executions: [],
  pair: operatorView.pair,
  quotes: [quote],
  rfqs: [rfq],
  settlements: [],
  subscriberId: "subscriber-1"
};

const subscriberAcceptedView = {
  ...subscriberView,
  executions: [execution],
  quotes: [
    {
      ...quote,
      status: "accepted" as const
    }
  ],
  settlements: [settlement]
};

const subscriberOpenRfqView = {
  ...subscriberView,
  entitlements: ["submit_rfq", "view_pair"],
  quotes: [],
  rfqs: [],
  settlements: []
};

const subscriberAfterOpenView = {
  ...subscriberOpenRfqView,
  rfqs: [
    {
      ...rfq,
      quantity: 75,
      side: "sell" as const,
      status: "open" as const
    }
  ]
};

const subscriberPausedView = {
  ...subscriberOpenRfqView,
  canOpenRfq: false,
  entitlements: [],
  pair: {
    ...subscriberOpenRfqView.pair,
    paused: true
  }
};

const dealerView = {
  dealerId: "dealer-alpha",
  executions: [],
  pair: operatorView.pair,
  quotes: [],
  rfqs: [
    {
      ...rfq,
      status: "open" as const
    }
  ]
};

const dealerQuotedView = {
  ...dealerView,
  quotes: [quote],
  rfqs: [
    {
      ...dealerView.rfqs[0],
      status: "quoted" as const
    }
  ]
};

const dealerHistoryView = {
  ...dealerQuotedView,
  executions: [execution],
  rfqs: []
};

describe("ui-sdk controllers", () => {
  it("renders operator workflows and issues create, access, pause, reactivate, and refresh commands", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(jsonResponse({ pairId: "pair-phase1-demo" }))
      .mockResolvedValueOnce(jsonResponse(operatorView))
      .mockResolvedValueOnce(jsonResponse(auditTrail))
      .mockResolvedValueOnce(jsonResponse({ grantId: "grant-1" }))
      .mockResolvedValueOnce(jsonResponse(operatorGrantedView))
      .mockResolvedValueOnce(jsonResponse(auditTrailWithGrant))
      .mockResolvedValueOnce(jsonResponse({ pairId: "pair-phase1-demo" }))
      .mockResolvedValueOnce(jsonResponse(pausedOperatorView))
      .mockResolvedValueOnce(jsonResponse(auditTrailWithGrant))
      .mockResolvedValueOnce(jsonResponse({ pairId: "pair-phase1-demo" }))
      .mockResolvedValueOnce(jsonResponse(operatorGrantedView))
      .mockResolvedValueOnce(jsonResponse(auditTrailWithGrant))
      .mockResolvedValueOnce(jsonResponse(operatorGrantedView))
      .mockResolvedValueOnce(jsonResponse(auditTrailWithGrant));

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

    setValue(root, "#operator-subject-id", "subscriber-1");
    submit(root, "[data-testid='operator-access-form']");
    await flushUpdates();

    click(root, "[data-action='toggle-pause']");
    await flushUpdates();
    click(root, "[data-action='toggle-pause']");
    await flushUpdates();

    expect(root.textContent).toContain("Pair reactivated.");

    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    const pauseCall = fetchImpl.mock.calls[7];

    expect(String(pauseCall?.[0])).toContain("/pause");
    expect(parseRequestBodyAt(fetchImpl, 7)).toEqual({
      reason: "manual review",
      state: "paused"
    });
    expect(parseRequestBodyAt(fetchImpl, 10)).toEqual({
      state: "active"
    });
    expect(root.textContent).toContain("Refreshed pair pair-phase1-demo.");
    expect(root.textContent).toContain("execution-1");
    expect(root.textContent).toContain("settlement-1");
    expect(root.textContent).toContain("subscriber-1");
  });

  it("updates the operator session, surfaces authorization errors, and clears the current pair when blank", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message: "Actor operator-outsider is missing view_pair permission for this pair.",
            path: "/pairs/pair-phase1-demo/views/operator"
          },
          403
        )
      )
      .mockResolvedValueOnce(jsonResponse(auditTrail));

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    const toggleWithoutView = root.querySelector<HTMLButtonElement>("[data-action='refresh-pair']");
    toggleWithoutView?.setAttribute("data-action", "toggle-pause");
    toggleWithoutView?.click();
    await flushUpdates();
    toggleWithoutView?.setAttribute("data-action", "refresh-pair");

    setValue(root, "#operator-actor-id", "operator-outsider");
    submit(root, "[data-testid='operator-session-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "Actor operator-outsider is missing view_pair permission for this pair."
    );
    expect(storage.getItem("canton-dark.demo.session.operator")).toContain("operator-outsider");

    setValue(root, "#operator-pair-id", "");
    submit(root, "[data-testid='operator-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No pair is currently loaded.");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("renders subscriber pair loading, RFQ submission, and refresh from an empty starting state", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(jsonResponse(subscriberOpenRfqView))
      .mockResolvedValueOnce(jsonResponse({ rfqId: "rfq-1" }))
      .mockResolvedValueOnce(jsonResponse(subscriberAfterOpenView))
      .mockResolvedValueOnce(jsonResponse(subscriberAfterOpenView));

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("No pair is currently visible for this subscriber.");
    expect(
      root.querySelector<HTMLButtonElement>("[data-testid='subscriber-rfq-form'] button")?.disabled
    ).toBe(true);

    setValue(root, "#subscriber-pair-id", "");
    submit(root, "[data-testid='subscriber-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No pair is currently visible for this subscriber.");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    setValue(root, "#subscriber-pair-id", "pair-phase1-demo");
    submit(root, "[data-testid='subscriber-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "No actionable quote is currently open for this subscriber."
    );
    expect(
      root.querySelector<HTMLButtonElement>("[data-testid='subscriber-rfq-form'] button")?.disabled
    ).toBe(false);

    setValue(root, "#subscriber-instrument-id", "CUSIP-2");
    setValue(root, "#subscriber-side", "sell");
    setValue(root, "#subscriber-quantity", "75");
    submit(root, "[data-testid='subscriber-rfq-form']");
    await flushUpdates();

    const openRfqCall = fetchImpl.mock.calls[2];

    expect(String(openRfqCall?.[0])).toContain("/rfqs");
    expect(parseRequestBodyAt(fetchImpl, 2)).toEqual({
      instrumentId: "CUSIP-2",
      quantity: 75,
      side: "sell"
    });
    expect(root.querySelector<HTMLSelectElement>("#subscriber-side")?.value).toBe("sell");
    expect(root.textContent).toContain("Opened RFQ for CUSIP-2.");

    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    expect(root.textContent).toContain("Refreshed pair pair-phase1-demo.");
    expect(root.textContent).toContain("rfq-1");
  });

  it("renders paused subscriber visibility and surfaces session authorization errors", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(subscriberPausedView))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message: "Actor subscriber-outsider is missing view_pair permission for this pair."
          },
          403
        )
      );

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase1-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(
      root.querySelector<HTMLButtonElement>("[data-testid='subscriber-rfq-form'] button")?.disabled
    ).toBe(true);
    expect(root.textContent).toContain(
      "No actionable quote is currently open for this subscriber."
    );
    expect(root.textContent).toContain("paused");

    setValue(root, "#subscriber-actor-id", "subscriber-outsider");
    submit(root, "[data-testid='subscriber-session-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "Actor subscriber-outsider is missing view_pair permission for this pair."
    );
    expect(storage.getItem("canton-dark.demo.session.subscriber")).toContain("subscriber-outsider");
  });

  it("renders subscriber quote review and accepts a quote", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(subscriberView))
      .mockResolvedValueOnce(jsonResponse({ accepted: true }))
      .mockResolvedValueOnce(jsonResponse(subscriberAcceptedView));

    await mountSubscriberTerminal({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase1-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("Quote quote-1 is open");

    const acceptButton = root.querySelector<HTMLButtonElement>("[data-action='accept-quote']");

    acceptButton?.removeAttribute("data-id");
    acceptButton?.click();
    await flushUpdates();

    expect(fetchImpl).toHaveBeenCalledTimes(2);

    acceptButton?.setAttribute("data-id", "quote-1");
    click(root, "[data-action='accept-quote']");
    await flushUpdates();

    expect(root.textContent).toContain("Accepted quote quote-1.");
    expect(root.textContent).toContain("settlement-1");
  });

  it("renders dealer quoting flow and submits a quote", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(dealerView))
      .mockResolvedValueOnce(jsonResponse({ quote: true }))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(dealerQuotedView));

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase1-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("RFQ rfq-1 is selected");

    submit(root, "[data-testid='dealer-quote-form']");
    await flushUpdates();

    const submitCall = fetchImpl.mock.calls[3];

    expect(String(submitCall?.[0])).toContain("/rfqs/rfq-1/quotes");
    expect(parseRequestBodyAt(fetchImpl, 3)).toMatchObject({
      price: 100.5,
      quantity: 50
    });
    expect(root.textContent).toContain("Submitted quote for RFQ rfq-1.");
  });

  it("renders dealer empty state, handles quote-without-selection errors, and refreshes history after selection", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(dealerView))
      .mockResolvedValueOnce(
        jsonResponse({
          ...demoStatus,
          currentTime: "2026-04-02T00:05:00.000Z"
        })
      )
      .mockResolvedValueOnce(jsonResponse(dealerHistoryView));

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("No pair is currently visible for this dealer.");
    expect(
      root.querySelector<HTMLButtonElement>("[data-testid='dealer-quote-form'] button")?.disabled
    ).toBe(true);

    setValue(root, "#dealer-pair-id", "");
    submit(root, "[data-testid='dealer-pair-form']");
    await flushUpdates();

    expect(root.textContent).toContain("No pair is currently visible for this dealer.");
    expect(fetchImpl).toHaveBeenCalledTimes(1);

    submit(root, "[data-testid='dealer-quote-form']");
    await flushUpdates();

    expect(root.textContent).toContain("Select an open RFQ before submitting a quote.");

    setValue(root, "#dealer-pair-id", "pair-phase1-demo");
    submit(root, "[data-testid='dealer-pair-form']");
    await flushUpdates();

    const selectButton = root.querySelector<HTMLButtonElement>("[data-action='select-rfq']");

    selectButton?.removeAttribute("data-id");
    selectButton?.click();
    expect(root.textContent).not.toContain("Selected RFQ");

    selectButton?.setAttribute("data-id", "rfq-missing");
    selectButton?.click();
    expect(root.textContent).toContain("Selected RFQ rfq-missing for quoting.");

    selectButton?.setAttribute("data-id", "rfq-1");
    selectButton?.click();
    expect(root.textContent).toContain("Selected RFQ rfq-1 for quoting.");
    expect(root.querySelector<HTMLInputElement>("#dealer-quantity")?.value).toBe("50");

    click(root, "[data-action='refresh-pair']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "No open RFQ is currently awaiting a quote from this dealer."
    );
    expect(root.textContent).toContain("execution-1");
    expect(root.textContent).toContain("2026-04-02T00:05:00.000Z");
  });

  it("updates the dealer session and surfaces authorization errors", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(dealerView))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(
        jsonResponse(
          {
            code: "MISSING_ENTITLEMENT",
            message: "Actor dealer-outsider is missing view_pair permission for this pair."
          },
          403
        )
      );

    await mountDealerWorkbench({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase1-demo"),
      root,
      storage: asStorage(storage)
    });

    setValue(root, "#dealer-actor-id", "dealer-outsider");
    submit(root, "[data-testid='dealer-session-form']");
    await flushUpdates();

    expect(root.textContent).toContain(
      "Actor dealer-outsider is missing view_pair permission for this pair."
    );
    expect(storage.getItem("canton-dark.demo.session.dealer")).toContain("dealer-outsider");
  });

  it("renders demo orchestration controls for every seed state and clock advance", async () => {
    const root = document.createElement("div");
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "phase1-complete" }))
      .mockResolvedValueOnce(
        jsonResponse({
          ...demoStatus,
          currentTime: "2026-04-02T00:05:00.000Z",
          mode: "phase1-complete"
        })
      );

    await mountDemoOrchestrator({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      root
    });

    expect(root.innerHTML).toContain("Open operator console");

    click(root, "[data-action='seed-empty']");
    await flushUpdates();
    expect(root.textContent).toContain("Seeded empty stack.");

    const advanceButton = root.querySelector<HTMLButtonElement>("[data-action='advance-clock']");
    advanceButton?.setAttribute("data-action", "noop");
    advanceButton?.click();
    await flushUpdates();
    advanceButton?.setAttribute("data-action", "advance-clock");

    click(root, "[data-action='seed-ready']");
    await flushUpdates();
    expect(root.textContent).toContain("Seeded ready pair.");

    click(root, "[data-action='seed-complete']");
    await flushUpdates();
    click(root, "[data-action='advance-clock']");
    await flushUpdates();

    expect(root.textContent).toContain("Advanced API clock by five minutes.");
    expect(root.textContent).toContain("phase1-complete");
    expect(root.textContent).toContain("2026-04-02T00:05:00.000Z");
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
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
      .mockResolvedValueOnce(jsonResponse({ ...demoStatus, mode: "empty" }))
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

  it("auto-loads the operator view when the demo stack is already seeded", async () => {
    const root = document.createElement("div");
    const storage = createStorage();
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(demoStatus))
      .mockResolvedValueOnce(jsonResponse(rejectedOperatorView))
      .mockResolvedValueOnce(jsonResponse(auditTrail));

    await mountOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl: asFetch(fetchImpl),
      location: new URL("http://localhost/?pairId=pair-phase1-demo"),
      root,
      storage: asStorage(storage)
    });

    expect(root.textContent).toContain("Loaded pair pair-phase1-demo.");
    expect(root.textContent).toContain("Rejected pair.");
  });
});
