export type FactCategory = "local-analytics" | "query-cache" | "shared-rfq-state" | "ui-state";
export type FactLocation = "off-ledger" | "on-ledger";
export type VenueMode = "ATSPair" | "SingleDealerPair";

export type RuleViolationCode =
  | "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER"
  | "DISALLOWED_USER_FACING_TERM"
  | "OPERATOR_ID_REQUIRED"
  | "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER";

export type RuleViolation = {
  code: RuleViolationCode;
  message: string;
};

export type VenueConfigurationDraft = {
  dealers: string[];
  marketingLabel: string;
  mode: VenueMode;
  operatorId: string;
};

export type VenueConfiguration = {
  dealers: readonly string[];
  marketingLabel: string;
  mode: VenueMode;
  operatorId: string;
};

export type VenuePolicyDecision = {
  isValid: boolean;
  normalized: VenueConfiguration;
  violations: RuleViolation[];
};

const disallowedUserFacingTerms = ["exchange", "stock market"];

const normalizeDealers = (dealers: string[]): string[] =>
  [...new Set(dealers.map((dealer) => dealer.trim()).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

export const isUserFacingLabelAllowed = (label: string): boolean => {
  const normalizedLabel = label.trim().toLowerCase();

  return !disallowedUserFacingTerms.some((term) => normalizedLabel.includes(term));
};

export const evaluateVenueConfiguration = (draft: VenueConfigurationDraft): VenuePolicyDecision => {
  const normalized: VenueConfiguration = {
    mode: draft.mode,
    operatorId: draft.operatorId.trim(),
    dealers: normalizeDealers(draft.dealers),
    marketingLabel: draft.marketingLabel.trim()
  };
  const violations: RuleViolation[] = [];

  if (!normalized.operatorId) {
    violations.push({
      code: "OPERATOR_ID_REQUIRED",
      message: "Each venue configuration must identify the owning operator."
    });
  }

  if (!isUserFacingLabelAllowed(normalized.marketingLabel)) {
    violations.push({
      code: "DISALLOWED_USER_FACING_TERM",
      message: "User-facing labels must avoid the terms 'exchange' and 'stock market'."
    });
  }

  if (normalized.mode === "SingleDealerPair" && normalized.dealers.length !== 1) {
    violations.push({
      code: "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      message: "SingleDealerPair venues must configure exactly one dealer."
    });
  }

  if (normalized.mode === "ATSPair" && normalized.dealers.length === 0) {
    violations.push({
      code: "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER",
      message: "ATSPair venues must configure at least one directed dealer."
    });
  }

  return {
    isValid: violations.length === 0,
    normalized,
    violations
  };
};

export const classifyFactLocation = (category: FactCategory): FactLocation => {
  switch (category) {
    case "shared-rfq-state":
      return "on-ledger";
    case "local-analytics":
    case "query-cache":
    case "ui-state":
      return "off-ledger";
  }
};
