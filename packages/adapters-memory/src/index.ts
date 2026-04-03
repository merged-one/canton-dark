import type { VenueConfigurationDraft } from "@canton-dark/domain-core";

export type VenueRegistry = {
  get: () => VenueConfigurationDraft;
  replace: (nextDraft: VenueConfigurationDraft) => void;
};

export const createInMemoryVenueRegistry = (
  initialDraft: VenueConfigurationDraft
): VenueRegistry => {
  let current = structuredClone(initialDraft);

  return {
    get: () => structuredClone(current),
    replace: (nextDraft) => {
      current = structuredClone(nextDraft);
    }
  };
};
