import type { VenueHealthReadModel } from "@canton-dark/query-models";

export type HealthResponse = {
  generatedAt: string;
  service: "venue-api";
  venue: VenueHealthReadModel;
};

export type ValidateVenueResponse = {
  ok: boolean;
  violations: readonly string[];
};
