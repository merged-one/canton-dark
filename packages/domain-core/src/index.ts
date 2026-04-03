export type PairMode = "ATSPair" | "SingleDealerPair";
export type VenueMode = PairMode;

export type ParticipantRole =
  | "auditor"
  | "dealer"
  | "operator"
  | "settlement_delegate"
  | "subscriber";

export type Entitlement =
  | "accept_quote"
  | "approve_pair"
  | "manage_access"
  | "pause_pair"
  | "progress_settlement"
  | "respond_quote"
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
  dealerId: string;
  mode: "SingleDealerPair";
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

export type RFQSide = "buy" | "sell";

export type RFQSessionStatus =
  | "accepted"
  | "cancelled"
  | "open"
  | "quote_expired"
  | "quoted"
  | "rejected";

export type RFQSession = {
  acceptedQuoteId?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  createdAt: string;
  dealerId: string;
  instrumentId: string;
  pairId: string;
  quantity: number;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  rfqId: string;
  side: RFQSide;
  status: RFQSessionStatus;
  subscriberId: string;
  updatedAt: string;
};

export type DealerQuoteStatus = "accepted" | "expired" | "open";

export type DealerQuote = {
  acceptedAt?: string;
  acceptedBy?: string;
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  pairId: string;
  price: number;
  quantity: number;
  quoteId: string;
  rfqId: string;
  status: DealerQuoteStatus;
  subscriberId: string;
  updatedAt: string;
};

export type ExecutionTicket = {
  acceptedAt: string;
  dealerId: string;
  executionId: string;
  instrumentId: string;
  pairId: string;
  price: number;
  quantity: number;
  quoteId: string;
  rfqId: string;
  side: RFQSide;
  subscriberId: string;
};

export type SettlementStatus = "affirmed" | "failed" | "instructed" | "pending" | "settled";

export type SettlementInstruction = {
  createdAt: string;
  executionId: string;
  instructionId: string;
  pairId: string;
  status: SettlementStatus;
  updatedAt: string;
};

export type AuditRecord = {
  action: string;
  actorId: string;
  at: string;
  detail: string;
  entityId?: string;
  pairId: string;
};

export type DomainErrorCode =
  | "EMPTY_IDENTIFIER"
  | "INVALID_PAUSE_REASON"
  | "INVALID_QUOTE_EXPIRY"
  | "INVALID_QUOTE_PRICE"
  | "INVALID_QUOTE_QUANTITY"
  | "INVALID_RFQ_QUANTITY"
  | "INVALID_RULEBOOK_RELEASE"
  | "INVALID_SETTLEMENT_TRANSITION"
  | "MISSING_ENTITLEMENT"
  | "PAIR_APPROVAL_REQUIRED"
  | "PAIR_IS_PAUSED"
  | "PAIR_OPERATOR_REQUIRED"
  | "PAIR_REGULATORY_ATTESTATION_REQUIRED"
  | "QUOTE_ALREADY_ACCEPTED"
  | "QUOTE_EXPIRED"
  | "QUOTE_NOT_OPEN"
  | "RFQ_DEALER_MISMATCH"
  | "RFQ_NOT_OPEN"
  | "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER";

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
  dealerId: string;
  mode: "SingleDealerPair";
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

export type CreateRfqSessionInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  instrumentId: string;
  pair: PairInstance;
  quantity: number;
  rfqId: string;
  side: RFQSide;
  subscriberId: string;
};

export type CreateDealerQuoteInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  pair: PairInstance;
  price: number;
  quantity: number;
  quoteId: string;
  rfq: RFQSession;
};

export type AcceptDealerQuoteInput = {
  acceptedAt: string;
  acceptedBy: string;
  accessGrants: readonly AccessGrant[];
  executionId: string;
  instructionId: string;
  pair: PairInstance;
  quote: DealerQuote;
  rfq: RFQSession;
};

export type AcceptDealerQuoteResult = {
  executionTicket: ExecutionTicket;
  quote: DealerQuote;
  rfq: RFQSession;
  settlementInstruction: SettlementInstruction;
};

export type RejectRfqSessionInput = {
  rejectedAt: string;
  rejectedBy: string;
  reason?: string;
  rfq: RFQSession;
};

const entitlementCatalog = [
  "accept_quote",
  "approve_pair",
  "manage_access",
  "pause_pair",
  "progress_settlement",
  "respond_quote",
  "submit_rfq",
  "view_audit",
  "view_pair"
] as const satisfies readonly Entitlement[];

const roleEntitlementCatalog = {
  operator: [
    "approve_pair",
    "manage_access",
    "pause_pair",
    "progress_settlement",
    "view_audit",
    "view_pair"
  ],
  dealer: ["respond_quote", "view_pair"],
  subscriber: ["accept_quote", "submit_rfq", "view_pair"],
  settlement_delegate: ["progress_settlement", "view_pair"],
  auditor: ["view_audit", "view_pair"]
} as const satisfies Record<ParticipantRole, readonly Entitlement[]>;

const settlementTransitions: Record<SettlementStatus, readonly SettlementStatus[]> = {
  pending: ["affirmed", "failed"],
  affirmed: ["instructed", "failed"],
  instructed: ["settled", "failed"],
  settled: [],
  failed: []
};

const normalizeString = (value: string): string => value.trim();

const normalizeTimestamp = (value: string, field: string): string =>
  assertNonEmpty(value, "EMPTY_IDENTIFIER", `${field} is required.`, { field });

const normalizeOptionalNote = (value?: string): string | undefined => {
  const normalized = value?.trim();

  return normalized === undefined || normalized === "" ? undefined : normalized;
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

const assertPositiveNumber = (
  value: number,
  code: DomainErrorCode,
  message: string,
  context: Readonly<Record<string, unknown>>
): void => {
  assertInvariant(Number.isFinite(value) && value > 0, code, message, context);
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
  changedAt: string
): PauseState => {
  if (pauseState === undefined) {
    return {
      state: "active",
      changedAt,
      changedBy: operatorId
    };
  }

  const normalizedChangedAt = normalizeTimestamp(pauseState.changedAt, "pauseState.changedAt");
  const changedBy = assertNonEmpty(
    pauseState.changedBy,
    "EMPTY_IDENTIFIER",
    "pauseState.changedBy is required.",
    { field: "pauseState.changedBy" }
  );

  if (pauseState.state === "paused") {
    return {
      state: "paused",
      changedAt: normalizedChangedAt,
      changedBy,
      reason: assertNonEmpty(
        pauseState.reason,
        "INVALID_PAUSE_REASON",
        "Paused pairs must include a reason.",
        { field: "pauseState.reason" }
      )
    };
  }

  return {
    state: "active",
    changedAt: normalizedChangedAt,
    changedBy
  };
};

const toMillis = (value: string, code: DomainErrorCode, field: string): number => {
  const millis = Date.parse(value);

  assertInvariant(Number.isFinite(millis), code, `${field} must be a valid ISO timestamp.`, {
    field,
    value
  });

  return millis;
};

export const getRoleEntitlements = (role: ParticipantRole): readonly Entitlement[] =>
  roleEntitlementCatalog[role];

export const createPairInstance = (input: CreatePairInstanceInput): PairInstance => {
  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");
  const pairId = assertNonEmpty(input.pairId, "EMPTY_IDENTIFIER", "pairId is required.", {
    field: "pairId"
  });
  const operatorId = assertNonEmpty(
    input.operatorId,
    "PAIR_OPERATOR_REQUIRED",
    "Each pair must identify the owning operator.",
    { field: "operatorId" }
  );
  const dealerId = assertNonEmpty(
    input.dealerId,
    "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
    "SingleDealerPair venues must bind exactly one dealer.",
    { field: "dealerId" }
  );
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

  return {
    pairId,
    mode: "SingleDealerPair",
    operatorId,
    dealerId,
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
  [
    ...new Set(
      grants
        .filter((grant) => grant.subjectId === subjectId && isGrantActive(grant))
        .flatMap((grant) => grant.entitlements)
    )
  ].sort((left, right) => left.localeCompare(right));

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

export const assertPairActive = (pair: PairInstance): void => {
  if (pair.pauseState.state === "paused") {
    throw createDomainError(
      "PAIR_IS_PAUSED",
      "Trading commands are unavailable while the pair is paused.",
      { pairId: pair.pairId, reason: pair.pauseState.reason }
    );
  }
};

export const createRfqSession = (input: CreateRfqSessionInput): RFQSession => {
  assertPairActive(input.pair);

  const subscriberId = assertNonEmpty(
    input.subscriberId,
    "EMPTY_IDENTIFIER",
    "subscriberId is required.",
    { field: "subscriberId" }
  );

  assertInvariant(
    hasEntitlement(subscriberId, input.accessGrants, "submit_rfq"),
    "MISSING_ENTITLEMENT",
    "The subscriber does not hold submit_rfq permission for this pair.",
    { pairId: input.pair.pairId, subscriberId }
  );
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
    dealerId: input.pair.dealerId,
    subscriberId,
    instrumentId: assertNonEmpty(
      input.instrumentId,
      "EMPTY_IDENTIFIER",
      "instrumentId is required.",
      { field: "instrumentId" }
    ),
    side: input.side,
    quantity: input.quantity,
    createdAt: normalizeTimestamp(input.createdAt, "createdAt"),
    updatedAt: normalizeTimestamp(input.createdAt, "createdAt"),
    status: "open"
  };
};

export const cancelRfqSession = (
  rfq: RFQSession,
  cancelledAt: string,
  cancelledBy: string
): RFQSession => {
  if (rfq.status === "cancelled") {
    return rfq;
  }

  assertInvariant(
    rfq.status === "open" || rfq.status === "quote_expired",
    "RFQ_NOT_OPEN",
    "Only open or quote-expired RFQs may be cancelled.",
    { rfqId: rfq.rfqId, status: rfq.status }
  );

  return {
    ...rfq,
    status: "cancelled",
    updatedAt: normalizeTimestamp(cancelledAt, "cancelledAt"),
    cancelledAt: normalizeTimestamp(cancelledAt, "cancelledAt"),
    cancelledBy: assertNonEmpty(cancelledBy, "EMPTY_IDENTIFIER", "cancelledBy is required.", {
      field: "cancelledBy"
    })
  };
};

export const rejectRfqSession = (input: RejectRfqSessionInput): RFQSession => {
  if (input.rfq.status === "rejected") {
    return input.rfq;
  }

  assertInvariant(input.rfq.status === "open", "RFQ_NOT_OPEN", "Only open RFQs may be rejected.", {
    rfqId: input.rfq.rfqId,
    status: input.rfq.status
  });
  assertInvariant(
    input.rfq.dealerId === normalizeString(input.rejectedBy),
    "RFQ_DEALER_MISMATCH",
    "Only the bound dealer may reject this RFQ.",
    { dealerId: input.rfq.dealerId, rejectedBy: input.rejectedBy }
  );

  const rejectionReason = normalizeOptionalNote(input.reason);

  return {
    ...input.rfq,
    status: "rejected",
    updatedAt: normalizeTimestamp(input.rejectedAt, "rejectedAt"),
    rejectedAt: normalizeTimestamp(input.rejectedAt, "rejectedAt"),
    rejectedBy: assertNonEmpty(input.rejectedBy, "EMPTY_IDENTIFIER", "rejectedBy is required.", {
      field: "rejectedBy"
    }),
    ...(rejectionReason !== undefined ? { rejectionReason } : {})
  };
};

export const markRfqQuoted = (rfq: RFQSession, updatedAt: string): RFQSession => {
  if (rfq.status === "quoted") {
    return rfq;
  }

  assertInvariant(
    rfq.status === "open",
    "RFQ_NOT_OPEN",
    "Only open RFQs may receive a dealer quote.",
    { rfqId: rfq.rfqId, status: rfq.status }
  );

  return {
    ...rfq,
    status: "quoted",
    updatedAt: normalizeTimestamp(updatedAt, "updatedAt")
  };
};

export const markRfqQuoteExpired = (rfq: RFQSession, updatedAt: string): RFQSession => {
  if (rfq.status === "quote_expired") {
    return rfq;
  }

  assertInvariant(
    rfq.status === "quoted",
    "RFQ_NOT_OPEN",
    "Only quoted RFQs may transition into quote_expired.",
    { rfqId: rfq.rfqId, status: rfq.status }
  );

  return {
    ...rfq,
    status: "quote_expired",
    updatedAt: normalizeTimestamp(updatedAt, "updatedAt")
  };
};

export const createDealerQuote = (input: CreateDealerQuoteInput): DealerQuote => {
  assertPairActive(input.pair);

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
    input.rfq.status === "open",
    "RFQ_NOT_OPEN",
    "Quotes may only be submitted against open RFQs.",
    { rfqId: input.rfq.rfqId, status: input.rfq.status }
  );
  assertInvariant(
    input.rfq.dealerId === dealerId && input.pair.dealerId === dealerId,
    "RFQ_DEALER_MISMATCH",
    "Quotes must come from the dealer bound to the pair and RFQ.",
    {
      dealerId,
      pairDealerId: input.pair.dealerId,
      rfqDealerId: input.rfq.dealerId
    }
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

  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");
  const expiresAt = normalizeTimestamp(input.expiresAt, "expiresAt");
  const createdAtMillis = toMillis(createdAt, "INVALID_QUOTE_EXPIRY", "createdAt");
  const expiresAtMillis = toMillis(expiresAt, "INVALID_QUOTE_EXPIRY", "expiresAt");

  assertInvariant(
    expiresAtMillis > createdAtMillis,
    "INVALID_QUOTE_EXPIRY",
    "Quote expiry must be later than quote creation time.",
    { createdAt, expiresAt }
  );

  return {
    quoteId: assertNonEmpty(input.quoteId, "EMPTY_IDENTIFIER", "quoteId is required.", {
      field: "quoteId"
    }),
    pairId: input.pair.pairId,
    rfqId: input.rfq.rfqId,
    dealerId,
    subscriberId: input.rfq.subscriberId,
    price: input.price,
    quantity: input.quantity,
    createdAt,
    expiresAt,
    updatedAt: createdAt,
    status: "open"
  };
};

export const expireDealerQuote = (quote: DealerQuote, observedAt: string): DealerQuote => {
  if (quote.status === "accepted" || quote.status === "expired") {
    return quote;
  }

  const observedAtMillis = toMillis(
    normalizeTimestamp(observedAt, "observedAt"),
    "INVALID_QUOTE_EXPIRY",
    "observedAt"
  );
  const expiresAtMillis = toMillis(quote.expiresAt, "INVALID_QUOTE_EXPIRY", "expiresAt");

  if (observedAtMillis < expiresAtMillis) {
    return quote;
  }

  return {
    ...quote,
    status: "expired",
    updatedAt: normalizeTimestamp(observedAt, "observedAt")
  };
};

export const acceptDealerQuote = (input: AcceptDealerQuoteInput): AcceptDealerQuoteResult => {
  assertPairActive(input.pair);

  const acceptedBy = assertNonEmpty(
    input.acceptedBy,
    "EMPTY_IDENTIFIER",
    "acceptedBy is required.",
    { field: "acceptedBy" }
  );

  assertInvariant(
    hasEntitlement(acceptedBy, input.accessGrants, "accept_quote"),
    "MISSING_ENTITLEMENT",
    "The actor does not hold accept_quote permission for this pair.",
    { acceptedBy, pairId: input.pair.pairId }
  );
  assertInvariant(
    input.rfq.subscriberId === acceptedBy,
    "MISSING_ENTITLEMENT",
    "Only the RFQ subscriber may accept the quote.",
    { acceptedBy, subscriberId: input.rfq.subscriberId }
  );
  assertInvariant(
    input.quote.status !== "accepted" && input.rfq.acceptedQuoteId === undefined,
    "QUOTE_ALREADY_ACCEPTED",
    "A dealer quote cannot be accepted twice.",
    {
      quoteId: input.quote.quoteId,
      acceptedQuoteId: input.rfq.acceptedQuoteId
    }
  );
  assertInvariant(
    input.quote.status === "open",
    "QUOTE_NOT_OPEN",
    "Only open dealer quotes may be accepted.",
    { quoteId: input.quote.quoteId, status: input.quote.status }
  );
  assertInvariant(
    input.rfq.status === "quoted",
    "RFQ_NOT_OPEN",
    "Only quoted RFQs may accept a dealer quote.",
    { rfqId: input.rfq.rfqId, status: input.rfq.status }
  );

  const acceptedAt = normalizeTimestamp(input.acceptedAt, "acceptedAt");
  const acceptedAtMillis = toMillis(acceptedAt, "INVALID_QUOTE_EXPIRY", "acceptedAt");
  const expiresAtMillis = toMillis(input.quote.expiresAt, "INVALID_QUOTE_EXPIRY", "expiresAt");

  assertInvariant(
    acceptedAtMillis < expiresAtMillis,
    "QUOTE_EXPIRED",
    "Dealer quotes must be accepted before expiry.",
    { acceptedAt, expiresAt: input.quote.expiresAt }
  );

  const rfq: RFQSession = {
    ...input.rfq,
    status: "accepted",
    acceptedQuoteId: input.quote.quoteId,
    updatedAt: acceptedAt
  };

  const quote: DealerQuote = {
    ...input.quote,
    status: "accepted",
    acceptedAt,
    acceptedBy,
    updatedAt: acceptedAt
  };

  return {
    rfq,
    quote,
    executionTicket: {
      executionId: assertNonEmpty(
        input.executionId,
        "EMPTY_IDENTIFIER",
        "executionId is required.",
        { field: "executionId" }
      ),
      pairId: input.pair.pairId,
      rfqId: input.rfq.rfqId,
      quoteId: input.quote.quoteId,
      dealerId: input.quote.dealerId,
      subscriberId: input.rfq.subscriberId,
      instrumentId: input.rfq.instrumentId,
      side: input.rfq.side,
      quantity: input.quote.quantity,
      price: input.quote.price,
      acceptedAt
    },
    settlementInstruction: {
      instructionId: assertNonEmpty(
        input.instructionId,
        "EMPTY_IDENTIFIER",
        "instructionId is required.",
        { field: "instructionId" }
      ),
      pairId: input.pair.pairId,
      executionId: assertNonEmpty(
        input.executionId,
        "EMPTY_IDENTIFIER",
        "executionId is required.",
        { field: "executionId" }
      ),
      status: "pending",
      createdAt: acceptedAt,
      updatedAt: acceptedAt
    }
  };
};

export const progressSettlementInstruction = (
  instruction: SettlementInstruction,
  nextStatus: SettlementStatus,
  updatedAt: string
): SettlementInstruction => {
  if (instruction.status === nextStatus) {
    return instruction;
  }

  assertInvariant(
    settlementTransitions[instruction.status].includes(nextStatus),
    "INVALID_SETTLEMENT_TRANSITION",
    "The requested settlement transition is not allowed.",
    { from: instruction.status, to: nextStatus }
  );

  return {
    ...instruction,
    status: nextStatus,
    updatedAt: normalizeTimestamp(updatedAt, "updatedAt")
  };
};
