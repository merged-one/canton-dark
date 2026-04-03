import type {
  DealerInvitationHistoryView,
  DealerWorkbenchView,
  OperatorOversightView,
  OperatorView,
  QuoteComparisonView,
  SubscriberView
} from "@canton-dark/query-models";
import { escapeHtml, renderPill, type Tone } from "@canton-dark/ui-kit";

export const humanize = (value: string): string =>
  value
    .split(/[_\s-]+/u)
    .filter((part) => part.length > 0)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");

export const renderCode = (value: string): string =>
  `<span class="code">${escapeHtml(value)}</span>`;

const statusTone = (status: string): Tone => {
  switch (status) {
    case "accepted":
    case "affirmed":
    case "healthy":
    case "instructed":
    case "open":
    case "pending":
    case "settled":
      return "ok";
    case "paused":
    case "quote_expired":
    case "quoted":
      return "warn";
    case "cancelled":
    case "expired":
    case "failed":
    case "rejected":
      return "alert";
    default:
      return "muted";
  }
};

export const renderStatus = (status: string): string =>
  renderPill(humanize(status), statusTone(status));

export const renderActionButton = (input: {
  action: string;
  id: string;
  label: string;
  tone?: "button" | "button-danger" | "button-primary";
}): string =>
  `<button type="button" class="button ${input.tone ?? "button"}" data-action="${escapeHtml(input.action)}" data-id="${escapeHtml(input.id)}">${escapeHtml(input.label)}</button>`;

export const operatorMetrics = (view: OperatorView) =>
  [
    { label: "Participants", value: String(view.access.participants.length) },
    { label: "RFQs", value: String(view.rfqs.length) },
    { label: "Quotes", value: String(view.quotes.length) },
    { label: "Executions", value: String(view.executions.length) },
    { label: "Settlements", value: String(view.settlements.length) }
  ] as const;

export const operatorOversightMetrics = (view: OperatorOversightView) =>
  [
    { label: "Participants", value: String(view.access.participants.length) },
    { label: "RFQs", value: String(view.rfqs.length) },
    { label: "Invites", value: String(view.invitations.length) },
    { label: "Quotes", value: String(view.quotes.length) },
    { label: "Audits", value: String(view.audits.length) }
  ] as const;

export const subscriberMetrics = (view: SubscriberView) =>
  [
    { label: "RFQs", value: String(view.rfqs.length) },
    { label: "Quotes", value: String(view.quotes.length) },
    { label: "Executions", value: String(view.executions.length) },
    { label: "Settlements", value: String(view.settlements.length) }
  ] as const;

export const dealerMetrics = (view: DealerWorkbenchView) =>
  [
    { label: "Inbound RFQs", value: String(view.rfqs.length) },
    { label: "Quotes", value: String(view.quotes.length) },
    { label: "Executions", value: String(view.executions.length) }
  ] as const;

export const latestOpenSubscriberQuote = (view: SubscriberView) =>
  [...view.quotes]
    .filter((quote) => quote.status === "open")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

export const latestSubscriberRfq = (view: SubscriberView) =>
  [...view.rfqs].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

export const latestOpenDealerRfq = (view: DealerWorkbenchView) =>
  [...view.rfqs]
    .filter((rfq) => rfq.status === "open" || rfq.status === "quoted")
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

export const latestDealerInvitation = (view: DealerInvitationHistoryView) =>
  [...view.invitations].sort((left, right) =>
    `${right.invitedAt}:${right.invitationId}`.localeCompare(
      `${left.invitedAt}:${left.invitationId}`
    )
  )[0];

export const latestDealerOpenQuote = (
  view: DealerInvitationHistoryView,
  rfqId: string | undefined
) =>
  rfqId === undefined
    ? undefined
    : [...view.quotes]
        .filter((quote) => quote.rfqId === rfqId && quote.status === "open")
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];

export const comparisonMetrics = (view: QuoteComparisonView) =>
  [
    { label: "Invited", value: String(view.invitations.length) },
    { label: "Quotes", value: String(view.quotes.length) },
    {
      label: "Comparable",
      value: String(view.quotes.filter((quote) => quote.comparable).length)
    }
  ] as const;

export const formatCountdown = (nowIso: string, closesAt: string | undefined): string => {
  if (closesAt === undefined) {
    return "No response window configured";
  }

  const remainingMs = new Date(closesAt).getTime() - new Date(nowIso).getTime();
  const totalSeconds = Math.max(Math.floor(Math.abs(remainingMs) / 1_000), 0);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const clock = `${minutes}m ${String(seconds).padStart(2, "0")}s`;

  return remainingMs >= 0 ? `${clock} remaining` : `${clock} past response window`;
};
