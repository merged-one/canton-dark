import type { QuoteComparisonView, SubscriberView } from "@canton-dark/query-models";
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
  comparisonMetrics,
  formatCountdown,
  latestSubscriberRfq,
  renderActionButton,
  renderCode,
  renderStatus,
  subscriberMetrics
} from "./render-helpers";
import { readValue, resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type NoticeTone = "accent" | "alert" | "ok" | "warn";

type SubscriberState = {
  comparison: QuoteComparisonView | undefined;
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
  responseWindowMinutes: string;
  selectedDealerIds: string[];
  selectedRfqId: string | undefined;
  serverNow: string;
  session: ReturnType<typeof resolveSession>;
  side: "buy" | "sell";
  view: SubscriberView | undefined;
};

const readCheckedValues = (root: ParentNode, selector: string): string[] =>
  [...root.querySelectorAll<HTMLInputElement>(selector)]
    .filter((field) => field.checked)
    .map((field) => field.value);

const renderDealerChecklist = (state: SubscriberState): string => {
  if (state.view?.pair.mode !== "ATSPair") {
    return `
      <div class="field">
        <label>Routed dealer</label>
        <div class="kv-grid">
          <article class="kv-item">
            <span class="kv-key">Dealer</span>
            <span class="kv-value">${renderCode(state.view?.pair.dealerId ?? "")}</span>
          </article>
        </div>
      </div>
    `;
  }

  return `
    <fieldset class="field">
      <legend>Invited dealers</legend>
      <div class="choice-grid">
        ${state.view.availableDealerIds
          .map(
            (dealerId) => `
              <label class="choice-item" for="subscriber-dealer-${escapeHtml(dealerId)}">
                <input
                  id="subscriber-dealer-${escapeHtml(dealerId)}"
                  type="checkbox"
                  name="invitedDealerIds"
                  value="${escapeHtml(dealerId)}"
                  ${state.selectedDealerIds.includes(dealerId) ? "checked" : ""}
                />
                <span>${escapeHtml(dealerId)}</span>
              </label>
            `
          )
          .join("")}
      </div>
    </fieldset>
  `;
};

const renderRfqTable = (view: SubscriberView, selectedRfqId: string | undefined): string =>
  renderTable({
    caption: "Subscriber RFQs",
    columns: [
      { key: "rfqId", label: "RFQ" },
      { key: "instrumentId", label: "Instrument" },
      { key: "side", label: "Side" },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "status", label: "Status" },
      { key: "action", label: "Action" }
    ],
    emptyMessage: "No RFQs yet.",
    rows: view.rfqs.map((rfq) => ({
      id: rfq.rfqId,
      cells: {
        rfqId: renderCode(rfq.rfqId),
        instrumentId: escapeHtml(rfq.instrumentId),
        side: escapeHtml(rfq.side.toUpperCase()),
        quantity: escapeHtml(String(rfq.quantity)),
        status: renderStatus(rfq.status),
        action:
          selectedRfqId === rfq.rfqId
            ? renderPill("Selected", "accent")
            : renderActionButton({
                action: "select-rfq",
                id: rfq.rfqId,
                label: "Compare quotes"
              })
      }
    }))
  });

const renderInvitationTable = (comparison: QuoteComparisonView): string =>
  renderTable({
    caption: "Directed invitations",
    columns: [
      { key: "dealerId", label: "Dealer" },
      { key: "status", label: "Status" },
      { key: "invitedAt", label: "Invited" },
      { key: "respondedAt", label: "Responded" },
      { key: "window", label: "Response window" }
    ],
    emptyMessage: "No directed invitations are visible for the selected RFQ.",
    rows: comparison.invitations.map((invitation) => ({
      id: invitation.invitationId,
      cells: {
        dealerId: renderCode(invitation.dealerId),
        status: renderStatus(invitation.status),
        invitedAt: renderCode(invitation.invitedAt),
        respondedAt:
          invitation.respondedAt === undefined
            ? escapeHtml("Awaiting response")
            : renderCode(invitation.respondedAt),
        window: renderCode(invitation.responseWindowClosesAt)
      }
    }))
  });

const renderQuoteTable = (comparison: QuoteComparisonView): string =>
  renderTable({
    caption: "Quote comparison",
    columns: [
      { key: "quoteId", label: "Quote" },
      { key: "dealerId", label: "Dealer" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "rank", label: "Rank", numeric: true },
      { key: "status", label: "Status" },
      { key: "action", label: "Action" }
    ],
    emptyMessage: "No dealer quotes are visible for the selected RFQ.",
    rows: comparison.quotes.map((quote) => ({
      id: quote.quoteId,
      cells: {
        quoteId: renderCode(quote.quoteId),
        dealerId: renderCode(quote.dealerId),
        price: escapeHtml(quote.price.toFixed(2)),
        quantity: escapeHtml(String(quote.quantity)),
        rank: quote.rank === undefined ? escapeHtml("n/a") : escapeHtml(String(quote.rank)),
        status: renderStatus(quote.status),
        action:
          quote.status === "open"
            ? renderActionButton({
                action: "accept-quote",
                id: quote.quoteId,
                label: "Accept quote",
                tone: "button-primary"
              })
            : escapeHtml("Closed")
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
        quoteId: renderCode(execution.quoteId ?? "n/a"),
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
    subtitle: "Load the subscriber-scoped pair and refresh quote comparison state.",
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
    title: state.view?.pair.mode === "ATSPair" ? "Open directed RFQ" : "Open RFQ",
    subtitle:
      "Subscriber intent is submitted as typed commands. Quote comparison, countdown, and invite visibility stay on the scoped read side.",
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
          <div class="field">
            <label for="subscriber-response-window">Response window (minutes)</label>
            <input id="subscriber-response-window" inputmode="numeric" value="${escapeHtml(state.responseWindowMinutes)}" />
          </div>
        </div>
        <div style="margin-top: 12px;">
          ${renderDealerChecklist(state)}
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit"${state.view?.canOpenRfq === false || state.view === undefined ? " disabled" : ""}>
            ${state.view?.pair.mode === "ATSPair" ? "Open directed RFQ" : "Open RFQ"}
          </button>
        </div>
      </form>
    `,
    testId: "subscriber-rfq-card"
  });

  const message =
    state.message === undefined
      ? ""
      : renderNotice(state.message.text, state.message.tone, "subscriber-notice");

  const comparison = state.comparison;
  const hasOpenQuotes = comparison?.quotes.some((quote) => quote.status === "open") === true;
  const countdown = formatCountdown(state.serverNow, comparison?.responseWindowClosesAt);
  const compareBody =
    state.view === undefined
      ? `<p class="empty" data-testid="subscriber-empty-state">No pair is currently visible for this subscriber.</p>`
      : `
          ${renderKeyValueGrid([
            { key: "Pair", value: state.view.pair.pairId },
            { key: "Mode", value: state.view.pair.mode },
            { key: "Subscriber", value: state.view.subscriberId },
            { key: "API clock", value: state.serverNow }
          ])}
          ${renderMetricGrid(subscriberMetrics(state.view))}
          <div style="margin-top: 16px;">${renderRfqTable(state.view, state.selectedRfqId)}</div>
          ${
            comparison === undefined
              ? renderNotice(
                  "Select an RFQ to inspect invited dealers, response timing, and returned quotes.",
                  "muted",
                  "subscriber-compare-summary"
                )
              : `
                  <section data-testid="subscriber-quote-summary">
                    ${renderNotice(countdown, countdown.includes("past") ? "warn" : "accent")}
                    ${renderMetricGrid(comparisonMetrics(comparison))}
                    <div class="kv-grid" style="margin-top: 14px;">
                      <article class="kv-item">
                        <span class="kv-key">Tie-break</span>
                        <span class="kv-value">${escapeHtml(comparison.tieBreakRule)}</span>
                      </article>
                      <article class="kv-item">
                        <span class="kv-key">Selected RFQ</span>
                        <span class="kv-value">${renderCode(comparison.rfqId)}</span>
                      </article>
                    </div>
                    ${
                      hasOpenQuotes
                        ? `<div class="actions">${renderActionButton({
                            action: "reject-all",
                            id: comparison.rfqId,
                            label: "Reject all quotes",
                            tone: "button-danger"
                          })}</div>`
                        : ""
                    }
                  </section>
                  <div style="margin-top: 16px;">${renderInvitationTable(comparison)}</div>
                  <div style="margin-top: 16px;">${renderQuoteTable(comparison)}</div>
                `
          }
          <div style="margin-top: 16px;">${renderExecutionTable(state.view)}</div>
          <div style="margin-top: 16px;">${renderSettlementTable(state.view)}</div>
        `;

  const detail = renderWideCard({
    title: "Subscriber compare-quotes screen",
    subtitle:
      "The subscriber can view the directed invite set, monitor the response window, compare returned quotes, and decide whether to accept one or reject all.",
    body: compareBody,
    testId: "subscriber-compare-screen"
  });

  return renderAppShell({
    title: "Subscriber Terminal",
    strapline:
      "Open directed RFQs, monitor the response countdown, compare dealer responses, and accept one quote or reject the set.",
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
    comparison: undefined,
    demoPairId: demoStatus.pairId,
    instrumentId: "CUSIP-ATS-1",
    loading: false,
    message: undefined,
    pairId: resolvePairId(demoStatus.pairId, location),
    quantity: "50",
    responseWindowMinutes: "10",
    selectedDealerIds: [...demoStatus.dealerIds],
    selectedRfqId: undefined,
    serverNow: demoStatus.currentTime,
    session: resolveSession("subscriber", storage, location),
    side: "buy",
    view: undefined
  };

  const ensureSelectedDealers = (available: readonly string[]): void => {
    const next = state.selectedDealerIds.filter((dealerId) => available.includes(dealerId));

    state.selectedDealerIds = next.length > 0 ? next : [...available];
  };

  const syncSelectedRfq = (view: SubscriberView): void => {
    if (state.selectedRfqId !== undefined) {
      const stillVisible = view.rfqs.some((rfq) => rfq.rfqId === state.selectedRfqId);

      if (stillVisible) {
        return;
      }
    }

    state.selectedRfqId = latestSubscriberRfq(view)?.rfqId;
  };

  const refreshComparison = async (): Promise<void> => {
    if (state.view === undefined || state.selectedRfqId === undefined) {
      state.comparison = undefined;
      return;
    }

    const [status, comparison] = await Promise.all([
      client.getDemoStatus(),
      client.getSubscriberQuoteLadder({
        actorId: state.session.actorId,
        pairId: state.pairId,
        rfqId: state.selectedRfqId
      })
    ]);

    state.serverNow = status.currentTime;
    state.comparison = comparison;
  };

  const refreshPair = async (): Promise<void> => {
    if (state.pairId.trim() === "") {
      state.view = undefined;
      state.comparison = undefined;
      state.selectedRfqId = undefined;
      return;
    }

    const [status, view] = await Promise.all([
      client.getDemoStatus(),
      client.getSubscriberView({
        actorId: state.session.actorId,
        pairId: state.pairId,
        subscriberId: state.session.actorId
      })
    ]);

    state.serverNow = status.currentTime;
    state.view = view;
    ensureSelectedDealers(view.availableDealerIds);
    syncSelectedRfq(view);
    await refreshComparison();
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
        state.responseWindowMinutes = readValue(root, "#subscriber-response-window");
        state.selectedDealerIds = readCheckedValues(root, "input[name='invitedDealerIds']");

        void runWithFeedback(
          async () => {
            if (state.view?.pair.mode === "ATSPair" && state.selectedDealerIds.length === 0) {
              throw new Error("Select at least one dealer for an ATSPair RFQ.");
            }

            const status = await client.getDemoStatus();
            state.serverNow = status.currentTime;

            await client.openRfq({
              actorId: state.session.actorId,
              instrumentId: state.instrumentId,
              pairId: state.pairId,
              quantity: Number(state.quantity),
              responseWindowClosesAt: new Date(
                new Date(state.serverNow).getTime() + Number(state.responseWindowMinutes) * 60_000
              ).toISOString(),
              side: state.side
            });
            await refreshPair();

            const rfqId =
              state.view === undefined ? undefined : latestSubscriberRfq(state.view)?.rfqId;

            if (state.view?.pair.mode === "ATSPair" && rfqId !== undefined) {
              await client.inviteDealers({
                actorId: state.session.actorId,
                dealerIds: state.selectedDealerIds,
                pairId: state.pairId,
                rfqId
              });
              state.selectedRfqId = rfqId;
            }

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

        if (action === "select-rfq") {
          const rfqId = String(id);
          state.selectedRfqId = rfqId;
          void runWithFeedback(refreshComparison, `Loaded RFQ ${rfqId}.`, "accent");
          return;
        }

        if (action === "accept-quote") {
          const quoteId = String(id);
          void runWithFeedback(
            async () => {
              await client.acceptQuote({
                actorId: state.session.actorId,
                pairId: state.pairId,
                quoteId
              });
              await refreshPair();
            },
            `Accepted quote ${quoteId}.`,
            "ok"
          );
          return;
        }

        if (action === "reject-all") {
          const rfqId = String(id);
          void runWithFeedback(
            async () => {
              await client.rejectAllQuotes({
                actorId: state.session.actorId,
                pairId: state.pairId,
                rfqId
              });
              await refreshPair();
            },
            `Rejected all quotes for RFQ ${rfqId}.`,
            "warn"
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
