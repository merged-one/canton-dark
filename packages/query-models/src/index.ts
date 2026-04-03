import type { VenueMode } from "@canton-dark/domain-core";

export type VenueStatus = "healthy" | "rejected";

export type VenueSummary = {
  dealers: readonly string[];
  ledgerFacts: readonly string[];
  mode: VenueMode;
  offLedgerFacts: readonly string[];
  operatorId: string;
};

export type VenueHealthReadModel = {
  detail: string;
  status: VenueStatus;
  summary: VenueSummary;
  title: string;
  violations: readonly string[];
};
