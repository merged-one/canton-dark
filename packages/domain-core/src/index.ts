export type PairMode = "ATSPair" | "SingleDealerPair";
export type VenueMode = PairMode;

export type FactCategory =
  | "local-analytics"
  | "query-cache"
  | "shared-execution-state"
  | "shared-rfq-state"
  | "telemetry-projection"
  | "ui-state";
export type FactLocation = "off-ledger" | "on-ledger";

export type ParticipantRole =
  | "auditor"
  | "dealer"
  | "operator"
  | "settlement_delegate"
  | "subscriber";

export type Entitlement =
  | "approve_pair"
  | "confirm_settlement"
  | "manage_access"
  | "pause_pair"
  | "propose_match"
  | "respond_quote"
  | "submit_dark_order"
  | "submit_rfq"
  | "view_audit"
  | "view_pair";

export type PauseState =
  | {
      changedAt: string;
      changedBy: string;
      state: "active";
    }
  | {
      changedAt: string;
      changedBy: string;
      reason: string;
      state: "paused";
    };

export type OperatorApproval = {
  approvedAt: string;
  approvedBy: string;
  note?: string;
  status: "approved" | "rejected";
};

export type RegulatoryAttestation = {
  attestedAt: string;
  attestedBy: string;
  jurisdiction: string;
  status: "attested" | "expired";
};

export type RulebookRelease = {
  effectiveAt: string;
  publishedBy: string;
  releaseId: string;
  summary: string;
  version: string;
};

export type PairInstance = {
  createdAt: string;
  dealers: readonly string[];
  mode: PairMode;
  operatorApproval: OperatorApproval;
  operatorId: string;
  pairId: string;
  pauseState: PauseState;
  regulatoryAttestation: RegulatoryAttestation;
  rulebookRelease: RulebookRelease;
  updatedAt: string;
};

export type AccessGrant = {
  entitlements: readonly Entitlement[];
  grantId: string;
  grantedAt: string;
  grantedBy: string;
  note?: string;
  pairId: string;
  revokedAt?: string;
  revokedBy?: string;
  role: ParticipantRole;
  subjectId: string;
};

export type RFQ = {
  createdAt: string;
  directedDealerIds: readonly string[];
  expiresAt: string;
  instrumentId: string;
  pairId: string;
  quantity: number;
  requesterId: string;
  rfqId: string;
  side: "buy" | "sell";
  status: "cancelled" | "executed" | "expired" | "open" | "quoted";
};

export type Quote = {
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  pairId: string;
  price: number;
  quantity: number;
  quoteId: string;
  rfqId: string;
  status: "accepted" | "active" | "expired" | "rejected";
};

export type SettlementStatus = "affirmed" | "failed" | "pending" | "settled";

export type Execution = {
  buyerId: string;
  createdAt: string;
  executionId: string;
  matchProposalId?: string;
  pairId: string;
  price: number;
  quantity: number;
  quoteId?: string;
  sellerId: string;
  settlementStatus: SettlementStatus;
  source: "dark-match" | "rfq";
};

export type DarkOrder = {
  createdAt: string;
  limitPrice: number;
  orderId: string;
  pairId: string;
  participantId: string;
  quantity: number;
  side: "buy" | "sell";
  status: "cancelled" | "executed" | "matched" | "resting";
};

export type MatchStatus = "approved" | "executed" | "proposed" | "rejected";

export type MatchProposal = {
  buyOrderId: string;
  createdAt: string;
  pairId: string;
  proposalId: string;
  proposedPrice: number;
  proposedQuantity: number;
  referencePrice: number;
  sellOrderId: string;
  status: MatchStatus;
};

export type DomainErrorCode =
  | "DARK_ORDER_REQUIRES_ATS_PAIR"
  | "EMPTY_IDENTIFIER"
  | "INVALID_DIRECTED_DEALER"
  | "INVALID_MATCH_PRICE"
  | "INVALID_MATCH_QUANTITY"
  | "INVALID_MATCH_SIDES"
  | "INVALID_ORDER_PRICE"
  | "INVALID_ORDER_QUANTITY"
  | "INVALID_PAUSE_REASON"
  | "INVALID_QUOTE_PRICE"
  | "INVALID_QUOTE_QUANTITY"
  | "INVALID_REFERENCE_PRICE"
  | "INVALID_RFQ_QUANTITY"
  | "INVALID_RULEBOOK_RELEASE"
  | "INVALID_SETTLEMENT_TRANSITION"
  | "MISSING_ENTITLEMENT"
  | "MATCH_REQUIRES_ATS_PAIR"
  | "PAIR_APPROVAL_REQUIRED"
  | "PAIR_IS_PAUSED"
  | "PAIR_OPERATOR_REQUIRED"
  | "PAIR_REGULATORY_ATTESTATION_REQUIRED"
  | "RFQ_DEALER_MISMATCH"
  | "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER"
  | "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly context?: Readonly<Record<string, unknown>>;

  constructor(code: DomainErrorCode, message: string, context?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = "DomainError";
    this.code = code;

    if (context !== undefined) {
      this.context = context;
    }
  }
}

export function createDomainError(
  code: DomainErrorCode,
  message: string,
  context?: Readonly<Record<string, unknown>>
): DomainError {
  return new DomainError(code, message, context);
}

export function assertInvariant(
  condition: boolean,
  code: DomainErrorCode,
  message: string,
  context?: Readonly<Record<string, unknown>>
): asserts condition {
  if (!condition) {
    throw createDomainError(code, message, context);
  }
}

export type CreatePairInstanceInput = {
  createdAt: string;
  dealers: readonly string[];
  mode: PairMode;
  operatorApproval: OperatorApproval;
  operatorId: string;
  pairId: string;
  pauseState?: PauseState;
  regulatoryAttestation: RegulatoryAttestation;
  rulebookRelease: RulebookRelease;
};

export type CreateAccessGrantInput = {
  entitlements?: readonly Entitlement[];
  grantId: string;
  grantedAt: string;
  grantedBy: string;
  note?: string;
  pairId: string;
  role: ParticipantRole;
  subjectId: string;
};

export type SetPairPauseStateInput = {
  changedAt: string;
  changedBy: string;
  reason?: string;
  state: PauseState["state"];
};

export type CreateRfqInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  directedDealerIds: readonly string[];
  expiresAt: string;
  instrumentId: string;
  pair: PairInstance;
  quantity: number;
  requesterId: string;
  rfqId: string;
  side: RFQ["side"];
};

export type CreateQuoteInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  pair: PairInstance;
  price: number;
  quantity: number;
  quoteId: string;
  rfq: RFQ;
};

export type CreateExecutionFromQuoteInput = {
  createdAt: string;
  executionId: string;
  pair: PairInstance;
  quote: Quote;
  rfq: RFQ;
};

export type CreateDarkOrderInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  limitPrice: number;
  orderId: string;
  pair: PairInstance;
  participantId: string;
  quantity: number;
  side: DarkOrder["side"];
};

export type CreateMatchProposalInput = {
  buyOrder: DarkOrder;
  createdAt: string;
  pair: PairInstance;
  proposalId: string;
  proposedPrice: number;
  proposedQuantity: number;
  referencePrice: number;
  sellOrder: DarkOrder;
};

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

const disallowedUserFacingTerms = ["exchange", "stock market"] as const;

const entitlementCatalog = [
  "approve_pair",
  "confirm_settlement",
  "manage_access",
  "pause_pair",
  "propose_match",
  "respond_quote",
  "submit_dark_order",
  "submit_rfq",
  "view_audit",
  "view_pair"
] as const satisfies readonly Entitlement[];

const roleEntitlementCatalog = {
  operator: ["approve_pair", "manage_access", "pause_pair", "view_audit", "view_pair"],
  subscriber: ["submit_dark_order", "submit_rfq", "view_pair"],
  dealer: ["respond_quote", "view_pair"],
  settlement_delegate: ["confirm_settlement", "view_pair"],
  auditor: ["view_audit", "view_pair"]
} as const satisfies Record<ParticipantRole, readonly Entitlement[]>;

const settlementTransitions: Record<SettlementStatus, readonly SettlementStatus[]> = {
  pending: ["affirmed", "failed"],
  affirmed: ["failed", "settled"],
  failed: [],
  settled: []
};

const normalizeString = (value: string): string => value.trim();

const normalizeIdentifiers = (values: readonly string[]): string[] =>
  [...new Set(values.map(normalizeString).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

const normalizeTimestamp = (value: string, field: string): string =>
  assertNonEmpty(value, "EMPTY_IDENTIFIER", `${field} is required.`, { field });

const normalizeOptionalNote = (value?: string): string | undefined => {
  const normalized = value?.trim();

  if (normalized === undefined || normalized === "") {
    return undefined;
  }

  return normalized;
};

const isEntitlement = (value: string): value is Entitlement =>
  entitlementCatalog.includes(value as Entitlement);

const normalizeEntitlements = (
  role: ParticipantRole,
  entitlements: readonly Entitlement[] = []
): Entitlement[] =>
  [...new Set([...roleEntitlementCatalog[role], ...entitlements])]
    .filter(isEntitlement)
    .sort((left, right) => left.localeCompare(right));

const normalizePauseState = (
  pauseState: PauseState | undefined,
  operatorId: string,
  createdAt: string
): PauseState => {
  if (pauseState === undefined) {
    return {
      state: "active",
      changedAt: createdAt,
      changedBy: operatorId
    };
  }

  const changedAt = normalizeTimestamp(pauseState.changedAt, "pauseState.changedAt");
  const changedBy = assertNonEmpty(
    pauseState.changedBy,
    "EMPTY_IDENTIFIER",
    "pauseState.changedBy is required.",
    { field: "pauseState.changedBy" }
  );

  if (pauseState.state === "paused") {
    const reason = assertNonEmpty(
      pauseState.reason,
      "INVALID_PAUSE_REASON",
      "Paused pairs must include a reason.",
      { field: "pauseState.reason" }
    );

    return {
      state: "paused",
      changedAt,
      changedBy,
      reason
    };
  }

  return {
    state: "active",
    changedAt,
    changedBy
  };
};

const assertPositiveNumber = (
  value: number,
  code: DomainErrorCode,
  message: string,
  context: Readonly<Record<string, unknown>>
): void => {
  assertInvariant(Number.isFinite(value) && value > 0, code, message, context);
};

const assertNonEmpty = (
  value: string,
  code: DomainErrorCode,
  message: string,
  context?: Readonly<Record<string, unknown>>
): string => {
  const normalized = normalizeString(value);

  assertInvariant(normalized.length > 0, code, message, context);

  return normalized;
};

const assertPairDealers = (mode: PairMode, dealers: readonly string[]): void => {
  if (mode === "SingleDealerPair") {
    assertInvariant(
      dealers.length === 1,
      "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      "SingleDealerPair venues must configure exactly one dealer.",
      { dealerCount: dealers.length }
    );
    return;
  }

  assertInvariant(
    dealers.length > 0,
    "ATS_PAIR_REQUIRES_AT_LEAST_ONE_DIRECTED_DEALER",
    "ATSPair venues must configure at least one directed dealer.",
    { dealerCount: dealers.length }
  );
};

const assertDirectedDealers = (pair: PairInstance, directedDealerIds: readonly string[]): void => {
  assertPairDealers(pair.mode, directedDealerIds);
  assertInvariant(
    directedDealerIds.every((dealerId) => pair.dealers.includes(dealerId)),
    "INVALID_DIRECTED_DEALER",
    "Directed dealer routing must stay inside the pair's dealer perimeter.",
    {
      directedDealerIds,
      pairDealers: pair.dealers
    }
  );

  if (pair.mode === "SingleDealerPair") {
    assertInvariant(
      directedDealerIds[0] === pair.dealers[0],
      "INVALID_DIRECTED_DEALER",
      "SingleDealerPair RFQs must target the configured dealer.",
      {
        directedDealerIds,
        pairDealers: pair.dealers
      }
    );
  }
};

export const getRoleEntitlements = (role: ParticipantRole): readonly Entitlement[] =>
  roleEntitlementCatalog[role];

export const isUserFacingLabelAllowed = (label: string): boolean => {
  const normalizedLabel = label.trim().toLowerCase();

  return !disallowedUserFacingTerms.some((term) => normalizedLabel.includes(term));
};

export const classifyFactLocation = (category: FactCategory): FactLocation => {
  switch (category) {
    case "shared-execution-state":
    case "shared-rfq-state":
      return "on-ledger";
    case "local-analytics":
    case "query-cache":
    case "telemetry-projection":
    case "ui-state":
      return "off-ledger";
  }
};

export const createPairInstance = (input: CreatePairInstanceInput): PairInstance => {
  const pairId = assertNonEmpty(input.pairId, "EMPTY_IDENTIFIER", "pairId is required.", {
    field: "pairId"
  });
  const operatorId = assertNonEmpty(
    input.operatorId,
    "PAIR_OPERATOR_REQUIRED",
    "Each pair must identify the owning operator.",
    { field: "operatorId" }
  );
  const dealers = normalizeIdentifiers(input.dealers);
  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");
  const approvalNote = normalizeOptionalNote(input.operatorApproval.note);
  const operatorApproval: OperatorApproval = {
    status: input.operatorApproval.status,
    approvedAt: normalizeTimestamp(
      input.operatorApproval.approvedAt,
      "operatorApproval.approvedAt"
    ),
    approvedBy: assertNonEmpty(
      input.operatorApproval.approvedBy,
      "EMPTY_IDENTIFIER",
      "operatorApproval.approvedBy is required.",
      { field: "operatorApproval.approvedBy" }
    ),
    ...(approvalNote !== undefined ? { note: approvalNote } : {})
  };
  const regulatoryAttestation: RegulatoryAttestation = {
    status: input.regulatoryAttestation.status,
    attestedAt: normalizeTimestamp(
      input.regulatoryAttestation.attestedAt,
      "regulatoryAttestation.attestedAt"
    ),
    attestedBy: assertNonEmpty(
      input.regulatoryAttestation.attestedBy,
      "EMPTY_IDENTIFIER",
      "regulatoryAttestation.attestedBy is required.",
      { field: "regulatoryAttestation.attestedBy" }
    ),
    jurisdiction: assertNonEmpty(
      input.regulatoryAttestation.jurisdiction,
      "EMPTY_IDENTIFIER",
      "regulatoryAttestation.jurisdiction is required.",
      { field: "regulatoryAttestation.jurisdiction" }
    )
  };
  const rulebookRelease: RulebookRelease = {
    effectiveAt: normalizeTimestamp(
      input.rulebookRelease.effectiveAt,
      "rulebookRelease.effectiveAt"
    ),
    publishedBy: assertNonEmpty(
      input.rulebookRelease.publishedBy,
      "EMPTY_IDENTIFIER",
      "rulebookRelease.publishedBy is required.",
      { field: "rulebookRelease.publishedBy" }
    ),
    releaseId: assertNonEmpty(
      input.rulebookRelease.releaseId,
      "INVALID_RULEBOOK_RELEASE",
      "rulebookRelease.releaseId is required.",
      { field: "rulebookRelease.releaseId" }
    ),
    summary: assertNonEmpty(
      input.rulebookRelease.summary,
      "INVALID_RULEBOOK_RELEASE",
      "rulebookRelease.summary is required.",
      { field: "rulebookRelease.summary" }
    ),
    version: assertNonEmpty(
      input.rulebookRelease.version,
      "INVALID_RULEBOOK_RELEASE",
      "rulebookRelease.version is required.",
      { field: "rulebookRelease.version" }
    )
  };

  assertInvariant(
    operatorApproval.status === "approved",
    "PAIR_APPROVAL_REQUIRED",
    "Pairs require explicit operator approval before activation.",
    { operatorApproval }
  );
  assertInvariant(
    regulatoryAttestation.status === "attested",
    "PAIR_REGULATORY_ATTESTATION_REQUIRED",
    "Pairs require an active regulatory attestation before activation.",
    { regulatoryAttestation }
  );
  assertPairDealers(input.mode, dealers);

  return {
    pairId,
    operatorId,
    mode: input.mode,
    dealers,
    operatorApproval,
    regulatoryAttestation,
    rulebookRelease,
    createdAt,
    updatedAt: createdAt,
    pauseState: normalizePauseState(input.pauseState, operatorId, createdAt)
  };
};

export const createAccessGrant = (input: CreateAccessGrantInput): AccessGrant => {
  const note = normalizeOptionalNote(input.note);

  return {
    grantId: assertNonEmpty(input.grantId, "EMPTY_IDENTIFIER", "grantId is required.", {
      field: "grantId"
    }),
    pairId: assertNonEmpty(input.pairId, "EMPTY_IDENTIFIER", "pairId is required.", {
      field: "pairId"
    }),
    subjectId: assertNonEmpty(input.subjectId, "EMPTY_IDENTIFIER", "subjectId is required.", {
      field: "subjectId"
    }),
    role: input.role,
    grantedAt: normalizeTimestamp(input.grantedAt, "grantedAt"),
    grantedBy: assertNonEmpty(input.grantedBy, "EMPTY_IDENTIFIER", "grantedBy is required.", {
      field: "grantedBy"
    }),
    entitlements: normalizeEntitlements(input.role, input.entitlements),
    ...(note !== undefined ? { note } : {})
  };
};

export const revokeAccessGrant = (
  grant: AccessGrant,
  revokedAt: string,
  revokedBy: string
): AccessGrant => ({
  ...grant,
  revokedAt: normalizeTimestamp(revokedAt, "revokedAt"),
  revokedBy: assertNonEmpty(revokedBy, "EMPTY_IDENTIFIER", "revokedBy is required.", {
    field: "revokedBy"
  })
});

export const isGrantActive = (grant: AccessGrant): boolean => grant.revokedAt === undefined;

export const resolveEntitlements = (
  subjectId: string,
  grants: readonly AccessGrant[]
): readonly Entitlement[] =>
  normalizeIdentifiers(
    grants
      .filter((grant) => grant.subjectId === subjectId && isGrantActive(grant))
      .flatMap((grant) => [...grant.entitlements])
  ).filter(isEntitlement);

export const hasEntitlement = (
  subjectId: string,
  grants: readonly AccessGrant[],
  entitlement: Entitlement
): boolean => resolveEntitlements(subjectId, grants).includes(entitlement);

export const setPairPauseState = (
  pair: PairInstance,
  input: SetPairPauseStateInput
): PairInstance => ({
  ...pair,
  updatedAt: normalizeTimestamp(input.changedAt, "changedAt"),
  pauseState:
    input.state === "paused"
      ? {
          state: "paused",
          changedAt: normalizeTimestamp(input.changedAt, "changedAt"),
          changedBy: assertNonEmpty(input.changedBy, "EMPTY_IDENTIFIER", "changedBy is required.", {
            field: "changedBy"
          }),
          reason: assertNonEmpty(
            input.reason ?? "",
            "INVALID_PAUSE_REASON",
            "Paused pairs must include a reason.",
            { field: "reason" }
          )
        }
      : {
          state: "active",
          changedAt: normalizeTimestamp(input.changedAt, "changedAt"),
          changedBy: assertNonEmpty(input.changedBy, "EMPTY_IDENTIFIER", "changedBy is required.", {
            field: "changedBy"
          })
        }
});

export const assertTradingAllowed = (pair: PairInstance): void => {
  if (pair.pauseState.state === "paused") {
    throw createDomainError(
      "PAIR_IS_PAUSED",
      "Trading commands are unavailable while the pair is paused.",
      {
        pairId: pair.pairId,
        reason: pair.pauseState.reason
      }
    );
  }
};

export const createRfq = (input: CreateRfqInput): RFQ => {
  assertTradingAllowed(input.pair);
  const requesterId = assertNonEmpty(
    input.requesterId,
    "EMPTY_IDENTIFIER",
    "requesterId is required.",
    { field: "requesterId" }
  );

  assertInvariant(
    hasEntitlement(requesterId, input.accessGrants, "submit_rfq"),
    "MISSING_ENTITLEMENT",
    "The requester does not hold submit_rfq permission for this pair.",
    { requesterId, pairId: input.pair.pairId }
  );

  const directedDealerIds = normalizeIdentifiers(input.directedDealerIds);

  assertDirectedDealers(input.pair, directedDealerIds);
  assertPositiveNumber(
    input.quantity,
    "INVALID_RFQ_QUANTITY",
    "RFQ quantity must be greater than zero.",
    { quantity: input.quantity }
  );

  return {
    rfqId: assertNonEmpty(input.rfqId, "EMPTY_IDENTIFIER", "rfqId is required.", {
      field: "rfqId"
    }),
    pairId: input.pair.pairId,
    requesterId,
    directedDealerIds,
    instrumentId: assertNonEmpty(
      input.instrumentId,
      "EMPTY_IDENTIFIER",
      "instrumentId is required.",
      { field: "instrumentId" }
    ),
    side: input.side,
    quantity: input.quantity,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    expiresAt: normalizeTimestamp(input.expiresAt, "expiresAt"),
    status: "open"
  };
};

export const createQuote = (input: CreateQuoteInput): Quote => {
  assertTradingAllowed(input.pair);
  const dealerId = assertNonEmpty(input.dealerId, "EMPTY_IDENTIFIER", "dealerId is required.", {
    field: "dealerId"
  });

  assertInvariant(
    hasEntitlement(dealerId, input.accessGrants, "respond_quote"),
    "MISSING_ENTITLEMENT",
    "The dealer does not hold respond_quote permission for this pair.",
    { dealerId, pairId: input.pair.pairId }
  );
  assertInvariant(
    input.rfq.directedDealerIds.includes(dealerId),
    "RFQ_DEALER_MISMATCH",
    "Quotes must come from one of the RFQ's directed dealers.",
    { dealerId, directedDealerIds: input.rfq.directedDealerIds }
  );
  assertPositiveNumber(
    input.price,
    "INVALID_QUOTE_PRICE",
    "Quote price must be greater than zero.",
    { price: input.price }
  );
  assertInvariant(
    Number.isFinite(input.quantity) && input.quantity > 0 && input.quantity <= input.rfq.quantity,
    "INVALID_QUOTE_QUANTITY",
    "Quote quantity must be greater than zero and cannot exceed the RFQ quantity.",
    {
      quantity: input.quantity,
      rfqQuantity: input.rfq.quantity
    }
  );

  return {
    quoteId: assertNonEmpty(input.quoteId, "EMPTY_IDENTIFIER", "quoteId is required.", {
      field: "quoteId"
    }),
    rfqId: input.rfq.rfqId,
    pairId: input.pair.pairId,
    dealerId,
    price: input.price,
    quantity: input.quantity,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    expiresAt: normalizeTimestamp(input.expiresAt, "expiresAt"),
    status: "active"
  };
};

export const createExecutionFromQuote = (input: CreateExecutionFromQuoteInput): Execution => {
  assertTradingAllowed(input.pair);

  return {
    executionId: assertNonEmpty(input.executionId, "EMPTY_IDENTIFIER", "executionId is required.", {
      field: "executionId"
    }),
    pairId: input.pair.pairId,
    source: "rfq",
    quoteId: input.quote.quoteId,
    quantity: input.quote.quantity,
    price: input.quote.price,
    buyerId: input.rfq.side === "buy" ? input.rfq.requesterId : input.quote.dealerId,
    sellerId: input.rfq.side === "buy" ? input.quote.dealerId : input.rfq.requesterId,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    settlementStatus: "pending"
  };
};

export const createDarkOrder = (input: CreateDarkOrderInput): DarkOrder => {
  assertInvariant(
    input.pair.mode === "ATSPair",
    "DARK_ORDER_REQUIRES_ATS_PAIR",
    "Dark orders are only available for ATSPair venues.",
    { pairId: input.pair.pairId, mode: input.pair.mode }
  );
  assertTradingAllowed(input.pair);
  const participantId = assertNonEmpty(
    input.participantId,
    "EMPTY_IDENTIFIER",
    "participantId is required.",
    { field: "participantId" }
  );

  assertInvariant(
    hasEntitlement(participantId, input.accessGrants, "submit_dark_order"),
    "MISSING_ENTITLEMENT",
    "The participant does not hold submit_dark_order permission for this pair.",
    { participantId, pairId: input.pair.pairId }
  );
  assertPositiveNumber(
    input.quantity,
    "INVALID_ORDER_QUANTITY",
    "Dark order quantity must be greater than zero.",
    { quantity: input.quantity }
  );
  assertPositiveNumber(
    input.limitPrice,
    "INVALID_ORDER_PRICE",
    "Dark order limit price must be greater than zero.",
    { limitPrice: input.limitPrice }
  );

  return {
    orderId: assertNonEmpty(input.orderId, "EMPTY_IDENTIFIER", "orderId is required.", {
      field: "orderId"
    }),
    pairId: input.pair.pairId,
    participantId,
    side: input.side,
    quantity: input.quantity,
    limitPrice: input.limitPrice,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    status: "resting"
  };
};

export const createMatchProposal = (input: CreateMatchProposalInput): MatchProposal => {
  assertInvariant(
    input.pair.mode === "ATSPair",
    "MATCH_REQUIRES_ATS_PAIR",
    "Match proposals are only available for ATSPair venues.",
    { pairId: input.pair.pairId, mode: input.pair.mode }
  );
  assertTradingAllowed(input.pair);
  assertInvariant(
    input.buyOrder.side === "buy" && input.sellOrder.side === "sell",
    "INVALID_MATCH_SIDES",
    "Match proposals require a buy order and a sell order.",
    {
      buySide: input.buyOrder.side,
      sellSide: input.sellOrder.side
    }
  );
  assertPositiveNumber(
    input.referencePrice,
    "INVALID_REFERENCE_PRICE",
    "Reference price must be greater than zero.",
    { referencePrice: input.referencePrice }
  );
  assertPositiveNumber(
    input.proposedPrice,
    "INVALID_MATCH_PRICE",
    "Proposed match price must be greater than zero.",
    { proposedPrice: input.proposedPrice }
  );
  assertInvariant(
    input.buyOrder.limitPrice >= input.proposedPrice &&
      input.sellOrder.limitPrice <= input.proposedPrice,
    "INVALID_MATCH_PRICE",
    "The proposed match price must respect both order limits.",
    {
      buyLimitPrice: input.buyOrder.limitPrice,
      proposedPrice: input.proposedPrice,
      sellLimitPrice: input.sellOrder.limitPrice
    }
  );
  assertInvariant(
    Number.isFinite(input.proposedQuantity) &&
      input.proposedQuantity > 0 &&
      input.proposedQuantity <= Math.min(input.buyOrder.quantity, input.sellOrder.quantity),
    "INVALID_MATCH_QUANTITY",
    "The proposed match quantity must be greater than zero and fit within both orders.",
    {
      buyQuantity: input.buyOrder.quantity,
      proposedQuantity: input.proposedQuantity,
      sellQuantity: input.sellOrder.quantity
    }
  );

  return {
    proposalId: assertNonEmpty(input.proposalId, "EMPTY_IDENTIFIER", "proposalId is required.", {
      field: "proposalId"
    }),
    pairId: input.pair.pairId,
    buyOrderId: input.buyOrder.orderId,
    sellOrderId: input.sellOrder.orderId,
    proposedPrice: input.proposedPrice,
    proposedQuantity: input.proposedQuantity,
    referencePrice: input.referencePrice,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    status: "proposed"
  };
};

export const transitionSettlementStatus = (
  execution: Execution,
  nextStatus: SettlementStatus
): Execution => {
  if (execution.settlementStatus === nextStatus) {
    return execution;
  }

  assertInvariant(
    settlementTransitions[execution.settlementStatus].includes(nextStatus),
    "INVALID_SETTLEMENT_TRANSITION",
    "The requested settlement transition is not allowed.",
    {
      from: execution.settlementStatus,
      to: nextStatus
    }
  );

  return {
    ...execution,
    settlementStatus: nextStatus
  };
};

export const evaluateVenueConfiguration = (draft: VenueConfigurationDraft): VenuePolicyDecision => {
  const normalized: VenueConfiguration = {
    mode: draft.mode,
    operatorId: normalizeString(draft.operatorId),
    dealers: normalizeIdentifiers(draft.dealers),
    marketingLabel: normalizeString(draft.marketingLabel)
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
