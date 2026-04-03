import { createInMemoryVenueRegistry } from "@canton-dark/adapters-memory";
import type { HealthResponse, ValidateVenueResponse } from "@canton-dark/api-contracts";
import { buildVenueHealthResponse } from "@canton-dark/app-services";
import type { VenueConfigurationDraft, VenueMode } from "@canton-dark/domain-core";

type ApiReply = {
  body: object;
  status: number;
};

const defaultDraft: VenueConfigurationDraft = {
  mode: "SingleDealerPair",
  operatorId: "operator-demo",
  dealers: ["dealer-alpha"],
  marketingLabel: "Canton Dark Pair"
};

const registry = createInMemoryVenueRegistry(defaultDraft);

const parseMode = (value: string | null): VenueMode =>
  value === "ATSPair" ? "ATSPair" : "SingleDealerPair";

export const parseVenueDraftFromUrl = (url: URL): VenueConfigurationDraft => {
  const dealers = (url.searchParams.get("dealers") ?? registry.get().dealers.join(","))
    .split(",")
    .map((dealerId) => dealerId.trim())
    .filter(Boolean);

  return {
    mode: parseMode(url.searchParams.get("mode")),
    operatorId: url.searchParams.get("operatorId") ?? registry.get().operatorId,
    dealers,
    marketingLabel: url.searchParams.get("marketingLabel") ?? registry.get().marketingLabel
  };
};

const createValidateReply = (
  draft: VenueConfigurationDraft,
  now: () => Date
): ValidateVenueResponse => {
  const response = buildVenueHealthResponse(draft, now);

  return {
    ok: response.venue.status === "healthy",
    violations: response.venue.violations
  };
};

export const createHealthReply = (now: () => Date): HealthResponse =>
  buildVenueHealthResponse(registry.get(), now);

export const handleRequest = (
  requestUrl: string,
  now: () => Date = () => new Date("2026-04-02T00:00:00.000Z")
): ApiReply => {
  const url = new URL(requestUrl, "http://127.0.0.1:4301");

  if (url.pathname === "/health") {
    return {
      status: 200,
      body: createHealthReply(now)
    };
  }

  if (url.pathname === "/validate") {
    return {
      status: 200,
      body: createValidateReply(parseVenueDraftFromUrl(url), now)
    };
  }

  return {
    status: 404,
    body: {
      message: "Not found"
    }
  };
};
