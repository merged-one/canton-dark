import type { HealthResponse } from "@canton-dark/api-contracts";
import {
  classifyFactLocation,
  evaluateVenueConfiguration,
  type FactCategory,
  type VenueConfiguration,
  type VenueConfigurationDraft
} from "@canton-dark/domain-core";
import type { VenueHealthReadModel } from "@canton-dark/query-models";

const factCatalog: readonly { category: FactCategory; label: string }[] = [
  { category: "shared-rfq-state", label: "Shared RFQ state" },
  { category: "query-cache", label: "Operator query cache" },
  { category: "local-analytics", label: "Operator analytics" },
  { category: "ui-state", label: "Transient UI state" }
];

const projectFacts = (location: "off-ledger" | "on-ledger"): string[] =>
  factCatalog
    .filter((item) => classifyFactLocation(item.category) === location)
    .map((item) => item.label);

const buildDetail = (
  configuration: Pick<VenueConfiguration, "dealers" | "operatorId">,
  violationCount: number
): string =>
  violationCount === 0
    ? `Operator ${configuration.operatorId} has ${configuration.dealers.length} directed dealer configuration(s).`
    : `${violationCount} venue policy issue(s) require remediation before launch.`;

export const buildVenueHealthReadModel = (draft: VenueConfigurationDraft): VenueHealthReadModel => {
  const decision = evaluateVenueConfiguration(draft);

  return {
    title: `${decision.normalized.mode} bootstrap`,
    status: decision.isValid ? "healthy" : "rejected",
    detail: buildDetail(decision.normalized, decision.violations.length),
    summary: {
      mode: decision.normalized.mode,
      operatorId: decision.normalized.operatorId,
      dealers: decision.normalized.dealers,
      ledgerFacts: projectFacts("on-ledger"),
      offLedgerFacts: projectFacts("off-ledger")
    },
    violations: decision.violations.map((violation) => `${violation.code}: ${violation.message}`)
  };
};

export const buildVenueHealthResponse = (
  draft: VenueConfigurationDraft,
  now: () => Date = () => new Date()
): HealthResponse => ({
  service: "venue-api",
  generatedAt: now().toISOString(),
  venue: buildVenueHealthReadModel(draft)
});
