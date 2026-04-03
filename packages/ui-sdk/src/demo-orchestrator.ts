import {
  escapeHtml,
  renderAppShell,
  renderCard,
  renderKeyValueGrid,
  renderNotice,
  renderPill,
  renderWideCard
} from "@canton-dark/ui-kit";

import { createVenueApiClient } from "./api-client";
import { buildRoleUrl } from "./auth";
import { resolveApiBaseUrl, toErrorMessage, type AppBootOptions } from "./shared";

type NoticeTone = "accent" | "alert" | "ok" | "warn";

type DemoState = {
  currentTime: string;
  dealerId: string;
  loading: boolean;
  message?: {
    text: string;
    tone: NoticeTone;
  };
  mode: "empty" | "phase1-complete" | "phase1-ready";
  operatorId: string;
  pairId: string;
  seed: number;
  subscriberId: string;
};

const renderLaunchLinks = (state: DemoState): string => `
  <ul class="launch-list" data-testid="demo-launch-links">
    <li><a href="${escapeHtml(buildRoleUrl({ actorId: state.operatorId, pairId: state.pairId, role: "operator" }))}" target="_blank" rel="noreferrer">Open operator console</a></li>
    <li><a href="${escapeHtml(buildRoleUrl({ actorId: state.subscriberId, pairId: state.pairId, role: "subscriber" }))}" target="_blank" rel="noreferrer">Open subscriber terminal</a></li>
    <li><a href="${escapeHtml(buildRoleUrl({ actorId: state.dealerId, pairId: state.pairId, role: "dealer" }))}" target="_blank" rel="noreferrer">Open dealer workbench</a></li>
  </ul>
`;

const renderDemoContent = (state: DemoState): string => {
  const resetCard = renderCard({
    title: "Predictable seed controls",
    subtitle:
      "Reset the in-memory stack into a known demo state before clicking through or running Playwright.",
    body: `
      <div class="actions">
        <button class="button" type="button" data-action="seed-empty">Seed empty stack</button>
        <button class="button button-primary" type="button" data-action="seed-ready">Seed ready pair</button>
        <button class="button" type="button" data-action="seed-complete">Seed completed flow</button>
      </div>
      <div class="actions">
        <button class="button" type="button" data-action="advance-clock">Advance API clock +5m</button>
      </div>
    `,
    testId: "demo-seed-card"
  });

  const stateCard = renderCard({
    title: "Current demo state",
    subtitle: "Launch links stay stable because the pair and persona ids are fixed.",
    body: `
      ${renderKeyValueGrid([
        { key: "Mode", value: state.mode },
        { key: "Seed", value: String(state.seed) },
        { key: "Pair", value: state.pairId },
        { key: "API clock", value: state.currentTime }
      ])}
      ${renderLaunchLinks(state)}
    `,
    testId: "demo-state-card"
  });

  const rosterCard = renderCard({
    title: "Demo personas",
    subtitle:
      "These are the local identities used for one-click launch links and Playwright auth setup.",
    body: `
      ${renderKeyValueGrid([
        { key: "Operator", value: state.operatorId },
        { key: "Subscriber", value: state.subscriberId },
        { key: "Dealer", value: state.dealerId }
      ])}
    `,
    testId: "demo-roster-card"
  });

  return renderAppShell({
    title: "Demo Orchestrator",
    strapline:
      "Reset the deterministic Phase 1 stack and jump straight into operator, subscriber, and dealer screens.",
    sessionBadges: [
      renderPill(state.mode, "accent", "demo-mode-badge"),
      renderPill(state.loading ? "Working" : "Ready", state.loading ? "warn" : "ok")
    ],
    content: `
      ${
        state.message === undefined
          ? ""
          : renderNotice(state.message.text, state.message.tone, "demo-notice")
      }
      <div class="card-grid">
        ${resetCard}
        ${stateCard}
        ${rosterCard}
      </div>
      ${renderWideCard({
        title: "Demo path",
        subtitle:
          "Use the ready pair for a fast click-through, or reset empty and follow the full operator-to-subscriber-to-dealer lifecycle.",
        body: `
          <p class="muted">Recommended manual path: operator creates a pair and grants subscriber access, subscriber opens an RFQ, dealer submits a quote, subscriber accepts, and then each role refreshes to observe execution and settlement state.</p>
          <p class="muted">Use the launch links above to open each screen with the correct role bootstrap and pair id preloaded.</p>
        `,
        testId: "demo-path-card"
      })}
    `
  });
};

export const mountDemoOrchestrator = async ({
  apiBaseUrl,
  fetchImpl,
  root
}: AppBootOptions): Promise<void> => {
  const client = createVenueApiClient({
    apiBaseUrl: resolveApiBaseUrl(apiBaseUrl),
    ...(fetchImpl !== undefined ? { fetchImpl } : {})
  });
  const status = await client.getDemoStatus();
  const state: DemoState = {
    currentTime: status.currentTime,
    dealerId: status.dealerId,
    loading: false,
    mode: status.mode,
    operatorId: status.operatorId,
    pairId: status.pairId,
    seed: status.seed,
    subscriberId: status.subscriberId
  };

  const assign = (next: typeof status): void => {
    state.currentTime = next.currentTime;
    state.dealerId = next.dealerId;
    state.mode = next.mode;
    state.operatorId = next.operatorId;
    state.pairId = next.pairId;
    state.seed = next.seed;
    state.subscriberId = next.subscriberId;
  };

  const setMessage = (text: string, tone: NoticeTone): void => {
    state.message = {
      text,
      tone
    };
  };

  const render = (): void => {
    root.innerHTML = renderDemoContent(state);

    root.querySelectorAll<HTMLButtonElement>("[data-action]").forEach((button) => {
      button.addEventListener("click", () => {
        const action = button.dataset.action;

        if (action === "seed-empty") {
          void runWithFeedback(
            () => client.resetDemoState({ mode: "empty" }),
            "Seeded empty stack.",
            "accent"
          );
          return;
        }

        if (action === "seed-ready") {
          void runWithFeedback(
            () => client.resetDemoState({ mode: "phase1-ready" }),
            "Seeded ready pair.",
            "ok"
          );
          return;
        }

        if (action === "seed-complete") {
          void runWithFeedback(
            () => client.resetDemoState({ mode: "phase1-complete" }),
            "Seeded completed flow.",
            "ok"
          );
          return;
        }

        if (action === "advance-clock") {
          void runWithFeedback(
            () => client.advanceClock(5 * 60_000),
            "Advanced API clock by five minutes.",
            "warn"
          );
        }
      });
    });
  };

  const runWithFeedback = async (
    action: () => Promise<typeof status>,
    successMessage: string,
    successTone: NoticeTone
  ): Promise<void> => {
    state.loading = true;
    render();

    try {
      assign(await action());
      setMessage(successMessage, successTone);
    } catch (error) {
      setMessage(toErrorMessage(error), "alert");
    } finally {
      state.loading = false;
      render();
    }
  };

  render();
};
