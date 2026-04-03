import type { SubscriberView } from "@canton-dark/query-models";
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
  latestOpenSubscriberQuote,
  renderActionButton,
  renderCode,
  renderStatus,
  subscriberMetrics
} from "./render-helpers";
import { readValue, resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type NoticeTone = "accent" | "alert" | "ok" | "warn";

type SubscriberState = {
  demoPairId: string;
  instrumentId: string;
  loading: boolean;
  message:
    | {
        text: string;
        tone: NoticeTone;
      }
    | undefined;
  pairId: string;
  quantity: string;
  session: ReturnType<typeof resolveSession>;
  side: "buy" | "sell";
  view: SubscriberView | undefined;
};

const renderRfqTable = (view: SubscriberView): string =>
  renderTable({
    caption: "Subscriber RFQs",
    columns: [
      { key: "rfqId", label: "RFQ" },
      { key: "instrumentId", label: "Instrument" },
      { key: "side", label: "Side" },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "status", label: "Status" }
    ],
    emptyMessage: "No RFQs yet.",
    rows: view.rfqs.map((rfq) => ({
      id: rfq.rfqId,
      cells: {
        rfqId: renderCode(rfq.rfqId),
        instrumentId: escapeHtml(rfq.instrumentId),
        side: escapeHtml(rfq.side.toUpperCase()),
        quantity: escapeHtml(String(rfq.quantity)),
        status: renderStatus(rfq.status)
      }
    }))
  });

const renderQuoteTable = (view: SubscriberView): string =>
  renderTable({
    caption: "Dealer quotes",
    columns: [
      { key: "quoteId", label: "Quote" },
      { key: "rfqId", label: "RFQ" },
      { key: "dealerId", label: "Dealer" },
      { key: "price", label: "Price", numeric: true },
      { key: "status", label: "Status" },
      { key: "action", label: "Action" }
    ],
    emptyMessage: "No dealer quotes yet.",
    rows: view.quotes.map((quote) => ({
      id: quote.quoteId,
      cells: {
        quoteId: renderCode(quote.quoteId),
        rfqId: renderCode(quote.rfqId),
        dealerId: renderCode(quote.dealerId),
        price: escapeHtml(quote.price.toFixed(2)),
        status: renderStatus(quote.status),
        action:
          quote.status === "open"
            ? renderActionButton({
                action: "accept-quote",
                id: quote.quoteId,
                label: "Accept quote",
                tone: "button-primary"
              })
            : escapeHtml("Awaiting next step")
      }
    }))
  });

const renderExecutionTable = (view: SubscriberView): string =>
  renderTable({
    caption: "Execution state",
    columns: [
      { key: "executionId", label: "Execution" },
      { key: "quoteId", label: "Quote" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "acceptedAt", label: "Accepted" }
    ],
    emptyMessage: "No executions yet.",
    rows: view.executions.map((execution) => ({
      id: execution.executionId,
      cells: {
        executionId: renderCode(execution.executionId),
        quoteId: renderCode(execution.quoteId),
        price: escapeHtml(execution.price.toFixed(2)),
        quantity: escapeHtml(String(execution.quantity)),
        acceptedAt: renderCode(execution.acceptedAt)
      }
    }))
  });

const renderSettlementTable = (view: SubscriberView): string =>
  renderTable({
    caption: "Settlement visibility",
    columns: [
      { key: "instructionId", label: "Instruction" },
      { key: "executionId", label: "Execution" },
      { key: "status", label: "Status" }
    ],
    emptyMessage: "No settlement instructions yet.",
    rows: view.settlements.map((settlement) => ({
      id: settlement.instructionId,
      cells: {
        instructionId: renderCode(settlement.instructionId),
        executionId: renderCode(settlement.executionId),
        status: renderStatus(settlement.status)
      }
    }))
  });

const renderSubscriberContent = (state: SubscriberState): string => {
  const sessionCard = renderCard({
    title: "Role bootstrap",
    subtitle: "This local session identifies the subscriber actor for view and command scope.",
    body: `
      <form data-testid="subscriber-session-form">
        <div class="field">
          <label for="subscriber-actor-id">Actor ID</label>
          <input id="subscriber-actor-id" value="${escapeHtml(state.session.actorId)}" />
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Save session</button>
        </div>
      </form>
    `,
    testId: "subscriber-session-card"
  });

  const pairCard = renderCard({
    title: "Pair access",
    subtitle: "Load a pair granted to this subscriber identity.",
    body: `
      <form data-testid="subscriber-pair-form">
        <div class="field">
          <label for="subscriber-pair-id">Pair ID</label>
          <input id="subscriber-pair-id" value="${escapeHtml(state.pairId)}" />
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Load pair</button>
          <button class="button" type="button" data-action="refresh-pair">Refresh</button>
        </div>
      </form>
    `,
    testId: "subscriber-pair-card"
  });

  const rfqForm = renderCard({
    title: "Open RFQ",
    subtitle: "Subscriber order intent stays on-ledger; form state stays off-ledger.",
    body: `
      <form data-testid="subscriber-rfq-form">
        <div class="form-grid">
          <div class="field">
            <label for="subscriber-instrument-id">Instrument</label>
            <input id="subscriber-instrument-id" value="${escapeHtml(state.instrumentId)}" />
          </div>
          <div class="field">
            <label for="subscriber-side">Side</label>
            <select id="subscriber-side">
              <option value="buy"${state.side === "buy" ? " selected" : ""}>buy</option>
              <option value="sell"${state.side === "sell" ? " selected" : ""}>sell</option>
            </select>
          </div>
          <div class="field">
            <label for="subscriber-quantity">Quantity</label>
            <input id="subscriber-quantity" inputmode="numeric" value="${escapeHtml(state.quantity)}" />
          </div>
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit"${state.view?.canOpenRfq === false || state.view === undefined ? " disabled" : ""}>Open RFQ</button>
        </div>
      </form>
    `,
    testId: "subscriber-rfq-card"
  });

  const message =
    state.message === undefined
      ? ""
      : renderNotice(state.message.text, state.message.tone, "subscriber-notice");

  const actionableQuote = latestOpenSubscriberQuote(
    state.view ?? {
      canOpenRfq: false,
      entitlements: [],
      executions: [],
      pair: {
        approvalStatus: "approved",
        attestationStatus: "attested",
        dealerId: "",
        mode: "SingleDealerPair",
        operatorId: "",
        pairId: "",
        paused: false,
        rulebookVersion: ""
      },
      quotes: [],
      rfqs: [],
      settlements: [],
      subscriberId: state.session.actorId
    }
  );

  const detail =
    state.view === undefined
      ? renderWideCard({
          title: "Subscriber RFQ screen",
          subtitle: "Load a pair to open RFQs and review returned quotes.",
          body: `<p class="empty" data-testid="subscriber-empty-state">No pair is currently visible for this subscriber.</p>`,
          testId: "subscriber-rfq-screen"
        })
      : renderWideCard({
          title: "Subscriber RFQ screen",
          subtitle: "Only subscriber-scoped data is projected into this screen.",
          body: `
            ${renderKeyValueGrid([
              { key: "Pair", value: state.view.pair.pairId },
              { key: "Dealer", value: state.view.pair.dealerId },
              { key: "Entitlements", value: state.view.entitlements.join(", ") || "none" },
              { key: "Pair state", value: state.view.pair.paused ? "paused" : "active" }
            ])}
            ${renderMetricGrid(subscriberMetrics(state.view))}
            ${
              actionableQuote === undefined
                ? renderNotice(
                    "No actionable quote is currently open for this subscriber.",
                    "muted",
                    "subscriber-quote-summary"
                  )
                : `<section data-testid="subscriber-quote-summary">
                    ${renderNotice(
                      `Quote ${actionableQuote.quoteId} is open at ${actionableQuote.price.toFixed(2)} for ${actionableQuote.quantity} units.`,
                      "ok"
                    )}
                    <div class="actions">${renderActionButton({
                      action: "accept-quote",
                      id: actionableQuote.quoteId,
                      label: "Accept quote",
                      tone: "button-primary"
                    })}</div>
                  </section>`
            }
            <div style="margin-top: 16px;">${renderRfqTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderQuoteTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderExecutionTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderSettlementTable(state.view)}</div>
          `,
          testId: "subscriber-rfq-screen"
        });

  return renderAppShell({
    title: "Subscriber Terminal",
    strapline:
      "Open RFQs, review dealer responses, and confirm execution and settlement visibility.",
    sessionBadges: [
      renderPill("subscriber", "accent", "subscriber-role-badge"),
      renderPill(state.session.actorId, "muted", "subscriber-actor-badge"),
      renderPill(state.loading ? "Loading" : "Ready", state.loading ? "warn" : "ok")
    ],
    content: `
      ${message}
      <div class="card-grid">
        ${sessionCard}
        ${pairCard}
        ${rfqForm}
      </div>
      ${detail}
    `
  });
};

export const mountSubscriberTerminal = async ({
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
  const state: SubscriberState = {
    demoPairId: demoStatus.pairId,
    instrumentId: "CUSIP-1",
    loading: false,
    message: undefined,
    pairId: resolvePairId(demoStatus.pairId, location),
    quantity: "50",
    session: resolveSession("subscriber", storage, location),
    side: "buy",
    view: undefined
  };

  const refreshPair = async (): Promise<void> => {
    if (state.pairId.trim() === "") {
      state.view = undefined;
      return;
    }

    state.view = await client.getSubscriberView({
      actorId: state.session.actorId,
      pairId: state.pairId,
      subscriberId: state.session.actorId
    });
  };

  const setMessage = (text: string, tone: NoticeTone): void => {
    state.message = {
      text,
      tone
    };
  };

  const render = (): void => {
    root.innerHTML = renderSubscriberContent(state);

    root
      .querySelector<HTMLFormElement>("[data-testid='subscriber-session-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.session = saveSession(
          {
            actorId: readValue(root, "#subscriber-actor-id"),
            role: "subscriber"
          },
          storage
        );
        void runWithFeedback(refreshPair, "Subscriber session updated.", "accent");
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='subscriber-pair-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.pairId = readValue(root, "#subscriber-pair-id");
        void runWithFeedback(refreshPair, `Loaded pair ${state.pairId}.`, "accent");
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='subscriber-rfq-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.instrumentId = readValue(root, "#subscriber-instrument-id");
        state.side = readValue(root, "#subscriber-side") as SubscriberState["side"];
        state.quantity = readValue(root, "#subscriber-quantity");
        void runWithFeedback(
          async () => {
            await client.openRfq({
              actorId: state.session.actorId,
              instrumentId: state.instrumentId,
              pairId: state.pairId,
              quantity: Number(state.quantity),
              side: state.side
            });
            await refreshPair();
          },
          `Opened RFQ for ${state.instrumentId}.`,
          "ok"
        );
      });

    root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;
        const id = button.dataset.id;

        if (action === "refresh-pair") {
          state.pairId = readValue(root, "#subscriber-pair-id");
          void runWithFeedback(refreshPair, `Refreshed pair ${state.pairId}.`, "accent");
          return;
        }

        if (action === "accept-quote" && id !== undefined) {
          void runWithFeedback(
            async () => {
              await client.acceptQuote({
                actorId: state.session.actorId,
                pairId: state.pairId,
                quoteId: id
              });
              await refreshPair();
            },
            `Accepted quote ${id}.`,
            "ok"
          );
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
