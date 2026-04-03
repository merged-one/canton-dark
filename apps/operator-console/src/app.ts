import type { HealthResponse } from "@canton-dark/api-contracts";
import { mountVenueHealth } from "@canton-dark/ui-sdk";

type FetchLike = typeof fetch;

type BootOptions = {
  apiBaseUrl?: string;
  fetchImpl?: FetchLike;
  root: HTMLElement;
};

const resolveApiBaseUrl = (apiBaseUrl?: string) =>
  apiBaseUrl ??
  (import.meta as ImportMeta & { env: { VITE_VENUE_API_BASE_URL?: string } }).env
    .VITE_VENUE_API_BASE_URL ??
  "http://127.0.0.1:4301";

export const loadHealthResponse = async (
  fetchImpl: FetchLike,
  apiBaseUrl?: string
): Promise<HealthResponse> => {
  const response = await fetchImpl(`${resolveApiBaseUrl(apiBaseUrl)}/health`);

  if (!response.ok) {
    throw new Error(`Health request failed with status ${response.status}.`);
  }

  return (await response.json()) as HealthResponse;
};

export const bootOperatorConsole = async ({
  apiBaseUrl,
  fetchImpl = fetch,
  root
}: BootOptions): Promise<void> => {
  root.innerHTML = `
    <section>
      <h1>Operator Console</h1>
      <p>Venue bootstrap and policy health for regulated operators.</p>
      <div data-testid="venue-health">Loading venue health...</div>
    </section>
  `;

  const panel = root.querySelector<HTMLElement>("[data-testid='venue-health']");

  if (!panel) {
    throw new Error("Venue health panel is missing from the operator console shell.");
  }

  try {
    const response = await loadHealthResponse(fetchImpl, apiBaseUrl);
    mountVenueHealth(panel, response);
  } catch {
    panel.innerHTML = "<p data-testid='health-error'>Unable to load venue health.</p>";
  }
};
