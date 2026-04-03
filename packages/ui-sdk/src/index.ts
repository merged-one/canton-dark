import type { HealthResponse } from "@canton-dark/api-contracts";
import { joinList, statusToneClass } from "@canton-dark/ui-kit";

const escapeHtml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

export const renderVenueHealthHtml = (response: HealthResponse): string => {
  const violationsMarkup =
    response.venue.violations.length === 0
      ? "<p data-testid='violations'>No policy violations.</p>"
      : `<ul data-testid='violations'>${response.venue.violations
          .map((violation) => `<li>${escapeHtml(violation)}</li>`)
          .join("")}</ul>`;

  return `
    <article data-testid="health-card" class="${statusToneClass(response.venue.status)}">
      <h2>${escapeHtml(response.venue.title)}</h2>
      <p>${escapeHtml(response.venue.detail)}</p>
      <p>Dealers: ${escapeHtml(joinList(response.venue.summary.dealers))}</p>
      <p>On-ledger: ${escapeHtml(joinList(response.venue.summary.ledgerFacts))}</p>
      <p>Off-ledger: ${escapeHtml(joinList(response.venue.summary.offLedgerFacts))}</p>
      ${violationsMarkup}
    </article>
  `;
};

export const mountVenueHealth = (target: HTMLElement, response: HealthResponse): void => {
  target.innerHTML = renderVenueHealthHtml(response);
};
