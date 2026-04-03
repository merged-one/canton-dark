import type { DealerWorkbenchView } from "@canton-dark/query-models";
import {
  escapeHtml,
  renderAppShell,
  renderCard,
  renderKeyValueGrid,
  renderMetricGrid,
  renderNotice,
  renderPill,
  renderTable,
  renderWideCard
} from "@canton-dark/ui-kit";

import { createVenueApiClient } from "./api-client";
import { resolvePairId, resolveSession, saveSession } from "./auth";
import {
  dealerMetrics,
  latestOpenDealerRfq,
  renderActionButton,
  renderCode,
  renderStatus
} from "./render-helpers";
import { readValue, resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type NoticeTone = "accent" | "alert" | "ok" | "warn";

type DealerState = {
  demoPairId: string;
  loading: boolean;
  message:
    | {
        text: string;
        tone: NoticeTone;
      }
    | undefined;
  pairId: string;
  price: string;
  quantity: string;
  selectedRfqId: string | undefined;
  serverNow: string;
  session: ReturnType<typeof resolveSession>;
  ttlMinutes: string;
  view: DealerWorkbenchView | undefined;
};

const renderInboundRfqTable = (view: DealerWorkbenchView): string =>
  renderTable({
    caption: "Inbound RFQs",
    columns: [
      { key: "rfqId", label: "RFQ" },
      { key: "instrumentId", label: "Instrument" },
      { key: "subscriberId", label: "Subscriber" },
      { key: "side", label: "Side" },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "status", label: "Status" },
      { key: "action", label: "Action" }
    ],
    emptyMessage: "No inbound RFQs yet.",
    rows: view.rfqs.map((rfq) => ({
      id: rfq.rfqId,
      cells: {
        rfqId: renderCode(rfq.rfqId),
        instrumentId: escapeHtml(rfq.instrumentId),
        subscriberId: renderCode(rfq.subscriberId),
        side: escapeHtml(rfq.side.toUpperCase()),
        quantity: escapeHtml(String(rfq.quantity)),
        status: renderStatus(rfq.status),
        action:
          rfq.status === "open"
            ? renderActionButton({
                action: "select-rfq",
                id: rfq.rfqId,
                label: "Quote RFQ"
              })
            : escapeHtml("Quoted")
      }
    }))
  });

const renderQuoteTable = (view: DealerWorkbenchView): string =>
  renderTable({
    caption: "Dealer quotes",
    columns: [
      { key: "quoteId", label: "Quote" },
      { key: "rfqId", label: "RFQ" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "status", label: "Status" }
    ],
    emptyMessage: "No quotes submitted yet.",
    rows: view.quotes.map((quote) => ({
      id: quote.quoteId,
      cells: {
        quoteId: renderCode(quote.quoteId),
        rfqId: renderCode(quote.rfqId),
        price: escapeHtml(quote.price.toFixed(2)),
        quantity: escapeHtml(String(quote.quantity)),
        status: renderStatus(quote.status)
      }
    }))
  });

const renderExecutionTable = (view: DealerWorkbenchView): string =>
  renderTable({
    caption: "Execution visibility",
    columns: [
      { key: "executionId", label: "Execution" },
      { key: "quoteId", label: "Quote" },
      { key: "subscriberId", label: "Subscriber" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true }
    ],
    emptyMessage: "No executions yet.",
    rows: view.executions.map((execution) => ({
      id: execution.executionId,
      cells: {
        executionId: renderCode(execution.executionId),
        quoteId: renderCode(execution.quoteId),
        subscriberId: renderCode(execution.subscriberId),
        price: escapeHtml(execution.price.toFixed(2)),
        quantity: escapeHtml(String(execution.quantity))
      }
    }))
  });

const renderDealerContent = (state: DealerState): string => {
  const selectedRfq =
    state.view?.rfqs.find((rfq) => rfq.rfqId === state.selectedRfqId) ??
    latestOpenDealerRfq(
      state.view ?? {
        dealerId: state.session.actorId,
        executions: [],
        pair: {
          approvalStatus: "approved",
          attestationStatus: "attested",
          dealerId: state.session.actorId,
          mode: "SingleDealerPair",
          operatorId: "",
          pairId: state.pairId,
          paused: false,
          rulebookVersion: ""
        },
        quotes: [],
        rfqs: []
      }
    );

  const sessionCard = renderCard({
    title: "Role bootstrap",
    subtitle: "Local identity used for dealer-scoped workbench access.",
    body: `
      <form data-testid="dealer-session-form">
        <div class="field">
          <label for="dealer-actor-id">Actor ID</label>
          <input id="dealer-actor-id" value="${escapeHtml(state.session.actorId)}" />
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Save session</button>
        </div>
      </form>
    `,
    testId: "dealer-session-card"
  });

  const pairCard = renderCard({
    title: "Pair access",
    subtitle: "Load the pair whose RFQs are routed to this dealer.",
    body: `
      <form data-testid="dealer-pair-form">
        <div class="field">
          <label for="dealer-pair-id">Pair ID</label>
          <input id="dealer-pair-id" value="${escapeHtml(state.pairId)}" />
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Load pair</button>
          <button class="button" type="button" data-action="refresh-pair">Refresh</button>
        </div>
      </form>
    `,
    testId: "dealer-pair-card"
  });

  const quoteCard = renderCard({
    title: "Submit quote",
    subtitle:
      "Quotes are priced off the API clock so Playwright and local demo flows stay deterministic.",
    body: `
      <form data-testid="dealer-quote-form">
        <div class="form-grid">
          <div class="field">
            <label for="dealer-selected-rfq">RFQ</label>
            <input id="dealer-selected-rfq" value="${escapeHtml(selectedRfq?.rfqId ?? "")}" readonly />
          </div>
          <div class="field">
            <label for="dealer-price">Price</label>
            <input id="dealer-price" inputmode="decimal" value="${escapeHtml(state.price)}" />
          </div>
          <div class="field">
            <label for="dealer-quantity">Quantity</label>
            <input id="dealer-quantity" inputmode="numeric" value="${escapeHtml(state.quantity)}" />
          </div>
          <div class="field">
            <label for="dealer-ttl">Term minutes</label>
            <input id="dealer-ttl" inputmode="numeric" value="${escapeHtml(state.ttlMinutes)}" />
          </div>
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit"${selectedRfq === undefined ? " disabled" : ""}>Submit quote</button>
        </div>
      </form>
    `,
    testId: "dealer-quote-card"
  });

  const message =
    state.message === undefined
      ? ""
      : renderNotice(state.message.text, state.message.tone, "dealer-notice");

  const detail =
    state.view === undefined
      ? renderWideCard({
          title: "Dealer quote screen",
          subtitle: "Load a pair to inspect inbound RFQs and quote from the dealer workbench.",
          body: `<p class="empty" data-testid="dealer-empty-state">No pair is currently visible for this dealer.</p>`,
          testId: "dealer-quote-screen"
        })
      : renderWideCard({
          title: "Dealer quote screen",
          subtitle:
            "Dealer scope shows only routed RFQs, the dealer’s quotes, and resulting executions.",
          body: `
            ${renderKeyValueGrid([
              { key: "Pair", value: state.view.pair.pairId },
              { key: "Operator", value: state.view.pair.operatorId },
              { key: "Dealer", value: state.view.dealerId },
              { key: "API clock", value: state.serverNow }
            ])}
            ${renderMetricGrid(dealerMetrics(state.view))}
            ${
              selectedRfq === undefined
                ? renderNotice(
                    "No open RFQ is currently awaiting a quote from this dealer.",
                    "muted",
                    "dealer-rfq-summary"
                  )
                : renderNotice(
                    `RFQ ${selectedRfq.rfqId} is selected for ${selectedRfq.quantity} units of ${selectedRfq.instrumentId}.`,
                    "accent",
                    "dealer-rfq-summary"
                  )
            }
            <div style="margin-top: 16px;">${renderInboundRfqTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderQuoteTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderExecutionTable(state.view)}</div>
          `,
          testId: "dealer-quote-screen"
        });

  return renderAppShell({
    title: "Dealer Workbench",
    strapline:
      "Inspect routed RFQs, price against the deterministic demo clock, and watch executions appear in scope.",
    sessionBadges: [
      renderPill("dealer", "accent", "dealer-role-badge"),
      renderPill(state.session.actorId, "muted", "dealer-actor-badge"),
      renderPill(state.loading ? "Loading" : "Ready", state.loading ? "warn" : "ok")
    ],
    content: `
      ${message}
      <div class="card-grid">
        ${sessionCard}
        ${pairCard}
        ${quoteCard}
      </div>
      ${detail}
    `
  });
};

export const mountDealerWorkbench = async ({
  apiBaseUrl,
  fetchImpl,
  location,
  root,
  storage
}: AppBootOptions): Promise<void> => {
  const client = createVenueApiClient({
    apiBaseUrl: resolveApiBaseUrl(apiBaseUrl),
    ...(fetchImpl !== undefined ? { fetchImpl } : {})
  });
  const demoStatus = await client.getDemoStatus();
  const state: DealerState = {
    demoPairId: demoStatus.pairId,
    loading: false,
    message: undefined,
    pairId: resolvePairId(demoStatus.pairId, location),
    price: "100.50",
    quantity: "50",
    selectedRfqId: undefined,
    serverNow: demoStatus.currentTime,
    session: resolveSession("dealer", storage, location),
    ttlMinutes: "20",
    view: undefined
  };

  const refreshPair = async (): Promise<void> => {
    if (state.pairId.trim() === "") {
      state.view = undefined;
      state.selectedRfqId = undefined;
      return;
    }

    const [status, view] = await Promise.all([
      client.getDemoStatus(),
      client.getDealerWorkbenchView({
        actorId: state.session.actorId,
        dealerId: state.session.actorId,
        pairId: state.pairId
      })
    ]);

    state.serverNow = status.currentTime;
    state.view = view;

    const nextRfq = latestOpenDealerRfq(view);

    state.selectedRfqId = nextRfq?.rfqId;

    if (nextRfq !== undefined) {
      state.quantity = String(nextRfq.quantity);
    }
  };

  const setMessage = (text: string, tone: NoticeTone): void => {
    state.message = {
      text,
      tone
    };
  };

  const render = (): void => {
    root.innerHTML = renderDealerContent(state);

    root
      .querySelector<HTMLFormElement>("[data-testid='dealer-session-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.session = saveSession(
          {
            actorId: readValue(root, "#dealer-actor-id"),
            role: "dealer"
          },
          storage
        );
        void runWithFeedback(refreshPair, "Dealer session updated.", "accent");
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='dealer-pair-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.pairId = readValue(root, "#dealer-pair-id");
        void runWithFeedback(refreshPair, `Loaded pair ${state.pairId}.`, "accent");
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='dealer-quote-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.price = readValue(root, "#dealer-price");
        state.quantity = readValue(root, "#dealer-quantity");
        state.ttlMinutes = readValue(root, "#dealer-ttl");
        void runWithFeedback(
          async () => {
            if (state.selectedRfqId === undefined) {
              throw new Error("Select an open RFQ before submitting a quote.");
            }

            const expiresAt = new Date(
              new Date(state.serverNow).getTime() + Number(state.ttlMinutes) * 60_000
            ).toISOString();

            await client.submitQuote({
              actorId: state.session.actorId,
              expiresAt,
              pairId: state.pairId,
              price: Number(state.price),
              quantity: Number(state.quantity),
              rfqId: state.selectedRfqId
            });
            await refreshPair();
          },
          `Submitted quote for RFQ ${state.selectedRfqId ?? ""}.`,
          "ok"
        );
      });

    root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "refresh-pair") {
          state.pairId = readValue(root, "#dealer-pair-id");
          void runWithFeedback(refreshPair, `Refreshed pair ${state.pairId}.`, "accent");
          return;
        }

        if (action === "select-rfq" && id !== undefined) {
          state.selectedRfqId = id;
          const rfq = state.view?.rfqs.find((candidate) => candidate.rfqId === id);

          if (rfq !== undefined) {
            state.quantity = String(rfq.quantity);
          }

          setMessage(`Selected RFQ ${id} for quoting.`, "accent");
          render();
        }
      });
    });
  };

  const runWithFeedback = async (
    action: () => Promise<void>,
    successMessage: string,
    successTone: NoticeTone
  ): Promise<void> => {
    state.loading = true;
    render();

    try {
      await action();
      setMessage(successMessage, successTone);
    } catch (error) {
      setMessage(toErrorMessage(error), "alert");
    } finally {
      state.loading = false;
      render();
    }
  };

  if (state.pairId !== state.demoPairId || demoStatus.mode !== "empty") {
    await runWithFeedback(refreshPair, `Loaded pair ${state.pairId}.`, "accent");
    return;
  }

  render();
};
