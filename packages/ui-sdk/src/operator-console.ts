import type { AuditTrailView, OperatorView } from "@canton-dark/query-models";
import {
  escapeHtml,
  joinList,
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
import { operatorMetrics, renderCode, renderStatus } from "./render-helpers";
import { readValue, resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type OperatorState = {
  accessRole: "auditor" | "dealer" | "operator" | "settlement_delegate" | "subscriber";
  audit: AuditTrailView | undefined;
  dealerId: string;
  demoPairId: string;
  jurisdiction: string;
  loading: boolean;
  message:
    | {
        text: string;
        tone: NoticeTone;
      }
    | undefined;
  pairId: string;
  pauseReason: string;
  rulebookSummary: string;
  rulebookVersion: string;
  session: ReturnType<typeof resolveSession>;
  subjectId: string;
  view: OperatorView | undefined;
};

type NoticeTone = "accent" | "alert" | "ok" | "warn";

const renderAccessTable = (view: OperatorView): string =>
  renderTable({
    caption: "Participant access",
    columns: [
      { key: "subjectId", label: "Participant" },
      { key: "roles", label: "Roles" },
      { key: "entitlements", label: "Entitlements" }
    ],
    emptyMessage: "No grants are present for this pair.",
    rows: view.access.participants.map((participant) => ({
      id: participant.subjectId,
      cells: {
        subjectId: renderCode(participant.subjectId),
        roles: escapeHtml(joinList(participant.roles.map((role) => role.replaceAll("_", " ")))),
        entitlements: escapeHtml(joinList(participant.entitlements))
      }
    }))
  });

const renderRfqTable = (view: OperatorView): string =>
  renderTable({
    caption: "RFQs",
    columns: [
      { key: "rfqId", label: "RFQ" },
      { key: "instrumentId", label: "Instrument" },
      { key: "subscriberId", label: "Subscriber" },
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
        subscriberId: renderCode(rfq.subscriberId),
        side: escapeHtml(rfq.side.toUpperCase()),
        quantity: escapeHtml(String(rfq.quantity)),
        status: renderStatus(rfq.status)
      }
    }))
  });

const renderQuoteTable = (view: OperatorView): string =>
  renderTable({
    caption: "Dealer quotes",
    columns: [
      { key: "quoteId", label: "Quote" },
      { key: "rfqId", label: "RFQ" },
      { key: "dealerId", label: "Dealer" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "status", label: "Status" }
    ],
    emptyMessage: "No quotes yet.",
    rows: view.quotes.map((quote) => ({
      id: quote.quoteId,
      cells: {
        quoteId: renderCode(quote.quoteId),
        rfqId: renderCode(quote.rfqId),
        dealerId: renderCode(quote.dealerId),
        price: escapeHtml(quote.price.toFixed(2)),
        quantity: escapeHtml(String(quote.quantity)),
        status: renderStatus(quote.status)
      }
    }))
  });

const renderExecutionTable = (view: OperatorView): string =>
  renderTable({
    caption: "Executions",
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

const renderSettlementTable = (view: OperatorView): string =>
  renderTable({
    caption: "Settlement state",
    columns: [
      { key: "instructionId", label: "Instruction" },
      { key: "executionId", label: "Execution" },
      { key: "status", label: "Status" },
      { key: "updatedAt", label: "Updated" }
    ],
    emptyMessage: "No settlement instructions yet.",
    rows: view.settlements.map((settlement) => ({
      id: settlement.instructionId,
      cells: {
        instructionId: renderCode(settlement.instructionId),
        executionId: renderCode(settlement.executionId),
        status: renderStatus(settlement.status),
        updatedAt: renderCode(settlement.updatedAt)
      }
    }))
  });

const renderAuditTable = (audit: AuditTrailView | undefined): string =>
  renderTable({
    caption: "Audit trail",
    columns: [
      { key: "at", label: "At" },
      { key: "action", label: "Action" },
      { key: "actorId", label: "Actor" },
      { key: "detail", label: "Detail" }
    ],
    emptyMessage: "No audit entries yet.",
    rows: (audit?.entries ?? []).map((entry) => ({
      id: `${entry.at}-${entry.action}`,
      cells: {
        at: renderCode(entry.at),
        action: escapeHtml(entry.action),
        actorId: renderCode(entry.actorId),
        detail: escapeHtml(entry.detail)
      }
    }))
  });

const renderOperatorContent = (state: OperatorState): string => {
  const sessionCard = renderCard({
    title: "Role bootstrap",
    subtitle: "Local demo identity used for operator-scoped requests.",
    body: `
      <form data-testid="operator-session-form">
        <div class="field">
          <label for="operator-actor-id">Actor ID</label>
          <input id="operator-actor-id" name="actorId" value="${escapeHtml(state.session.actorId)}" />
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Save session</button>
        </div>
      </form>
    `,
    testId: "operator-session-card"
  });

  const pairFocusCard = renderCard({
    title: "Pair focus",
    subtitle: "Load an existing pair or keep the detail screen pinned while other roles act.",
    body: `
      <form data-testid="operator-pair-form">
        <div class="form-grid">
          <div class="field">
            <label for="operator-pair-id">Pair ID</label>
            <input id="operator-pair-id" name="pairId" value="${escapeHtml(state.pairId)}" />
          </div>
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Load pair</button>
          <button class="button" type="button" data-action="refresh-pair">Refresh</button>
        </div>
      </form>
    `,
    testId: "operator-pair-card"
  });

  const createCard = renderCard({
    title: "Create SingleDealerPair",
    subtitle: "Pair creation remains operator-owned. The UI only submits typed commands.",
    body: `
      <form data-testid="operator-create-form">
        <div class="form-grid">
          <div class="field">
            <label for="operator-create-pair-id">Pair ID</label>
            <input id="operator-create-pair-id" name="pairId" value="${escapeHtml(state.pairId)}" />
          </div>
          <div class="field">
            <label for="operator-dealer-id">Dealer ID</label>
            <input id="operator-dealer-id" name="dealerId" value="${escapeHtml(state.dealerId)}" />
          </div>
          <div class="field">
            <label for="operator-jurisdiction">Jurisdiction</label>
            <input id="operator-jurisdiction" name="jurisdiction" value="${escapeHtml(state.jurisdiction)}" />
          </div>
          <div class="field">
            <label for="operator-rulebook-version">Rulebook version</label>
            <input id="operator-rulebook-version" name="rulebookVersion" value="${escapeHtml(state.rulebookVersion)}" />
          </div>
        </div>
        <div class="field" style="margin-top: 12px;">
          <label for="operator-rulebook-summary">Rulebook summary</label>
          <textarea id="operator-rulebook-summary" name="rulebookSummary">${escapeHtml(state.rulebookSummary)}</textarea>
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit">Create pair</button>
        </div>
      </form>
    `,
    testId: "operator-create-card"
  });

  const accessCard = renderCard({
    title: "Grant participant access",
    subtitle: "Use this after pair creation to authorize the subscriber role for demo flows.",
    body: `
      <form data-testid="operator-access-form">
        <div class="form-grid">
          <div class="field">
            <label for="operator-subject-id">Subject ID</label>
            <input id="operator-subject-id" name="subjectId" value="${escapeHtml(state.subjectId)}" />
          </div>
          <div class="field">
            <label for="operator-access-role">Role</label>
            <select id="operator-access-role" name="role">
              ${["subscriber", "dealer", "auditor", "settlement_delegate", "operator"]
                .map(
                  (role) =>
                    `<option value="${role}"${state.accessRole === role ? " selected" : ""}>${role.replaceAll("_", " ")}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="operator-pause-reason">Pause reason</label>
            <input id="operator-pause-reason" name="pauseReason" value="${escapeHtml(state.pauseReason)}" />
          </div>
        </div>
        <div class="actions">
          <button class="button button-primary" type="submit"${state.view === undefined ? " disabled" : ""}>Grant access</button>
          <button class="button ${state.view?.pair.paused === true ? "button-primary" : "button-danger"}" type="button" data-action="toggle-pause"${state.view === undefined ? " disabled" : ""}>${state.view?.pair.paused === true ? "Reactivate pair" : "Pause pair"}</button>
        </div>
      </form>
    `,
    testId: "operator-access-card"
  });

  const message =
    state.message === undefined
      ? ""
      : renderNotice(state.message.text, state.message.tone, "operator-notice");

  const detail =
    state.view === undefined
      ? renderWideCard({
          title: "Pair detail",
          subtitle: "Load or create a pair to inspect health, access, and lifecycle state.",
          body: `<p class="empty" data-testid="operator-empty-state">No pair is currently loaded.</p>`,
          testId: "operator-pair-detail"
        })
      : renderWideCard({
          title: "Pair detail",
          subtitle:
            "Operator-wide projection with participant access, RFQ, quote, execution, and settlement state.",
          body: `
            ${renderNotice(state.view.health.detail, state.view.health.status === "healthy" ? "ok" : state.view.health.status === "paused" ? "warn" : "alert", "operator-health")}
            ${renderKeyValueGrid([
              { key: "Pair", value: state.view.pair.pairId },
              { key: "Mode", value: state.view.pair.mode },
              { key: "Operator", value: state.view.pair.operatorId },
              { key: "Dealer", value: state.view.pair.dealerId },
              { key: "Rulebook", value: state.view.pair.rulebookVersion },
              { key: "Approval", value: state.view.pair.approvalStatus }
            ])}
            ${renderMetricGrid(operatorMetrics(state.view))}
            <div style="margin-top: 16px;">${renderAccessTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderRfqTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderQuoteTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderExecutionTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderSettlementTable(state.view)}</div>
          `,
          testId: "operator-pair-detail"
        });

  const audit = renderWideCard({
    title: "Audit",
    subtitle: "Operator and auditor scope stays on the read side, not in UI-only filtering.",
    body: renderAuditTable(state.audit),
    testId: "operator-audit-card"
  });

  return renderAppShell({
    title: "Operator Console",
    strapline:
      "Create SingleDealerPair venues, grant access, and review deterministic lifecycle state.",
    sessionBadges: [
      renderPill("operator", "accent", "operator-role-badge"),
      renderPill(state.session.actorId, "muted", "operator-actor-badge"),
      renderPill(state.loading ? "Loading" : "Ready", state.loading ? "warn" : "ok")
    ],
    content: `
      ${message}
      <div class="card-grid">
        ${sessionCard}
        ${pairFocusCard}
        ${createCard}
        ${accessCard}
      </div>
      ${detail}
      ${audit}
    `
  });
};

export const mountOperatorConsole = async ({
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
  const state: OperatorState = {
    accessRole: "subscriber",
    dealerId: demoStatus.dealerId,
    demoPairId: demoStatus.pairId,
    jurisdiction: "US",
    loading: false,
    message: undefined,
    pairId: resolvePairId(demoStatus.pairId, location),
    pauseReason: "manual review",
    rulebookSummary: "initial",
    rulebookVersion: "v1",
    session: resolveSession("operator", storage, location),
    subjectId: demoStatus.subscriberId,
    view: undefined,
    audit: undefined
  };

  const refreshPair = async (): Promise<void> => {
    if (state.pairId.trim() === "") {
      state.view = undefined;
      state.audit = undefined;
      return;
    }

    const [view, audit] = await Promise.all([
      client.getOperatorView({
        actorId: state.session.actorId,
        pairId: state.pairId
      }),
      client.getAuditTrail({
        actorId: state.session.actorId,
        pairId: state.pairId
      })
    ]);

    state.view = view;
    state.audit = audit;
  };

  const setMessage = (text: string, tone: NoticeTone): void => {
    state.message = {
      text,
      tone
    };
  };

  const render = (): void => {
    root.innerHTML = renderOperatorContent(state);

    root
      .querySelector<HTMLFormElement>("[data-testid='operator-session-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.session = saveSession(
          {
            actorId: readValue(root, "#operator-actor-id"),
            role: "operator"
          },
          storage
        );
        void runWithFeedback(refreshPair, "Operator session updated.", "warn");
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='operator-pair-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.pairId = readValue(root, "#operator-pair-id");
        void runWithFeedback(refreshPair, `Loaded pair ${state.pairId}.`, "accent");
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='operator-create-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.pairId = readValue(root, "#operator-create-pair-id");
        state.dealerId = readValue(root, "#operator-dealer-id");
        state.jurisdiction = readValue(root, "#operator-jurisdiction");
        state.rulebookVersion = readValue(root, "#operator-rulebook-version");
        state.rulebookSummary = readValue(root, "#operator-rulebook-summary");
        void runWithFeedback(
          async () => {
            await client.createPair({
              actorId: state.session.actorId,
              dealerId: state.dealerId,
              jurisdiction: state.jurisdiction,
              mode: "SingleDealerPair",
              operatorId: state.session.actorId,
              pairId: state.pairId,
              rulebookSummary: state.rulebookSummary,
              rulebookVersion: state.rulebookVersion
            });
            await refreshPair();
          },
          `Created pair ${state.pairId}.`,
          "ok"
        );
      });

    root
      .querySelector<HTMLFormElement>("[data-testid='operator-access-form']")
      ?.addEventListener("submit", (event) => {
        event.preventDefault();
        state.subjectId = readValue(root, "#operator-subject-id");
        state.accessRole = readValue(root, "#operator-access-role") as OperatorState["accessRole"];
        state.pauseReason = readValue(root, "#operator-pause-reason");
        void runWithFeedback(
          async () => {
            await client.grantAccess({
              actorId: state.session.actorId,
              pairId: state.pairId,
              role: state.accessRole,
              subjectId: state.subjectId
            });
            await refreshPair();
          },
          `Granted ${state.accessRole.replaceAll("_", " ")} access to ${state.subjectId}.`,
          "ok"
        );
      });

    root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "refresh-pair") {
          state.pairId = readValue(root, "#operator-pair-id");
          void runWithFeedback(refreshPair, `Refreshed pair ${state.pairId}.`, "accent");
          return;
        }

        if (action === "toggle-pause" && state.view !== undefined) {
          state.pauseReason = readValue(root, "#operator-pause-reason");
          void runWithFeedback(
            async () => {
              await client.pausePair({
                actorId: state.session.actorId,
                pairId: state.pairId,
                state: state.view?.pair.paused === true ? "active" : "paused",
                ...(state.view?.pair.paused === true ? {} : { reason: state.pauseReason })
              });
              await refreshPair();
            },
            state.view.pair.paused ? "Pair reactivated." : "Pair paused.",
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
