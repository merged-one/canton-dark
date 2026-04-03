import type { DealerInvitationHistoryView, DealerWorkbenchView } from "@canton-dark/query-models";
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
  formatCountdown,
  latestDealerInvitation,
  latestDealerOpenQuote,
  renderActionButton,
  renderCode,
  renderStatus
} from "./render-helpers";
import { readValue, resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type NoticeTone = "accent" | "alert" | "ok" | "warn";

type DealerState = {
  demoPairId: string;
  history: DealerInvitationHistoryView | undefined;
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
  selectedInvitationId: string | undefined;
  serverNow: string;
  session: ReturnType<typeof resolveSession>;
  ttlMinutes: string;
  view: DealerWorkbenchView | undefined;
};

const renderInvitationTable = (
  history: DealerInvitationHistoryView,
  selectedInvitationId: string | undefined
): string =>
  renderTable({
    caption: "Invitation inbox",
    columns: [
      { key: "invitationId", label: "Invitation" },
      { key: "rfqId", label: "RFQ" },
      { key: "status", label: "Status" },
      { key: "window", label: "Response window" },
      { key: "action", label: "Action" }
    ],
    emptyMessage: "No invitations are visible for this dealer.",
    rows: history.invitations.map((invitation) => ({
      id: invitation.invitationId,
      cells: {
        invitationId: renderCode(invitation.invitationId),
        rfqId: renderCode(invitation.rfqId),
        status: renderStatus(invitation.status),
        window: renderCode(invitation.responseWindowClosesAt),
        action:
          selectedInvitationId === invitation.invitationId
            ? renderPill("Selected", "accent")
            : renderActionButton({
                action: "select-invitation",
                id: invitation.invitationId,
                label: "Open detail"
              })
      }
    }))
  });

const renderQuoteTable = (
  history: DealerInvitationHistoryView,
  rfqId: string | undefined
): string =>
  renderTable({
    caption: "Quote revisions and dispositions",
    columns: [
      { key: "quoteId", label: "Quote" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "status", label: "Status" },
      { key: "expiresAt", label: "Expires" }
    ],
    emptyMessage: "No quotes are visible for the selected invitation.",
    rows: history.quotes
      .filter((quote) => rfqId === undefined || quote.rfqId === rfqId)
      .map((quote) => ({
        id: quote.quoteId,
        cells: {
          quoteId: renderCode(quote.quoteId),
          price: escapeHtml(quote.price.toFixed(2)),
          quantity: escapeHtml(String(quote.quantity)),
          status: renderStatus(quote.status),
          expiresAt: renderCode(quote.expiresAt)
        }
      }))
  });

const renderRevisionTable = (
  history: DealerInvitationHistoryView,
  rfqId: string | undefined
): string =>
  renderTable({
    caption: "Revision lineage",
    columns: [
      { key: "revisionId", label: "Revision" },
      { key: "previousQuoteId", label: "Previous quote" },
      { key: "nextQuoteId", label: "Next quote" },
      { key: "revisedAt", label: "Revised" }
    ],
    emptyMessage: "No quote revisions are visible for the selected invitation.",
    rows: history.revisions
      .filter((revision) => rfqId === undefined || revision.rfqId === rfqId)
      .map((revision) => ({
        id: revision.revisionId,
        cells: {
          revisionId: renderCode(revision.revisionId),
          previousQuoteId: renderCode(revision.previousQuoteId),
          nextQuoteId: renderCode(revision.nextQuoteId),
          revisedAt: renderCode(revision.revisedAt)
        }
      }))
  });

const renderWithdrawalTable = (
  history: DealerInvitationHistoryView,
  rfqId: string | undefined
): string =>
  renderTable({
    caption: "Withdrawals",
    columns: [
      { key: "withdrawalId", label: "Withdrawal" },
      { key: "quoteId", label: "Quote" },
      { key: "reason", label: "Reason" },
      { key: "withdrawnAt", label: "Withdrawn" }
    ],
    emptyMessage: "No withdrawals are visible for the selected invitation.",
    rows: history.withdrawals
      .filter((withdrawal) => rfqId === undefined || withdrawal.rfqId === rfqId)
      .map((withdrawal) => ({
        id: withdrawal.withdrawalId,
        cells: {
          withdrawalId: renderCode(withdrawal.withdrawalId),
          quoteId: renderCode(withdrawal.quoteId),
          reason: escapeHtml(withdrawal.reason ?? "n/a"),
          withdrawnAt: renderCode(withdrawal.withdrawnAt)
        }
      }))
  });

const renderExecutionTable = (view: DealerWorkbenchView): string =>
  renderTable({
    caption: "Final disposition",
    columns: [
      { key: "executionId", label: "Execution" },
      { key: "quoteId", label: "Quote" },
      { key: "subscriberId", label: "Subscriber" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true }
    ],
    emptyMessage: "No executions are visible for this dealer.",
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
  const selectedInvitation =
    state.history?.invitations.find(
      (invitation) => invitation.invitationId === state.selectedInvitationId
    ) ??
    latestDealerInvitation(
      state.history ?? {
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
        dealerId: state.session.actorId,
        invitations: [],
        quotes: [],
        revisions: [],
        withdrawals: []
      }
    );
  const selectedRfqId = selectedInvitation?.rfqId;
  const currentOpenQuote = latestDealerOpenQuote(
    state.history ?? {
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
      dealerId: state.session.actorId,
      invitations: [],
      quotes: [],
      revisions: [],
      withdrawals: []
    },
    selectedRfqId
  );

  const sessionCard = renderCard({
    title: "Role bootstrap",
    subtitle: "Local identity used for dealer-scoped invitation and quote access.",
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
    subtitle: "Load the pair whose directed invitations are visible to this dealer only.",
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

  const quoteForm = renderCard({
    title: currentOpenQuote === undefined ? "Submit quote" : "Revise quote",
    subtitle:
      "This workbench only shows the dealer’s own invitations, quote lineage, and final disposition.",
    body: `
      <form data-testid="dealer-quote-form">
        <div class="form-grid">
          <div class="field">
            <label for="dealer-selected-invitation">Invitation</label>
            <input id="dealer-selected-invitation" value="${escapeHtml(selectedInvitation?.invitationId ?? "")}" readonly />
          </div>
          <div class="field">
            <label for="dealer-selected-rfq">RFQ</label>
            <input id="dealer-selected-rfq" value="${escapeHtml(selectedRfqId ?? "")}" readonly />
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
          <button class="button button-primary" type="submit"${selectedInvitation === undefined ? " disabled" : ""}>
            ${currentOpenQuote === undefined ? "Submit quote" : "Revise quote"}
          </button>
          <button class="button button-danger" type="button" data-action="withdraw-quote"${currentOpenQuote === undefined ? " disabled" : ""} data-id="${escapeHtml(currentOpenQuote?.quoteId ?? "")}">
            Withdraw current quote
          </button>
        </div>
      </form>
    `,
    testId: "dealer-quote-card"
  });

  const message =
    state.message === undefined
      ? ""
      : renderNotice(state.message.text, state.message.tone, "dealer-notice");

  const detail = renderWideCard({
    title: "Dealer invitation detail screen",
    subtitle:
      "Dealers can review only their own invitations, revisions, and final disposition without seeing other dealers’ routing or economics.",
    body:
      state.view === undefined || state.history === undefined
        ? `<p class="empty" data-testid="dealer-empty-state">No pair is currently visible for this dealer.</p>`
        : `
            ${renderKeyValueGrid([
              { key: "Pair", value: state.view.pair.pairId },
              { key: "Operator", value: state.view.pair.operatorId },
              { key: "Dealer", value: state.history.dealerId },
              { key: "API clock", value: state.serverNow }
            ])}
            ${renderMetricGrid(dealerMetrics(state.view))}
            ${
              selectedInvitation === undefined
                ? renderNotice(
                    "Select an invitation to inspect its quote revisions and final disposition.",
                    "muted",
                    "dealer-rfq-summary"
                  )
                : `
                    ${renderNotice(
                      formatCountdown(state.serverNow, selectedInvitation.responseWindowClosesAt),
                      selectedInvitation.status === "expired" ? "warn" : "accent",
                      "dealer-rfq-summary"
                    )}
                    <div class="kv-grid" style="margin-top: 14px;">
                      <article class="kv-item">
                        <span class="kv-key">Selected invitation</span>
                        <span class="kv-value">${renderCode(selectedInvitation.invitationId)}</span>
                      </article>
                      <article class="kv-item">
                        <span class="kv-key">Status</span>
                        <span class="kv-value">${renderStatus(selectedInvitation.status)}</span>
                      </article>
                      <article class="kv-item">
                        <span class="kv-key">Current quote</span>
                        <span class="kv-value">${currentOpenQuote === undefined ? escapeHtml("No open quote") : renderCode(currentOpenQuote.quoteId)}</span>
                      </article>
                    </div>
                  `
            }
            <div style="margin-top: 16px;">${renderInvitationTable(state.history, state.selectedInvitationId)}</div>
            <div style="margin-top: 16px;">${renderQuoteTable(state.history, selectedRfqId)}</div>
            <div style="margin-top: 16px;">${renderRevisionTable(state.history, selectedRfqId)}</div>
            <div style="margin-top: 16px;">${renderWithdrawalTable(state.history, selectedRfqId)}</div>
            <div style="margin-top: 16px;">${renderExecutionTable(state.view)}</div>
          `,
    testId: "dealer-invitation-detail"
  });

  return renderAppShell({
    title: "Dealer Workbench",
    strapline:
      "Inspect directed invitations, manage only your own quote revisions, and monitor the final disposition of your quotes.",
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
        ${quoteForm}
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
    history: undefined,
    loading: false,
    message: undefined,
    pairId: resolvePairId(demoStatus.pairId, location),
    price: "100.50",
    quantity: "50",
    selectedInvitationId: undefined,
    serverNow: demoStatus.currentTime,
    session: resolveSession("dealer", storage, location),
    ttlMinutes: "20",
    view: undefined
  };

  const syncSelectedInvitation = (history: DealerInvitationHistoryView): void => {
    if (state.selectedInvitationId !== undefined) {
      const stillVisible = history.invitations.some(
        (invitation) => invitation.invitationId === state.selectedInvitationId
      );

      if (stillVisible) {
        return;
      }
    }

    state.selectedInvitationId = latestDealerInvitation(history)?.invitationId;
  };

  const refreshPair = async (): Promise<void> => {
    if (state.pairId.trim() === "") {
      state.view = undefined;
      state.history = undefined;
      state.selectedInvitationId = undefined;
      return;
    }

    const [status, view, history] = await Promise.all([
      client.getDemoStatus(),
      client.getDealerWorkbenchView({
        actorId: state.session.actorId,
        dealerId: state.session.actorId,
        pairId: state.pairId
      }),
      client.getDealerInvitationHistory({
        actorId: state.session.actorId,
        dealerId: state.session.actorId,
        pairId: state.pairId
      })
    ]);

    state.serverNow = status.currentTime;
    state.view = view;
    state.history = history;
    syncSelectedInvitation(history);

    const currentInvitation = state.history.invitations.find(
      (invitation) => invitation.invitationId === state.selectedInvitationId
    );

    if (currentInvitation !== undefined) {
      const currentOpenQuote = latestDealerOpenQuote(state.history, currentInvitation.rfqId);

      if (currentOpenQuote !== undefined) {
        state.quantity = String(currentOpenQuote.quantity);
      } else {
        const rfq = state.view.rfqs.find(
          (candidate) => candidate.rfqId === currentInvitation.rfqId
        );

        if (rfq !== undefined) {
          state.quantity = String(rfq.quantity);
        }
      }
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
            if (state.history === undefined) {
              throw new Error("Select an invitation before submitting or revising a quote.");
            }

            const selectedInvitation = state.history.invitations.find(
              (invitation) => invitation.invitationId === state.selectedInvitationId
            );

            if (selectedInvitation === undefined) {
              throw new Error("Select an invitation before submitting or revising a quote.");
            }

            const expiresAt = new Date(
              new Date(state.serverNow).getTime() + Number(state.ttlMinutes) * 60_000
            ).toISOString();
            const currentOpenQuote = latestDealerOpenQuote(state.history, selectedInvitation.rfqId);

            if (currentOpenQuote === undefined) {
              await client.submitQuote({
                actorId: state.session.actorId,
                expiresAt,
                pairId: state.pairId,
                price: Number(state.price),
                quantity: Number(state.quantity),
                rfqId: selectedInvitation.rfqId
              });
            } else {
              await client.reviseQuote({
                actorId: state.session.actorId,
                expiresAt,
                pairId: state.pairId,
                price: Number(state.price),
                quantity: Number(state.quantity),
                quoteId: currentOpenQuote.quoteId
              });
            }

            await refreshPair();
          },
          "Dealer quote updated.",
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

        if (action === "select-invitation") {
          const invitationId = String(id);
          state.selectedInvitationId = invitationId;
          setMessage(`Loaded invitation ${invitationId}.`, "accent");
          render();
          return;
        }

        if (action === "withdraw-quote") {
          const quoteId = String(id);
          void runWithFeedback(
            async () => {
              await client.withdrawQuote({
                actorId: state.session.actorId,
                pairId: state.pairId,
                quoteId
              });
              await refreshPair();
            },
            `Withdrew quote ${quoteId}.`,
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
