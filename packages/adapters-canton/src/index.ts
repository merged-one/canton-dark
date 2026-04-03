import type { VenueConfiguration } from "@canton-dark/domain-core";

export type CantonSubmissionPlan = {
  informees: readonly string[];
  observers: readonly string[];
  venue: VenueConfiguration;
};
