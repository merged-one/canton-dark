import type { OperatorOversightView } from "@canton-dark/query-models";
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
import { demoIdentities, resolvePairId, resolveSession, saveSession } from "./auth";
import { operatorOversightMetrics, renderCode, renderStatus } from "./render-helpers";
import { readValue, resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type NoticeTone = "accent" | "alert" | "ok" | "warn";

type OperatorState = {
  accessRole: "auditor" | "dealer" | "operator" | "settlement_delegate" | "subscriber";
  createDealerId: string;
  createDealerUniverse: string[];
  demoPairId: string;
  inviteRevisionPolicy: "before_first_response" | "locked";
  jurisdiction: string;
  loading: boolean;
  message:
    | {
        text: string;
        tone: NoticeTone;
      }
    | undefined;
  mode: "ATSPair" | "SingleDealerPair";
  oversightRole: "blinded" | "full";
  pairId: string;
  pauseReason: string;
  rulebookSummary: string;
  rulebookVersion: string;
  session: ReturnType<typeof resolveSession>;
  subjectId: string;
  view: OperatorOversightView | undefined;
};

const dealerUniverseOptions = demoIdentities.dealer.filter(
  (identity) => identity.actorId !== "dealer-outsider"
);

const readCheckedValues = (root: ParentNode, selector: string): string[] =>
  [...root.querySelectorAll<HTMLInputElement>(selector)]
    .filter((field) => field.checked)
    .map((field) => field.value);

const renderAccessTable = (view: OperatorOversightView): string =>
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

const renderRfqTable = (view: OperatorOversightView): string =>
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

const renderInvitationTable = (view: OperatorOversightView): string =>
  renderTable({
    caption: "Directed invitations",
    columns: [
      { key: "invitationId", label: "Invitation" },
      { key: "rfqId", label: "RFQ" },
      { key: "dealerId", label: "Dealer" },
      { key: "status", label: "Status" },
      { key: "window", label: "Response window" }
    ],
    emptyMessage: "No directed invitations yet.",
    rows: view.invitations.map((invitation) => ({
      id: invitation.invitationId,
      cells: {
        invitationId: renderCode(invitation.invitationId),
        rfqId: renderCode(invitation.rfqId),
        dealerId: renderCode(invitation.dealerId),
        status: renderStatus(invitation.status),
        window: renderCode(invitation.responseWindowClosesAt)
      }
    }))
  });

const renderQuoteTable = (view: OperatorOversightView): string =>
  renderTable({
    caption: "Scoped quote events",
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
        price: escapeHtml(quote.price === null ? "redacted" : quote.price.toFixed(2)),
        quantity: escapeHtml(quote.quantity === null ? "redacted" : String(quote.quantity)),
        status: renderStatus(quote.status)
      }
    }))
  });

const renderQuoteLadderTable = (view: OperatorOversightView): string => {
  const rows = view.quoteLadders.flatMap((ladder) =>
    ladder.quotes.map((quote) => ({
      id: `${ladder.rfqId}:${quote.quoteId}`,
      cells: {
        rfqId: renderCode(ladder.rfqId),
        dealerId: renderCode(quote.dealerId),
        price: escapeHtml(quote.price.toFixed(2)),
        quantity: escapeHtml(String(quote.quantity)),
        rank: quote.rank === undefined ? escapeHtml("n/a") : escapeHtml(String(quote.rank)),
        status: renderStatus(quote.status)
      }
    }))
  );

  return renderTable({
    caption: "Quote ladders",
    columns: [
      { key: "rfqId", label: "RFQ" },
      { key: "dealerId", label: "Dealer" },
      { key: "price", label: "Price", numeric: true },
      { key: "quantity", label: "Quantity", numeric: true },
      { key: "rank", label: "Rank", numeric: true },
      { key: "status", label: "Status" }
    ],
    emptyMessage: "Live quote ladders are redacted for this oversight scope.",
    rows
  });
};

const renderRevisionTable = (view: OperatorOversightView): string =>
  renderTable({
    caption: "Quote revisions",
    columns: [
      { key: "revisionId", label: "Revision" },
      { key: "dealerId", label: "Dealer" },
      { key: "previousQuoteId", label: "Previous quote" },
      { key: "nextQuoteId", label: "Next quote" },
      { key: "revisedAt", label: "Revised" }
    ],
    emptyMessage: "No quote revisions yet.",
    rows: view.revisions.map((revision) => ({
      id: revision.revisionId,
      cells: {
        revisionId: renderCode(revision.revisionId),
        dealerId: renderCode(revision.dealerId),
        previousQuoteId: renderCode(revision.previousQuoteId),
        nextQuoteId: renderCode(revision.nextQuoteId),
        revisedAt: renderCode(revision.revisedAt)
      }
    }))
  });

const renderWithdrawalTable = (view: OperatorOversightView): string =>
  renderTable({
    caption: "Withdrawals",
    columns: [
      { key: "withdrawalId", label: "Withdrawal" },
      { key: "dealerId", label: "Dealer" },
      { key: "quoteId", label: "Quote" },
      { key: "reason", label: "Reason" },
      { key: "withdrawnAt", label: "Withdrawn" }
    ],
    emptyMessage: "No quote withdrawals yet.",
    rows: view.withdrawals.map((withdrawal) => ({
      id: withdrawal.withdrawalId,
      cells: {
        withdrawalId: renderCode(withdrawal.withdrawalId),
        dealerId: renderCode(withdrawal.dealerId),
        quoteId: renderCode(withdrawal.quoteId),
        reason: escapeHtml(withdrawal.reason ?? "n/a"),
        withdrawnAt: renderCode(withdrawal.withdrawnAt)
      }
    }))
  });

const renderExecutionTable = (view: OperatorOversightView): string =>
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

const renderSettlementTable = (view: OperatorOversightView): string =>
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

const renderAuditTable = (view: OperatorOversightView | undefined): string =>
  renderTable({
    caption: "Audit trail",
    columns: [
      { key: "at", label: "At" },
      { key: "action", label: "Action" },
      { key: "actorId", label: "Actor" },
      { key: "detail", label: "Detail" }
    ],
    emptyMessage: "No audit entries yet.",
    rows: (view?.audits ?? []).map((entry) => ({
      id: `${entry.at}:${entry.action}`,
      cells: {
        at: renderCode(entry.at),
        action: escapeHtml(entry.action),
        actorId: renderCode(entry.actorId),
        detail: escapeHtml(entry.detail)
      }
    }))
  });

const renderDealerUniverseChecklist = (state: OperatorState): string => `
  <fieldset class="field">
    <legend>Dealer universe</legend>
    <div class="choice-grid">
      ${dealerUniverseOptions
        .map(
          (dealer) => `
            <label class="choice-item" for="operator-universe-${escapeHtml(dealer.actorId)}">
              <input
                id="operator-universe-${escapeHtml(dealer.actorId)}"
                type="checkbox"
                name="dealerUniverse"
                value="${escapeHtml(dealer.actorId)}"
                ${state.createDealerUniverse.includes(dealer.actorId) ? "checked" : ""}
              />
              <span>${escapeHtml(dealer.label)}</span>
            </label>
          `
        )
        .join("")}
    </div>
  </fieldset>
`;

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
    subtitle: "Load a pair or keep the detail screen pinned while other roles act in parallel.",
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
    title: "Create venue pair",
    subtitle:
      "Configuration remains operator-owned. The UI submits typed create commands for SingleDealerPair and ATSPair without embedding venue policy.",
    body: `
      <form data-testid="operator-create-form">
        <div class="form-grid">
          <div class="field">
            <label for="operator-create-pair-id">Pair ID</label>
            <input id="operator-create-pair-id" name="pairId" value="${escapeHtml(state.pairId)}" />
          </div>
          <div class="field">
            <label for="operator-mode">Mode</label>
            <select id="operator-mode" name="mode">
              <option value="ATSPair"${state.mode === "ATSPair" ? " selected" : ""}>ATSPair</option>
              <option value="SingleDealerPair"${state.mode === "SingleDealerPair" ? " selected" : ""}>SingleDealerPair</option>
            </select>
          </div>
          <div class="field">
            <label for="operator-single-dealer-id">Primary dealer</label>
            <select id="operator-single-dealer-id" name="dealerId">
              ${dealerUniverseOptions
                .map(
                  (dealer) =>
                    `<option value="${escapeHtml(dealer.actorId)}"${state.createDealerId === dealer.actorId ? " selected" : ""}>${escapeHtml(dealer.actorId)}</option>`
                )
                .join("")}
            </select>
          </div>
          <div class="field">
            <label for="operator-oversight-role">Oversight role</label>
            <select id="operator-oversight-role" name="oversightRole">
              <option value="blinded"${state.oversightRole === "blinded" ? " selected" : ""}>blinded</option>
              <option value="full"${state.oversightRole === "full" ? " selected" : ""}>full</option>
            </select>
          </div>
          <div class="field">
            <label for="operator-invite-policy">Invite revision policy</label>
            <select id="operator-invite-policy" name="inviteRevisionPolicy">
              <option value="before_first_response"${state.inviteRevisionPolicy === "before_first_response" ? " selected" : ""}>before first response</option>
              <option value="locked"${state.inviteRevisionPolicy === "locked" ? " selected" : ""}>locked</option>
            </select>
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
        <div style="margin-top: 12px;">
          ${renderDealerUniverseChecklist(state)}
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
    title: "Access and pause controls",
    subtitle: "Grant pair access, manage pause state, and preserve the operator-owned perimeter.",
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
                    `<option value="${role}"${state.accessRole === role ? " selected" : ""}>${escapeHtml(role.replaceAll("_", " "))}</option>`
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
          <button class="button ${state.view?.pair.paused === true ? "button-primary" : "button-danger"}" type="button" data-action="toggle-pause"${state.view === undefined ? " disabled" : ""}>
            ${state.view?.pair.paused === true ? "Reactivate pair" : "Pause pair"}
          </button>
        </div>
      </form>
    `,
    testId: "operator-access-card"
  });

  const message =
    state.message === undefined
      ? ""
      : renderNotice(state.message.text, state.message.tone, "operator-notice");

  const detail = renderWideCard({
    title: "Operator ATSPair detail screen",
    subtitle:
      "Configuration, access management, pause controls, and scoped event visibility are rendered from the operator oversight projection.",
    body:
      state.view === undefined
        ? `<p class="empty" data-testid="operator-empty-state">No pair is currently loaded.</p>`
        : `
            ${renderNotice(
              state.view.health.detail,
              state.view.health.status === "healthy"
                ? "ok"
                : state.view.health.status === "paused"
                  ? "warn"
                  : "alert",
              "operator-health"
            )}
            ${
              state.view.oversightRole === "blinded"
                ? renderNotice(
                    "Blinded oversight redacts live quote ladders and non-accepted quote economics.",
                    "warn",
                    "operator-oversight-scope"
                  )
                : ""
            }
            ${renderKeyValueGrid([
              { key: "Pair", value: state.view.pair.pairId },
              { key: "Mode", value: state.view.pair.mode },
              { key: "Operator", value: state.view.pair.operatorId },
              { key: "Oversight", value: state.view.oversightRole },
              { key: "Invite policy", value: state.view.inviteRevisionPolicy.replaceAll("_", " ") },
              { key: "Dealer universe", value: state.view.dealerUniverse.join(", ") },
              { key: "Rulebook", value: state.view.pair.rulebookVersion },
              { key: "Approval", value: state.view.pair.approvalStatus }
            ])}
            ${renderMetricGrid(operatorOversightMetrics(state.view))}
            <div style="margin-top: 16px;">${renderAccessTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderRfqTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderInvitationTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderQuoteTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderQuoteLadderTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderRevisionTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderWithdrawalTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderExecutionTable(state.view)}</div>
            <div style="margin-top: 16px;">${renderSettlementTable(state.view)}</div>
          `,
    testId: "operator-pair-detail"
  });

  const audit = renderWideCard({
    title: "Scoped audit",
    subtitle: "Audit visibility stays on the read side instead of relying on UI-only filtering.",
    body: renderAuditTable(state.view),
    testId: "operator-audit-card"
  });

  return renderAppShell({
    title: "Operator Console",
    strapline:
      "Configure ATSPair venues, manage access grants and pause controls, and inspect scoped audit and event surfaces.",
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
    createDealerId: demoStatus.dealerId,
    createDealerUniverse: [...demoStatus.dealerIds],
    demoPairId: demoStatus.pairId,
    inviteRevisionPolicy: "before_first_response",
    jurisdiction: "US",
    loading: false,
    message: undefined,
    mode: "ATSPair",
    oversightRole: "blinded",
    pairId: resolvePairId(demoStatus.pairId, location),
    pauseReason: "manual review",
    rulebookSummary: "phase 2 ats demo",
    rulebookVersion: "v2",
    session: resolveSession("operator", storage, location),
    subjectId: demoStatus.subscriberId,
    view: undefined
  };

  const refreshPair = async (): Promise<void> => {
    if (state.pairId.trim() === "") {
      state.view = undefined;
      return;
    }

    state.view = await client.getOperatorOversightView({
      actorId: state.session.actorId,
      pairId: state.pairId
    });
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
        state.mode = readValue(root, "#operator-mode") as OperatorState["mode"];
        state.createDealerId = readValue(root, "#operator-single-dealer-id");
        state.oversightRole = readValue(
          root,
          "#operator-oversight-role"
        ) as OperatorState["oversightRole"];
        state.inviteRevisionPolicy = readValue(
          root,
          "#operator-invite-policy"
        ) as OperatorState["inviteRevisionPolicy"];
        state.jurisdiction = readValue(root, "#operator-jurisdiction");
        state.rulebookVersion = readValue(root, "#operator-rulebook-version");
        state.rulebookSummary = readValue(root, "#operator-rulebook-summary");
        state.createDealerUniverse = readCheckedValues(root, "input[name='dealerUniverse']");

        void runWithFeedback(
          async () => {
            if (state.mode === "ATSPair" && state.createDealerUniverse.length < 2) {
              throw new Error(
                "ATSPair venues require at least two dealers in the dealer universe."
              );
            }

            await client.createPair({
              actorId: state.session.actorId,
              ...(state.mode === "ATSPair"
                ? {
                    dealerIds: state.createDealerUniverse,
                    inviteRevisionPolicy: state.inviteRevisionPolicy,
                    operatorOversightRole: state.oversightRole
                  }
                : {
                    dealerId: state.createDealerId
                  }),
              jurisdiction: state.jurisdiction,
              mode: state.mode,
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

        if (action === "toggle-pause") {
          const view = state.view;

          if (view === undefined) {
            return;
          }

          state.pauseReason = readValue(root, "#operator-pause-reason");
          void runWithFeedback(
            async () => {
              await client.pausePair({
                actorId: state.session.actorId,
                pairId: state.pairId,
                state: view.pair.paused ? "active" : "paused",
                ...(view.pair.paused ? {} : { reason: state.pauseReason })
              });
              await refreshPair();
            },
            view.pair.paused ? "Pair reactivated." : "Pair paused.",
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
