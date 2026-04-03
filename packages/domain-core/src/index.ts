export type PairMode = "ATSPair" | "SingleDealerPair";
export type VenueMode = PairMode;

export type OperatorOversightRole = "blinded" | "full";
export type InviteRevisionPolicy = "before_first_response" | "locked";

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
  dealerIds: readonly string[];
  inviteRevisionPolicy: InviteRevisionPolicy;
  mode: PairMode;
  operatorApproval: OperatorApproval;
  operatorId: string;
  operatorOversightRole: OperatorOversightRole;
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
  currentInvitationVersion?: number;
  dealerId: string;
  firstResponseAt?: string;
  instrumentId: string;
  invitedDealerIds?: readonly string[];
  pairId: string;
  quantity: number;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  responseWindowClosesAt?: string;
  rfqId: string;
  side: RFQSide;
  status: RFQSessionStatus;
  subscriberId: string;
  updatedAt: string;
};

export type DealerInvitationStatus = "expired" | "open" | "responded" | "withdrawn";

export type DealerInvitation = {
  dealerId: string;
  firstQuoteId?: string;
  invitationId: string;
  invitationVersion: number;
  invitedAt: string;
  invitedBy: string;
  pairId: string;
  responseWindowClosesAt: string;
  respondedAt?: string;
  rfqId: string;
  status: DealerInvitationStatus;
  subscriberId: string;
  updatedAt: string;
  withdrawnAt?: string;
  withdrawnBy?: string;
  withdrawalReason?: string;
};

export type DealerQuoteStatus = "accepted" | "expired" | "open" | "stale" | "withdrawn";
export type FirmQuoteStatus = DealerQuoteStatus;
export type StaleQuoteReason = "accepted_elsewhere" | "rejected_all" | "revised";

export type DealerQuote = {
  acceptedAt?: string;
  acceptedBy?: string;
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  pairId: string;
  previousQuoteId?: string;
  price: number;
  quantity: number;
  quoteId: string;
  replacementQuoteId?: string;
  rfqId: string;
  staleReason?: StaleQuoteReason;
  status: DealerQuoteStatus;
  subscriberId: string;
  updatedAt: string;
  withdrawalReason?: string;
  withdrawnAt?: string;
  withdrawnBy?: string;
};

export type FirmQuote = DealerQuote;

export type QuoteRevision = {
  dealerId: string;
  nextQuoteId: string;
  pairId: string;
  previousQuoteId: string;
  revisedAt: string;
  revisedBy: string;
  revisionId: string;
  rfqId: string;
  subscriberId: string;
};

export type QuoteWithdrawal = {
  dealerId: string;
  pairId: string;
  quoteId: string;
  reason?: string;
  rfqId: string;
  subscriberId: string;
  withdrawalId: string;
  withdrawnAt: string;
  withdrawnBy: string;
};

export type DarkOrderStatus = "cancelled" | "executed" | "expired" | "open";

export type DarkOrder = {
  cancelledAt?: string;
  cancelledBy?: string;
  clientOrderId: string;
  createdAt: string;
  executedAt?: string;
  executionId?: string;
  expiresAt?: string;
  instrumentId: string;
  limitPrice: number;
  orderId: string;
  pairId: string;
  quantity: number;
  side: RFQSide;
  status: DarkOrderStatus;
  subscriberId: string;
  updatedAt: string;
};

export type OrderLockStatus = "active" | "expired" | "released";
export type LockReleaseReason = "executed" | "expired" | "rejected";

export type OrderLock = {
  lockExpiresAt: string;
  lockId: string;
  lockedAt: string;
  lockedBy: string;
  orderId: string;
  pairId: string;
  proposalId: string;
  releasedAt?: string;
  releasedBy?: string;
  releaseReason?: LockReleaseReason;
  status: OrderLockStatus;
  subscriberId: string;
  updatedAt: string;
};

export type MatchProposalResponse = "accepted" | "pending" | "rejected";
export type MatchProposalStatus = "accepted" | "executed" | "expired" | "pending" | "rejected";

export type MatchProposal = {
  acceptedAt?: string;
  buyAcceptedAt?: string;
  buyLockId: string;
  buyOrderId: string;
  buyResponse: MatchProposalResponse;
  buySubscriberId: string;
  createdAt: string;
  createdBy: string;
  executionId?: string;
  expiresAt: string;
  instrumentId: string;
  pairId: string;
  price: number;
  proposalId: string;
  quantity: number;
  rejectedAt?: string;
  rejectedBy?: string;
  rejectionReason?: string;
  sellAcceptedAt?: string;
  sellLockId: string;
  sellOrderId: string;
  sellResponse: MatchProposalResponse;
  sellSubscriberId: string;
  status: MatchProposalStatus;
  updatedAt: string;
};

export type RankedQuote = {
  quote: DealerQuote;
  rank: number;
};

export type ExecutionTicket = {
  acceptedAt: string;
  buyOrderId?: string;
  buySubscriberId?: string;
  dealerId?: string;
  executionId: string;
  executionKind?: "dark_cross" | "rfq_quote";
  instrumentId: string;
  matchProposalId?: string;
  pairId: string;
  price: number;
  quantity: number;
  quoteId?: string;
  rfqId?: string;
  sellOrderId?: string;
  sellSubscriberId?: string;
  side?: RFQSide;
  subscriberId?: string;
};

export type SettlementStatus = "affirmed" | "failed" | "instructed" | "pending" | "settled";

export type SettlementInstruction = {
  buyOrderId?: string;
  createdAt: string;
  dealerId?: string;
  executionId: string;
  instructionId: string;
  matchProposalId?: string;
  pairId: string;
  sellOrderId?: string;
  sellSubscriberId?: string;
  status: SettlementStatus;
  subscriberId?: string;
  settlementAgentId?: string;
  settlementKind?: "dark_cross" | "rfq_quote";
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
  | "ATS_PAIR_REQUIRES_MULTIPLE_DEALERS"
  | "DARK_ORDER_ALREADY_TERMINAL"
  | "DARK_ORDER_EXPIRED"
  | "DARK_ORDER_LOCKED"
  | "DARK_ORDER_NOT_OPEN"
  | "DARK_ORDER_SELF_MATCH"
  | "EMPTY_IDENTIFIER"
  | "INVALID_DEALER_SET"
  | "INVALID_INVITATION_DEALER"
  | "INVALID_INVITE_SET"
  | "INVALID_OPERATOR_OVERSIGHT"
  | "INVALID_PAUSE_REASON"
  | "INVALID_DARK_ORDER_PRICE"
  | "INVALID_DARK_ORDER_QUANTITY"
  | "INVALID_LOCK_EXPIRY"
  | "INVALID_MATCH_EXPIRY"
  | "INVALID_QUOTE_EXPIRY"
  | "INVALID_QUOTE_PRICE"
  | "INVALID_QUOTE_QUANTITY"
  | "INVALID_RFQ_QUANTITY"
  | "INVALID_RULEBOOK_RELEASE"
  | "INVALID_SETTLEMENT_TRANSITION"
  | "INVITATION_NOT_OPEN"
  | "INVITATION_REQUIRED"
  | "INVITE_SET_LOCKED"
  | "MATCH_PROPOSAL_NOT_ACCEPTED"
  | "MATCH_PROPOSAL_NOT_PENDING"
  | "MISSING_ENTITLEMENT"
  | "NO_MATCH_CANDIDATE"
  | "ORDER_LOCK_ACTIVE"
  | "ORDER_LOCK_NOT_ACTIVE"
  | "PAIR_APPROVAL_REQUIRED"
  | "PAIR_IS_PAUSED"
  | "PAIR_MODE_MISMATCH"
  | "PAIR_OPERATOR_REQUIRED"
  | "PAIR_REGULATORY_ATTESTATION_REQUIRED"
  | "QUOTE_ALREADY_ACCEPTED"
  | "QUOTE_EXPIRED"
  | "QUOTE_NOT_CURRENT"
  | "QUOTE_NOT_OPEN"
  | "QUOTE_STALE"
  | "QUOTE_WITHDRAWN"
  | "RESPONSE_WINDOW_EXPIRED"
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
  dealerId?: string;
  dealerIds?: readonly string[];
  inviteRevisionPolicy?: InviteRevisionPolicy;
  mode: PairMode;
  operatorApproval: OperatorApproval;
  operatorId: string;
  operatorOversightRole?: OperatorOversightRole;
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
  responseWindowClosesAt?: string;
  rfqId: string;
  side: RFQSide;
  subscriberId: string;
};

export type CreateDealerInvitationsInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  dealerIds: readonly string[];
  invitations: readonly DealerInvitation[];
  invitedBy: string;
  pair: PairInstance;
  rfq: RFQSession;
};

export type CreateDealerInvitationsResult = {
  invitations: readonly DealerInvitation[];
  rfq: RFQSession;
};

export type CreateDealerQuoteInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  dealerId: string;
  existingQuotes?: readonly DealerQuote[];
  expiresAt: string;
  invitations?: readonly DealerInvitation[];
  pair: PairInstance;
  price: number;
  quantity: number;
  quoteId: string;
  rfq: RFQSession;
};

export type ReviseDealerQuoteInput = {
  accessGrants: readonly AccessGrant[];
  createdAt: string;
  dealerId: string;
  existingQuotes?: readonly DealerQuote[];
  expiresAt: string;
  invitations?: readonly DealerInvitation[];
  pair: PairInstance;
  price: number;
  quantity: number;
  quote: DealerQuote;
  quoteId: string;
  revisionId: string;
  rfq: RFQSession;
};

export type ReviseDealerQuoteResult = {
  nextQuote: DealerQuote;
  previousQuote: DealerQuote;
  revision: QuoteRevision;
};

export type WithdrawDealerQuoteInput = {
  dealerId: string;
  pair: PairInstance;
  quote: DealerQuote;
  reason?: string;
  rfq: RFQSession;
  withdrawalId: string;
  withdrawnAt: string;
};

export type WithdrawDealerQuoteResult = {
  quote: DealerQuote;
  withdrawal?: QuoteWithdrawal;
};

export type AcceptDealerQuoteInput = {
  acceptedAt: string;
  acceptedBy: string;
  accessGrants: readonly AccessGrant[];
  executionId: string;
  instructionId: string;
  otherQuotes?: readonly DealerQuote[];
  pair: PairInstance;
  quote: DealerQuote;
  rfq: RFQSession;
};

export type AcceptDealerQuoteResult = {
  executionTicket: ExecutionTicket;
  quote: DealerQuote;
  rfq: RFQSession;
  settlementInstruction: SettlementInstruction;
  staleQuotes: readonly DealerQuote[];
};

export type RejectRfqSessionInput = {
  rejectedAt: string;
  rejectedBy: string;
  reason?: string;
  rfq: RFQSession;
};

export type RejectAllQuotesInput = {
  accessGrants: readonly AccessGrant[];
  quotes: readonly DealerQuote[];
  reason?: string;
  rejectedAt: string;
  rejectedBy: string;
  rfq: RFQSession;
};

export type RejectAllQuotesResult = {
  rfq: RFQSession;
  staleQuotes: readonly DealerQuote[];
};

export type CreateDarkOrderInput = {
  accessGrants: readonly AccessGrant[];
  clientOrderId: string;
  createdAt: string;
  expiresAt?: string;
  instrumentId: string;
  limitPrice: number;
  orderId: string;
  pair: PairInstance;
  quantity: number;
  side: RFQSide;
  subscriberId: string;
};

export type CreateOrderLockInput = {
  lockExpiresAt: string;
  lockId: string;
  lockedAt: string;
  lockedBy: string;
  order: DarkOrder;
  pair: PairInstance;
  proposalId: string;
};

export type ReleaseOrderLockInput = {
  lock: OrderLock;
  releasedAt: string;
  releasedBy: string;
  reason: LockReleaseReason;
};

export type CreateMatchProposalInput = {
  accessGrants: readonly AccessGrant[];
  buyLockId: string;
  buyOrder: DarkOrder;
  createdAt: string;
  createdBy: string;
  expiresAt: string;
  pair: PairInstance;
  proposalId: string;
  sellLockId: string;
  sellOrder: DarkOrder;
};

export type CreateMatchProposalResult = {
  buyLock: OrderLock;
  proposal: MatchProposal;
  sellLock: OrderLock;
};

export type AcceptMatchProposalInput = {
  accessGrants: readonly AccessGrant[];
  acceptedAt: string;
  actorId: string;
  proposal: MatchProposal;
};

export type RejectMatchProposalInput = {
  accessGrants: readonly AccessGrant[];
  actorId: string;
  proposal: MatchProposal;
  reason?: string;
  rejectedAt: string;
};

export type CancelDarkOrderInput = {
  accessGrants: readonly AccessGrant[];
  activeLocks?: readonly OrderLock[];
  cancelledAt: string;
  cancelledBy: string;
  order: DarkOrder;
  pair: PairInstance;
};

export type ExecuteDarkMatchInput = {
  accessGrants: readonly AccessGrant[];
  executedAt: string;
  executionId: string;
  instructionId: string;
  pair: PairInstance;
  proposal: MatchProposal;
  releasedBy: string;
  buyLock: OrderLock;
  buyOrder: DarkOrder;
  sellLock: OrderLock;
  sellOrder: DarkOrder;
};

export type ExecuteDarkMatchResult = {
  buyLock: OrderLock;
  buyOrder: DarkOrder;
  executionTicket: ExecutionTicket;
  proposal: MatchProposal;
  sellLock: OrderLock;
  sellOrder: DarkOrder;
  settlementInstruction: SettlementInstruction;
};

export type SynchronizeDarkCrossLifecycleInput = {
  locks?: readonly OrderLock[];
  observedAt: string;
  orders?: readonly DarkOrder[];
  proposals?: readonly MatchProposal[];
};

export type SynchronizeDarkCrossLifecycleResult = {
  locks: readonly OrderLock[];
  orders: readonly DarkOrder[];
  proposals: readonly MatchProposal[];
};

export type SynchronizeRfqLifecycleInput = {
  invitations?: readonly DealerInvitation[];
  observedAt: string;
  pair: PairInstance;
  quotes?: readonly DealerQuote[];
  rfq: RFQSession;
};

export type SynchronizeRfqLifecycleResult = {
  invitations: readonly DealerInvitation[];
  quotes: readonly DealerQuote[];
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

export const quoteTieBreakRule =
  "Best price, then larger quantity, then earliest quote creation time, then lexicographic quote id.";

export const darkCrossTieBreakRule =
  "Buy priority: higher limit price, then larger quantity, then earliest creation time, then lexicographic order id. Sell priority: lower limit price, then larger quantity, then earliest creation time, then lexicographic order id.";

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

const uniqueSortedStrings = (values: readonly string[]): readonly string[] =>
  [...new Set(values.map((value) => normalizeString(value)).filter(Boolean))].sort((left, right) =>
    left.localeCompare(right)
  );

const normalizeStringList = (
  values: readonly string[],
  code: DomainErrorCode,
  message: string,
  field: string
): readonly string[] => {
  const normalized = uniqueSortedStrings(values);

  assertInvariant(normalized.length > 0, code, message, { field, values });

  return normalized;
};

const equalStringLists = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((value, index) => value === right[index]);

const ensureDealerBoundToPair = (pair: PairInstance, dealerId: string): void => {
  assertInvariant(
    pair.dealerIds.includes(dealerId),
    pair.mode === "SingleDealerPair"
      ? "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER"
      : "INVALID_INVITATION_DEALER",
    pair.mode === "SingleDealerPair"
      ? "SingleDealerPair venues must bind exactly one dealer."
      : `Dealer ${dealerId} is not bound to ATSPair ${pair.pairId}.`,
    {
      dealerId,
      pairId: pair.pairId
    }
  );
};

const resolveRfqInvitedDealerIdsInternal = (rfq: RFQSession): readonly string[] =>
  rfq.invitedDealerIds === undefined ? [rfq.dealerId] : uniqueSortedStrings(rfq.invitedDealerIds);

const isRfqResponseWindowOpen = (rfq: RFQSession, observedAt: string): boolean =>
  rfq.responseWindowClosesAt === undefined
    ? true
    : toMillis(observedAt, "INVALID_QUOTE_EXPIRY", "observedAt") <
      toMillis(rfq.responseWindowClosesAt, "INVALID_QUOTE_EXPIRY", "responseWindowClosesAt");

const matchRfqQuote =
  (rfq: RFQSession) =>
  (quote: DealerQuote): boolean =>
    quote.pairId === rfq.pairId && quote.rfqId === rfq.rfqId;

const matchRfqInvitation =
  (rfq: RFQSession) =>
  (invitation: DealerInvitation): boolean =>
    invitation.pairId === rfq.pairId && invitation.rfqId === rfq.rfqId;

const activeInvitationForDealer = (
  invitations: readonly DealerInvitation[],
  dealerId: string
): DealerInvitation | undefined =>
  invitations.find(
    (invitation) =>
      invitation.dealerId === dealerId &&
      (invitation.status === "open" || invitation.status === "responded")
  );

const markQuoteStale = (
  quote: DealerQuote,
  updatedAt: string,
  reason: StaleQuoteReason,
  replacementQuoteId?: string
): DealerQuote => {
  /* c8 ignore next 3 -- current callers only pass open quotes or short-circuit stale earlier */
  if (quote.status === "stale") {
    return quote;
  }

  assertInvariant(quote.status === "open", "QUOTE_NOT_OPEN", "Only open quotes may become stale.", {
    quoteId: quote.quoteId,
    status: quote.status
  });

  return {
    ...quote,
    status: "stale",
    staleReason: reason,
    updatedAt: normalizeTimestamp(updatedAt, "updatedAt"),
    ...(replacementQuoteId !== undefined ? { replacementQuoteId } : {})
  };
};

export const getRoleEntitlements = (role: ParticipantRole): readonly Entitlement[] =>
  roleEntitlementCatalog[role];

export const listPairDealerIds = (pair: PairInstance): readonly string[] => pair.dealerIds;

export const resolveRfqInvitedDealerIds = (rfq: RFQSession): readonly string[] =>
  resolveRfqInvitedDealerIdsInternal(rfq);

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

  if (input.mode === "SingleDealerPair") {
    const dealerId = assertNonEmpty(
      input.dealerId ?? "",
      "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      "SingleDealerPair venues must bind exactly one dealer.",
      { field: "dealerId" }
    );
    const dealerIds = normalizeStringList(
      input.dealerIds ?? [dealerId],
      "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      "SingleDealerPair venues must bind exactly one dealer.",
      "dealerIds"
    );

    assertInvariant(
      dealerIds.length === 1 && dealerIds[0] === dealerId,
      "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
      "SingleDealerPair venues must bind exactly one dealer.",
      {
        dealerId,
        dealerIds
      }
    );

    return {
      pairId,
      mode: "SingleDealerPair",
      operatorId,
      dealerId,
      dealerIds,
      operatorOversightRole: "full",
      inviteRevisionPolicy: "locked",
      operatorApproval,
      regulatoryAttestation,
      rulebookRelease,
      createdAt,
      updatedAt: createdAt,
      pauseState: normalizePauseState(input.pauseState, operatorId, createdAt)
    };
  }

  const dealerIds = normalizeStringList(
    input.dealerIds ?? [],
    "ATS_PAIR_REQUIRES_MULTIPLE_DEALERS",
    "ATSPair venues must bind at least two dealers.",
    "dealerIds"
  );

  assertInvariant(
    dealerIds.length > 1,
    "ATS_PAIR_REQUIRES_MULTIPLE_DEALERS",
    "ATSPair venues must bind at least two dealers.",
    { dealerIds }
  );
  const [primaryDealerId] = dealerIds;

  assertInvariant(
    primaryDealerId !== undefined,
    "ATS_PAIR_REQUIRES_MULTIPLE_DEALERS",
    "ATSPair venues must bind at least two dealers.",
    { dealerIds }
  );

  const operatorOversightRole = input.operatorOversightRole ?? "full";

  return {
    pairId,
    mode: "ATSPair",
    operatorId,
    dealerId: primaryDealerId,
    dealerIds,
    operatorOversightRole,
    inviteRevisionPolicy: input.inviteRevisionPolicy ?? "before_first_response",
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

  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");
  const nextRfq: RFQSession = {
    rfqId: assertNonEmpty(input.rfqId, "EMPTY_IDENTIFIER", "rfqId is required.", {
      field: "rfqId"
    }),
    pairId: input.pair.pairId,
    dealerId: input.pair.dealerId,
    invitedDealerIds:
      input.pair.mode === "SingleDealerPair" ? [input.pair.dealerId] : ([] as readonly string[]),
    currentInvitationVersion: input.pair.mode === "SingleDealerPair" ? 1 : 0,
    subscriberId,
    instrumentId: assertNonEmpty(
      input.instrumentId,
      "EMPTY_IDENTIFIER",
      "instrumentId is required.",
      { field: "instrumentId" }
    ),
    side: input.side,
    quantity: input.quantity,
    createdAt,
    updatedAt: createdAt,
    status: "open"
  };

  if (input.pair.mode === "ATSPair") {
    const responseWindowClosesAt = normalizeTimestamp(
      input.responseWindowClosesAt ?? "",
      "responseWindowClosesAt"
    );
    const createdAtMillis = toMillis(createdAt, "INVALID_QUOTE_EXPIRY", "createdAt");
    const responseWindowMillis = toMillis(
      responseWindowClosesAt,
      "INVALID_QUOTE_EXPIRY",
      "responseWindowClosesAt"
    );

    assertInvariant(
      responseWindowMillis > createdAtMillis,
      "INVALID_QUOTE_EXPIRY",
      "RFQ response windows must close after RFQ creation.",
      {
        createdAt,
        responseWindowClosesAt
      }
    );

    nextRfq.responseWindowClosesAt = responseWindowClosesAt;
  }

  return nextRfq;
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
    rfq.status === "open" || rfq.status === "quote_expired",
    "RFQ_NOT_OPEN",
    "Only open RFQs may receive a dealer quote.",
    { rfqId: rfq.rfqId, status: rfq.status }
  );

  return {
    ...rfq,
    status: "quoted",
    firstResponseAt: rfq.firstResponseAt ?? normalizeTimestamp(updatedAt, "updatedAt"),
    updatedAt: normalizeTimestamp(updatedAt, "updatedAt")
  };
};

export const markRfqQuoteExpired = (rfq: RFQSession, updatedAt: string): RFQSession => {
  if (rfq.status === "quote_expired") {
    return rfq;
  }

  assertInvariant(
    rfq.status === "quoted" || rfq.status === "open",
    "RFQ_NOT_OPEN",
    "Only open or quoted RFQs may transition into quote_expired.",
    { rfqId: rfq.rfqId, status: rfq.status }
  );

  return {
    ...rfq,
    status: "quote_expired",
    updatedAt: normalizeTimestamp(updatedAt, "updatedAt")
  };
};

export const createDealerInvitations = (
  input: CreateDealerInvitationsInput
): CreateDealerInvitationsResult => {
  assertPairActive(input.pair);
  assertInvariant(
    input.pair.mode === "ATSPair",
    "PAIR_MODE_MISMATCH",
    "Dealer invitations are only valid for ATSPair venues.",
    { pairId: input.pair.pairId, mode: input.pair.mode }
  );

  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");

  assertInvariant(
    isRfqResponseWindowOpen(input.rfq, createdAt),
    "RESPONSE_WINDOW_EXPIRED",
    "Dealer invitations may only be changed before the RFQ response window closes.",
    {
      pairId: input.pair.pairId,
      responseWindowClosesAt: input.rfq.responseWindowClosesAt,
      rfqId: input.rfq.rfqId
    }
  );

  const requestedDealerIds = normalizeStringList(
    input.dealerIds,
    "INVALID_INVITE_SET",
    "ATSPair RFQs must invite at least one dealer.",
    "dealerIds"
  );
  const existingInvitations = input.invitations.filter(matchRfqInvitation(input.rfq));
  const currentActiveDealerIds = uniqueSortedStrings(
    existingInvitations
      .filter((invitation) => invitation.status === "open" || invitation.status === "responded")
      .map((invitation) => invitation.dealerId)
  );

  for (const dealerId of requestedDealerIds) {
    ensureDealerBoundToPair(input.pair, dealerId);
    assertInvariant(
      hasEntitlement(dealerId, input.accessGrants, "respond_quote"),
      "MISSING_ENTITLEMENT",
      `Dealer ${dealerId} does not hold respond_quote permission for pair ${input.pair.pairId}.`,
      {
        dealerId,
        pairId: input.pair.pairId
      }
    );
  }

  if (input.rfq.firstResponseAt !== undefined || input.pair.inviteRevisionPolicy === "locked") {
    assertInvariant(
      equalStringLists(currentActiveDealerIds, requestedDealerIds),
      "INVITE_SET_LOCKED",
      "The invite set cannot be changed after the first response or when policy locks it.",
      {
        currentActiveDealerIds,
        requestedDealerIds,
        rfqId: input.rfq.rfqId
      }
    );

    return {
      rfq: {
        ...input.rfq,
        invitedDealerIds: requestedDealerIds,
        currentInvitationVersion: input.rfq.currentInvitationVersion ?? 1
      },
      invitations: existingInvitations
    };
  }

  if (equalStringLists(currentActiveDealerIds, requestedDealerIds)) {
    return {
      rfq: {
        ...input.rfq,
        invitedDealerIds: requestedDealerIds,
        currentInvitationVersion: input.rfq.currentInvitationVersion ?? 1
      },
      invitations: existingInvitations
    };
  }

  const nextVersion = Math.max(input.rfq.currentInvitationVersion ?? 0, 0) + 1;
  const retained = new Set(requestedDealerIds);
  const updatedInvitations = existingInvitations.map((invitation) =>
    invitation.status === "open" && !retained.has(invitation.dealerId)
      ? {
          ...invitation,
          status: "withdrawn" as const,
          updatedAt: createdAt,
          withdrawnAt: createdAt,
          withdrawnBy: assertNonEmpty(
            input.invitedBy,
            "EMPTY_IDENTIFIER",
            "invitedBy is required.",
            { field: "invitedBy" }
          ),
          withdrawalReason: "Removed from directed invite set."
        }
      : invitation
  );
  const existingDealerIds = new Set(updatedInvitations.map((invitation) => invitation.dealerId));
  const newInvitations = requestedDealerIds
    .filter((dealerId) => !existingDealerIds.has(dealerId))
    .map<DealerInvitation>((dealerId) => ({
      invitationId: `${input.rfq.rfqId}:${dealerId}:${nextVersion}`,
      pairId: input.pair.pairId,
      rfqId: input.rfq.rfqId,
      dealerId,
      subscriberId: input.rfq.subscriberId,
      invitedAt: createdAt,
      invitedBy: assertNonEmpty(input.invitedBy, "EMPTY_IDENTIFIER", "invitedBy is required.", {
        field: "invitedBy"
      }),
      responseWindowClosesAt: normalizeTimestamp(
        input.rfq.responseWindowClosesAt ?? "",
        "responseWindowClosesAt"
      ),
      updatedAt: createdAt,
      status: "open",
      invitationVersion: nextVersion
    }));

  return {
    rfq: {
      ...input.rfq,
      invitedDealerIds: requestedDealerIds,
      currentInvitationVersion: nextVersion,
      updatedAt: createdAt
    },
    invitations: [...updatedInvitations, ...newInvitations]
  };
};

export const expireDealerInvitation = (
  invitation: DealerInvitation,
  observedAt: string
): DealerInvitation => {
  if (invitation.status !== "open") {
    return invitation;
  }

  const observedAtMillis = toMillis(
    normalizeTimestamp(observedAt, "observedAt"),
    "INVALID_QUOTE_EXPIRY",
    "observedAt"
  );
  const responseWindowMillis = toMillis(
    invitation.responseWindowClosesAt,
    "INVALID_QUOTE_EXPIRY",
    "responseWindowClosesAt"
  );

  if (observedAtMillis < responseWindowMillis) {
    return invitation;
  }

  return {
    ...invitation,
    status: "expired",
    updatedAt: normalizeTimestamp(observedAt, "observedAt")
  };
};

export const markDealerInvitationResponded = (
  invitation: DealerInvitation,
  respondedAt: string,
  firstQuoteId?: string
): DealerInvitation => {
  if (invitation.status === "responded") {
    return invitation;
  }

  assertInvariant(
    invitation.status === "open",
    "INVITATION_NOT_OPEN",
    "Only open invitations may be marked as responded.",
    {
      invitationId: invitation.invitationId,
      status: invitation.status
    }
  );

  return {
    ...invitation,
    status: "responded",
    respondedAt: normalizeTimestamp(respondedAt, "respondedAt"),
    updatedAt: normalizeTimestamp(respondedAt, "respondedAt"),
    ...(firstQuoteId !== undefined ? { firstQuoteId } : {})
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
  ensureDealerBoundToPair(input.pair, dealerId);

  const relevantQuotes = (input.existingQuotes ?? []).filter(matchRfqQuote(input.rfq));

  assertInvariant(
    !relevantQuotes.some((quote) => quote.dealerId === dealerId && quote.status === "open"),
    "QUOTE_NOT_CURRENT",
    "Dealers may only hold one active quote per RFQ. Use revise quote for replacements.",
    {
      dealerId,
      rfqId: input.rfq.rfqId
    }
  );

  if (input.pair.mode === "SingleDealerPair") {
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
  } else {
    const invitations = (input.invitations ?? []).filter(matchRfqInvitation(input.rfq));

    assertInvariant(
      input.rfq.status !== "accepted" &&
        input.rfq.status !== "cancelled" &&
        input.rfq.status !== "rejected",
      "RFQ_NOT_OPEN",
      "Quotes may only be submitted against live RFQs.",
      { rfqId: input.rfq.rfqId, status: input.rfq.status }
    );
    assertInvariant(
      isRfqResponseWindowOpen(input.rfq, input.createdAt),
      "RESPONSE_WINDOW_EXPIRED",
      "Dealers may not submit or revise quotes after the response window closes.",
      {
        responseWindowClosesAt: input.rfq.responseWindowClosesAt,
        rfqId: input.rfq.rfqId
      }
    );
    assertInvariant(
      activeInvitationForDealer(invitations, dealerId) !== undefined,
      "INVITATION_REQUIRED",
      "Only invited dealers may submit ATSPair RFQ quotes.",
      {
        dealerId,
        rfqId: input.rfq.rfqId
      }
    );
  }

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

export const createFirmQuote = createDealerQuote;

export const reviseDealerQuote = (input: ReviseDealerQuoteInput): ReviseDealerQuoteResult => {
  assertInvariant(
    input.quote.dealerId === normalizeString(input.dealerId),
    "RFQ_DEALER_MISMATCH",
    "Only the quote owner may revise the quote.",
    {
      dealerId: input.dealerId,
      quoteDealerId: input.quote.dealerId,
      quoteId: input.quote.quoteId
    }
  );

  if (input.quote.status === "withdrawn") {
    throw createDomainError("QUOTE_WITHDRAWN", "Withdrawn quotes cannot be revised.", {
      quoteId: input.quote.quoteId
    });
  }

  if (input.quote.status === "stale") {
    throw createDomainError("QUOTE_STALE", "Stale quotes cannot be revised.", {
      quoteId: input.quote.quoteId
    });
  }

  assertInvariant(
    input.quote.status === "open",
    "QUOTE_NOT_OPEN",
    "Only open quotes may be revised.",
    {
      quoteId: input.quote.quoteId,
      status: input.quote.status
    }
  );

  const revisedAt = normalizeTimestamp(input.createdAt, "createdAt");
  const nextQuote = createDealerQuote({
    accessGrants: input.accessGrants,
    createdAt: revisedAt,
    dealerId: input.dealerId,
    existingQuotes: (input.existingQuotes ?? []).filter(
      (quote) => quote.quoteId !== input.quote.quoteId
    ),
    expiresAt: input.expiresAt,
    pair: input.pair,
    price: input.price,
    quantity: input.quantity,
    quoteId: input.quoteId,
    rfq: input.rfq,
    ...(input.invitations !== undefined ? { invitations: input.invitations } : {})
  });
  const previousQuote = {
    ...markQuoteStale(input.quote, revisedAt, "revised", nextQuote.quoteId),
    replacementQuoteId: nextQuote.quoteId
  };

  return {
    previousQuote,
    nextQuote: {
      ...nextQuote,
      previousQuoteId: input.quote.quoteId
    },
    revision: {
      revisionId: assertNonEmpty(input.revisionId, "EMPTY_IDENTIFIER", "revisionId is required.", {
        field: "revisionId"
      }),
      pairId: input.pair.pairId,
      rfqId: input.rfq.rfqId,
      dealerId: input.quote.dealerId,
      subscriberId: input.rfq.subscriberId,
      previousQuoteId: input.quote.quoteId,
      nextQuoteId: nextQuote.quoteId,
      revisedAt,
      revisedBy: assertNonEmpty(input.dealerId, "EMPTY_IDENTIFIER", "dealerId is required.", {
        field: "dealerId"
      })
    }
  };
};

export const withdrawDealerQuote = (input: WithdrawDealerQuoteInput): WithdrawDealerQuoteResult => {
  assertInvariant(
    input.quote.dealerId === normalizeString(input.dealerId),
    "RFQ_DEALER_MISMATCH",
    "Only the quote owner may withdraw the quote.",
    {
      dealerId: input.dealerId,
      quoteDealerId: input.quote.dealerId,
      quoteId: input.quote.quoteId
    }
  );

  if (input.quote.status === "withdrawn") {
    return {
      quote: input.quote
    };
  }

  if (input.quote.status === "stale") {
    throw createDomainError("QUOTE_STALE", "Stale quotes cannot be withdrawn.", {
      quoteId: input.quote.quoteId
    });
  }

  assertInvariant(
    input.quote.status === "open",
    "QUOTE_NOT_OPEN",
    "Only open quotes may be withdrawn.",
    {
      quoteId: input.quote.quoteId,
      status: input.quote.status
    }
  );

  const withdrawnAt = normalizeTimestamp(input.withdrawnAt, "withdrawnAt");
  const normalizedReason = normalizeOptionalNote(input.reason);

  return {
    quote: {
      ...input.quote,
      status: "withdrawn",
      updatedAt: withdrawnAt,
      withdrawnAt,
      withdrawnBy: assertNonEmpty(input.dealerId, "EMPTY_IDENTIFIER", "dealerId is required.", {
        field: "dealerId"
      }),
      ...(normalizedReason !== undefined ? { withdrawalReason: normalizedReason } : {})
    },
    withdrawal: {
      withdrawalId: assertNonEmpty(
        input.withdrawalId,
        "EMPTY_IDENTIFIER",
        "withdrawalId is required.",
        { field: "withdrawalId" }
      ),
      pairId: input.pair.pairId,
      rfqId: input.rfq.rfqId,
      quoteId: input.quote.quoteId,
      dealerId: input.quote.dealerId,
      subscriberId: input.rfq.subscriberId,
      withdrawnAt,
      withdrawnBy: assertNonEmpty(input.dealerId, "EMPTY_IDENTIFIER", "dealerId is required.", {
        field: "dealerId"
      }),
      ...(normalizedReason !== undefined ? { reason: normalizedReason } : {})
    }
  };
};

export const expireDealerQuote = (quote: DealerQuote, observedAt: string): DealerQuote => {
  if (
    quote.status === "accepted" ||
    quote.status === "expired" ||
    quote.status === "stale" ||
    quote.status === "withdrawn"
  ) {
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

export const synchronizeRfqLifecycle = (
  input: SynchronizeRfqLifecycleInput
): SynchronizeRfqLifecycleResult => {
  const observedAt = normalizeTimestamp(input.observedAt, "observedAt");
  const invitations = (input.invitations ?? [])
    .filter(matchRfqInvitation(input.rfq))
    .map((invitation) => expireDealerInvitation(invitation, observedAt));
  const quotes = (input.quotes ?? [])
    .filter(matchRfqQuote(input.rfq))
    .map((quote) => expireDealerQuote(quote, observedAt));

  if (
    input.rfq.status === "accepted" ||
    input.rfq.status === "cancelled" ||
    input.rfq.status === "rejected"
  ) {
    return {
      rfq: input.rfq,
      invitations,
      quotes
    };
  }

  const openQuotes = quotes.filter((quote) => quote.status === "open");
  let status: RFQSessionStatus;

  if (openQuotes.length > 0) {
    status = "quoted";
  } else if (input.pair.mode === "ATSPair") {
    status = isRfqResponseWindowOpen(input.rfq, observedAt) ? "open" : "quote_expired";
  } else {
    status = input.rfq.status === "open" ? "open" : "quote_expired";
  }

  return {
    rfq:
      input.rfq.status === status
        ? input.rfq
        : {
            ...input.rfq,
            status,
            updatedAt: observedAt
          },
    invitations,
    quotes
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

  if (input.quote.status === "withdrawn") {
    throw createDomainError("QUOTE_WITHDRAWN", "Withdrawn quotes cannot be accepted.", {
      quoteId: input.quote.quoteId
    });
  }

  if (input.quote.status === "stale") {
    throw createDomainError("QUOTE_STALE", "Stale quotes cannot be accepted.", {
      quoteId: input.quote.quoteId,
      staleReason: input.quote.staleReason
    });
  }

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
  const staleQuotes = (input.otherQuotes ?? [])
    .filter(
      (candidate) =>
        candidate.rfqId === input.rfq.rfqId &&
        candidate.quoteId !== input.quote.quoteId &&
        candidate.status === "open"
    )
    .map((candidate) => markQuoteStale(candidate, acceptedAt, "accepted_elsewhere"));

  return {
    rfq,
    quote,
    staleQuotes,
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

export const rejectAllQuotes = (input: RejectAllQuotesInput): RejectAllQuotesResult => {
  const rejectedBy = assertNonEmpty(
    input.rejectedBy,
    "EMPTY_IDENTIFIER",
    "rejectedBy is required.",
    { field: "rejectedBy" }
  );
  const rejectedAt = normalizeTimestamp(input.rejectedAt, "rejectedAt");
  const normalizedReason = normalizeOptionalNote(input.reason);

  assertInvariant(
    hasEntitlement(rejectedBy, input.accessGrants, "accept_quote"),
    "MISSING_ENTITLEMENT",
    "The actor does not hold accept_quote permission for this pair.",
    { rejectedBy, pairId: input.rfq.pairId }
  );
  assertInvariant(
    input.rfq.subscriberId === rejectedBy,
    "MISSING_ENTITLEMENT",
    "Only the RFQ subscriber may reject all quotes.",
    { rejectedBy, subscriberId: input.rfq.subscriberId }
  );

  if (input.rfq.status === "rejected") {
    return {
      rfq: input.rfq,
      staleQuotes: []
    };
  }

  assertInvariant(
    input.rfq.status !== "accepted" && input.rfq.status !== "cancelled",
    "RFQ_NOT_OPEN",
    "Only live RFQs may reject all quotes.",
    { rfqId: input.rfq.rfqId, status: input.rfq.status }
  );

  return {
    rfq: {
      ...input.rfq,
      status: "rejected",
      updatedAt: rejectedAt,
      rejectedAt,
      rejectedBy,
      ...(normalizedReason !== undefined ? { rejectionReason: normalizedReason } : {})
    },
    staleQuotes: input.quotes
      .filter((quote) => quote.rfqId === input.rfq.rfqId && quote.status === "open")
      .map((quote) => markQuoteStale(quote, rejectedAt, "rejected_all"))
  };
};

export const compareQuotePriority = (
  side: RFQSide,
  left: DealerQuote,
  right: DealerQuote
): number => {
  if (left.price !== right.price) {
    return side === "buy" ? left.price - right.price : right.price - left.price;
  }

  if (left.quantity !== right.quantity) {
    return right.quantity - left.quantity;
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }

  return left.quoteId.localeCompare(right.quoteId);
};

export const rankComparableQuotes = (
  side: RFQSide,
  quotes: readonly DealerQuote[]
): readonly RankedQuote[] =>
  [...quotes]
    .filter((quote) => quote.status === "open" || quote.status === "accepted")
    .sort((left, right) => compareQuotePriority(side, left, right))
    .map((quote, index) => ({
      quote,
      rank: index + 1
    }));

const assertDarkCrossPair = (pair: PairInstance): void => {
  assertInvariant(
    pair.mode === "ATSPair",
    "PAIR_MODE_MISMATCH",
    "Conditional dark crossing is only available on ATSPair venues.",
    {
      mode: pair.mode,
      pairId: pair.pairId
    }
  );
};

const isDarkOrderExpiredAt = (order: DarkOrder, observedAt: string): boolean =>
  order.expiresAt !== undefined &&
  toMillis(observedAt, "INVALID_QUOTE_EXPIRY", "observedAt") >=
    toMillis(order.expiresAt, "INVALID_QUOTE_EXPIRY", "expiresAt");

export const isOrderLockActive = (lock: OrderLock): boolean => lock.status === "active";

export const hasActiveOrderLock = (orderId: string, locks: readonly OrderLock[] = []): boolean =>
  locks.some((lock) => lock.orderId === orderId && isOrderLockActive(lock));

export const createDarkOrder = (input: CreateDarkOrderInput): DarkOrder => {
  assertDarkCrossPair(input.pair);
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
    "INVALID_DARK_ORDER_QUANTITY",
    "Dark order quantity must be greater than zero.",
    { quantity: input.quantity }
  );
  assertPositiveNumber(
    input.limitPrice,
    "INVALID_DARK_ORDER_PRICE",
    "Dark order limit price must be greater than zero.",
    { limitPrice: input.limitPrice }
  );

  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");
  const expiresAt =
    input.expiresAt === undefined ? undefined : normalizeTimestamp(input.expiresAt, "expiresAt");

  if (expiresAt !== undefined) {
    assertInvariant(
      toMillis(expiresAt, "INVALID_QUOTE_EXPIRY", "expiresAt") >
        toMillis(createdAt, "INVALID_QUOTE_EXPIRY", "createdAt"),
      "INVALID_QUOTE_EXPIRY",
      "Dark order expiry must be later than order creation time.",
      {
        createdAt,
        expiresAt
      }
    );
  }

  return {
    orderId: assertNonEmpty(input.orderId, "EMPTY_IDENTIFIER", "orderId is required.", {
      field: "orderId"
    }),
    clientOrderId: assertNonEmpty(
      input.clientOrderId,
      "EMPTY_IDENTIFIER",
      "clientOrderId is required.",
      { field: "clientOrderId" }
    ),
    pairId: input.pair.pairId,
    subscriberId,
    instrumentId: assertNonEmpty(
      input.instrumentId,
      "EMPTY_IDENTIFIER",
      "instrumentId is required.",
      { field: "instrumentId" }
    ),
    side: input.side,
    quantity: input.quantity,
    limitPrice: input.limitPrice,
    createdAt,
    updatedAt: createdAt,
    status: "open",
    ...(expiresAt !== undefined ? { expiresAt } : {})
  };
};

export const expireDarkOrder = (order: DarkOrder, observedAt: string): DarkOrder => {
  if (order.status !== "open" || order.expiresAt === undefined) {
    return order;
  }

  const normalizedObservedAt = normalizeTimestamp(observedAt, "observedAt");

  if (!isDarkOrderExpiredAt(order, normalizedObservedAt)) {
    return order;
  }

  return {
    ...order,
    status: "expired",
    updatedAt: normalizedObservedAt
  };
};

export const cancelDarkOrder = (input: CancelDarkOrderInput): DarkOrder => {
  assertDarkCrossPair(input.pair);

  const cancelledBy = assertNonEmpty(
    input.cancelledBy,
    "EMPTY_IDENTIFIER",
    "cancelledBy is required.",
    { field: "cancelledBy" }
  );

  assertInvariant(
    hasEntitlement(cancelledBy, input.accessGrants, "submit_rfq"),
    "MISSING_ENTITLEMENT",
    "The subscriber does not hold submit_rfq permission for this pair.",
    { actorId: cancelledBy, pairId: input.pair.pairId }
  );
  assertInvariant(
    input.order.subscriberId === cancelledBy,
    "MISSING_ENTITLEMENT",
    "Only the dark-order owner may cancel the order.",
    {
      actorId: cancelledBy,
      orderId: input.order.orderId,
      subscriberId: input.order.subscriberId
    }
  );

  if (input.order.status === "cancelled") {
    return input.order;
  }

  if (input.order.status !== "open") {
    throw createDomainError(
      "DARK_ORDER_ALREADY_TERMINAL",
      "Only open dark orders may be cancelled.",
      {
        orderId: input.order.orderId,
        status: input.order.status
      }
    );
  }

  const activeLocks = (input.activeLocks ?? []).filter(
    (lock) => lock.orderId === input.order.orderId && lock.status === "active"
  );

  assertInvariant(
    activeLocks.length === 0,
    "DARK_ORDER_LOCKED",
    "Locked dark orders cannot be cancelled until the lock is released.",
    {
      lockIds: activeLocks.map((lock) => lock.lockId),
      orderId: input.order.orderId
    }
  );

  const cancelledAt = normalizeTimestamp(input.cancelledAt, "cancelledAt");

  return {
    ...input.order,
    status: "cancelled",
    cancelledAt,
    cancelledBy,
    updatedAt: cancelledAt
  };
};

export const compareDarkOrderPriority = (
  side: RFQSide,
  left: DarkOrder,
  right: DarkOrder
): number => {
  if (left.limitPrice !== right.limitPrice) {
    return side === "buy" ? right.limitPrice - left.limitPrice : left.limitPrice - right.limitPrice;
  }

  if (left.quantity !== right.quantity) {
    return right.quantity - left.quantity;
  }

  if (left.createdAt !== right.createdAt) {
    return left.createdAt.localeCompare(right.createdAt);
  }

  return left.orderId.localeCompare(right.orderId);
};

export const canDarkOrdersCross = (buyOrder: DarkOrder, sellOrder: DarkOrder): boolean =>
  buyOrder.side === "buy" &&
  sellOrder.side === "sell" &&
  buyOrder.pairId === sellOrder.pairId &&
  buyOrder.instrumentId === sellOrder.instrumentId &&
  buyOrder.orderId !== sellOrder.orderId &&
  buyOrder.subscriberId !== sellOrder.subscriberId &&
  buyOrder.status === "open" &&
  sellOrder.status === "open" &&
  buyOrder.quantity === sellOrder.quantity &&
  buyOrder.limitPrice >= sellOrder.limitPrice;

export const resolveDarkCrossPrice = (buyOrder: DarkOrder, sellOrder: DarkOrder): number =>
  Number(((buyOrder.limitPrice + sellOrder.limitPrice) / 2).toFixed(6));

export const createOrderLock = (input: CreateOrderLockInput): OrderLock => {
  assertDarkCrossPair(input.pair);

  assertInvariant(
    input.order.status === "open",
    "DARK_ORDER_NOT_OPEN",
    "Only open dark orders may be locked.",
    {
      orderId: input.order.orderId,
      status: input.order.status
    }
  );

  const lockedAt = normalizeTimestamp(input.lockedAt, "lockedAt");
  const lockExpiresAt = normalizeTimestamp(input.lockExpiresAt, "lockExpiresAt");

  assertInvariant(
    toMillis(lockExpiresAt, "INVALID_LOCK_EXPIRY", "lockExpiresAt") >
      toMillis(lockedAt, "INVALID_LOCK_EXPIRY", "lockedAt"),
    "INVALID_LOCK_EXPIRY",
    "Lock expiry must be later than lock creation time.",
    {
      lockExpiresAt,
      lockedAt
    }
  );
  assertInvariant(
    !isDarkOrderExpiredAt(input.order, lockedAt),
    "DARK_ORDER_EXPIRED",
    "Expired dark orders may not be locked.",
    {
      expiresAt: input.order.expiresAt,
      orderId: input.order.orderId
    }
  );

  return {
    lockId: assertNonEmpty(input.lockId, "EMPTY_IDENTIFIER", "lockId is required.", {
      field: "lockId"
    }),
    pairId: input.pair.pairId,
    orderId: input.order.orderId,
    proposalId: assertNonEmpty(input.proposalId, "EMPTY_IDENTIFIER", "proposalId is required.", {
      field: "proposalId"
    }),
    subscriberId: input.order.subscriberId,
    lockedAt,
    lockedBy: assertNonEmpty(input.lockedBy, "EMPTY_IDENTIFIER", "lockedBy is required.", {
      field: "lockedBy"
    }),
    lockExpiresAt,
    updatedAt: lockedAt,
    status: "active"
  };
};

export const releaseOrderLock = (input: ReleaseOrderLockInput): OrderLock => {
  if (input.lock.status !== "active") {
    return input.lock;
  }

  const releasedAt = normalizeTimestamp(input.releasedAt, "releasedAt");

  return {
    ...input.lock,
    status: input.reason === "expired" ? "expired" : "released",
    releasedAt,
    releasedBy: assertNonEmpty(input.releasedBy, "EMPTY_IDENTIFIER", "releasedBy is required.", {
      field: "releasedBy"
    }),
    releaseReason: input.reason,
    updatedAt: releasedAt
  };
};

export const createMatchProposal = (input: CreateMatchProposalInput): CreateMatchProposalResult => {
  assertDarkCrossPair(input.pair);
  assertPairActive(input.pair);

  assertInvariant(
    input.createdBy === input.pair.operatorId,
    "MISSING_ENTITLEMENT",
    "Only the pair operator may create dark-cross match proposals.",
    {
      actorId: input.createdBy,
      operatorId: input.pair.operatorId,
      pairId: input.pair.pairId
    }
  );

  assertInvariant(
    input.buyOrder.side === "buy" && input.sellOrder.side === "sell",
    "NO_MATCH_CANDIDATE",
    "Match proposals require a buy order and a sell order.",
    {
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId
    }
  );
  assertInvariant(
    canDarkOrdersCross(input.buyOrder, input.sellOrder),
    "NO_MATCH_CANDIDATE",
    "The selected dark orders are not compatible for crossing.",
    {
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId
    }
  );
  assertInvariant(
    hasEntitlement(input.buyOrder.subscriberId, input.accessGrants, "accept_quote") &&
      hasEntitlement(input.sellOrder.subscriberId, input.accessGrants, "accept_quote"),
    "MISSING_ENTITLEMENT",
    "Both dark-order counterparties must hold accept_quote permission for the pair.",
    {
      buySubscriberId: input.buyOrder.subscriberId,
      sellSubscriberId: input.sellOrder.subscriberId
    }
  );

  const createdAt = normalizeTimestamp(input.createdAt, "createdAt");
  const expiresAt = normalizeTimestamp(input.expiresAt, "expiresAt");

  assertInvariant(
    toMillis(expiresAt, "INVALID_MATCH_EXPIRY", "expiresAt") >
      toMillis(createdAt, "INVALID_MATCH_EXPIRY", "createdAt"),
    "INVALID_MATCH_EXPIRY",
    "Match proposal expiry must be later than proposal creation time.",
    {
      createdAt,
      expiresAt
    }
  );
  assertInvariant(
    !isDarkOrderExpiredAt(input.buyOrder, createdAt) &&
      !isDarkOrderExpiredAt(input.sellOrder, createdAt),
    "DARK_ORDER_EXPIRED",
    "Expired dark orders may not be proposed for matching.",
    {
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId
    }
  );

  const buyLock = createOrderLock({
    pair: input.pair,
    order: input.buyOrder,
    lockId: input.buyLockId,
    proposalId: input.proposalId,
    lockedAt: createdAt,
    lockedBy: input.createdBy,
    lockExpiresAt: expiresAt
  });
  const sellLock = createOrderLock({
    pair: input.pair,
    order: input.sellOrder,
    lockId: input.sellLockId,
    proposalId: input.proposalId,
    lockedAt: createdAt,
    lockedBy: input.createdBy,
    lockExpiresAt: expiresAt
  });

  return {
    buyLock,
    sellLock,
    proposal: {
      proposalId: assertNonEmpty(input.proposalId, "EMPTY_IDENTIFIER", "proposalId is required.", {
        field: "proposalId"
      }),
      pairId: input.pair.pairId,
      instrumentId: input.buyOrder.instrumentId,
      quantity: input.buyOrder.quantity,
      price: resolveDarkCrossPrice(input.buyOrder, input.sellOrder),
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId,
      buySubscriberId: input.buyOrder.subscriberId,
      sellSubscriberId: input.sellOrder.subscriberId,
      buyLockId: buyLock.lockId,
      sellLockId: sellLock.lockId,
      buyResponse: "pending",
      sellResponse: "pending",
      createdAt,
      createdBy: input.createdBy,
      expiresAt,
      updatedAt: createdAt,
      status: "pending"
    }
  };
};

export const acceptMatchProposal = (input: AcceptMatchProposalInput): MatchProposal => {
  const actorId = assertNonEmpty(input.actorId, "EMPTY_IDENTIFIER", "actorId is required.", {
    field: "actorId"
  });
  const acceptedAt = normalizeTimestamp(input.acceptedAt, "acceptedAt");

  assertInvariant(
    hasEntitlement(actorId, input.accessGrants, "accept_quote"),
    "MISSING_ENTITLEMENT",
    "The actor does not hold accept_quote permission for this pair.",
    {
      actorId,
      pairId: input.proposal.pairId
    }
  );
  assertInvariant(
    input.proposal.buySubscriberId === actorId || input.proposal.sellSubscriberId === actorId,
    "MISSING_ENTITLEMENT",
    "Only the proposal counterparties may accept the match.",
    {
      actorId,
      proposalId: input.proposal.proposalId
    }
  );

  assertInvariant(
    input.proposal.status === "pending" || input.proposal.status === "accepted",
    "MATCH_PROPOSAL_NOT_PENDING",
    "Only pending or ready match proposals may be accepted.",
    {
      proposalId: input.proposal.proposalId,
      status: input.proposal.status
    }
  );
  assertInvariant(
    toMillis(acceptedAt, "INVALID_MATCH_EXPIRY", "acceptedAt") <
      toMillis(input.proposal.expiresAt, "INVALID_MATCH_EXPIRY", "expiresAt"),
    "INVALID_MATCH_EXPIRY",
    "Match proposals must be accepted before expiry.",
    {
      acceptedAt,
      expiresAt: input.proposal.expiresAt
    }
  );

  const buyAccepted =
    actorId === input.proposal.buySubscriberId || input.proposal.buyResponse === "accepted";
  const sellAccepted =
    actorId === input.proposal.sellSubscriberId || input.proposal.sellResponse === "accepted";

  if (
    (actorId === input.proposal.buySubscriberId && input.proposal.buyResponse === "accepted") ||
    (actorId === input.proposal.sellSubscriberId && input.proposal.sellResponse === "accepted")
  ) {
    return input.proposal;
  }

  return {
    ...input.proposal,
    buyResponse: buyAccepted ? "accepted" : input.proposal.buyResponse,
    sellResponse: sellAccepted ? "accepted" : input.proposal.sellResponse,
    ...(actorId === input.proposal.buySubscriberId ? { buyAcceptedAt: acceptedAt } : {}),
    ...(actorId === input.proposal.sellSubscriberId ? { sellAcceptedAt: acceptedAt } : {}),
    ...(buyAccepted && sellAccepted
      ? {
          status: "accepted" as const,
          acceptedAt
        }
      : {}),
    updatedAt: acceptedAt
  };
};

export const rejectMatchProposal = (input: RejectMatchProposalInput): MatchProposal => {
  const actorId = assertNonEmpty(input.actorId, "EMPTY_IDENTIFIER", "actorId is required.", {
    field: "actorId"
  });
  const rejectedAt = normalizeTimestamp(input.rejectedAt, "rejectedAt");
  const rejectionReason = normalizeOptionalNote(input.reason);

  assertInvariant(
    hasEntitlement(actorId, input.accessGrants, "accept_quote"),
    "MISSING_ENTITLEMENT",
    "The actor does not hold accept_quote permission for this pair.",
    {
      actorId,
      pairId: input.proposal.pairId
    }
  );
  assertInvariant(
    input.proposal.buySubscriberId === actorId || input.proposal.sellSubscriberId === actorId,
    "MISSING_ENTITLEMENT",
    "Only the proposal counterparties may reject the match.",
    {
      actorId,
      proposalId: input.proposal.proposalId
    }
  );

  if (input.proposal.status === "rejected" && input.proposal.rejectedBy === actorId) {
    return input.proposal;
  }

  assertInvariant(
    input.proposal.status === "pending",
    "MATCH_PROPOSAL_NOT_PENDING",
    "Only pending match proposals may be rejected.",
    {
      proposalId: input.proposal.proposalId,
      status: input.proposal.status
    }
  );

  return {
    ...input.proposal,
    status: "rejected",
    buyResponse:
      actorId === input.proposal.buySubscriberId ? "rejected" : input.proposal.buyResponse,
    sellResponse:
      actorId === input.proposal.sellSubscriberId ? "rejected" : input.proposal.sellResponse,
    rejectedAt,
    rejectedBy: actorId,
    updatedAt: rejectedAt,
    ...(rejectionReason !== undefined ? { rejectionReason } : {})
  };
};

export const expireMatchProposal = (proposal: MatchProposal, observedAt: string): MatchProposal => {
  if (proposal.status !== "pending" && proposal.status !== "accepted") {
    return proposal;
  }

  const normalizedObservedAt = normalizeTimestamp(observedAt, "observedAt");

  if (
    toMillis(normalizedObservedAt, "INVALID_MATCH_EXPIRY", "observedAt") <
    toMillis(proposal.expiresAt, "INVALID_MATCH_EXPIRY", "expiresAt")
  ) {
    return proposal;
  }

  return {
    ...proposal,
    status: "expired",
    updatedAt: normalizedObservedAt
  };
};

export const executeDarkMatch = (input: ExecuteDarkMatchInput): ExecuteDarkMatchResult => {
  assertDarkCrossPair(input.pair);

  const releasedBy = assertNonEmpty(
    input.releasedBy,
    "EMPTY_IDENTIFIER",
    "releasedBy is required.",
    { field: "releasedBy" }
  );

  assertInvariant(
    hasEntitlement(releasedBy, input.accessGrants, "progress_settlement"),
    "MISSING_ENTITLEMENT",
    "The actor does not hold progress_settlement permission for this pair.",
    {
      actorId: releasedBy,
      pairId: input.pair.pairId
    }
  );
  assertInvariant(
    input.proposal.status === "accepted",
    "MATCH_PROPOSAL_NOT_ACCEPTED",
    "Only accepted match proposals may execute.",
    {
      proposalId: input.proposal.proposalId,
      status: input.proposal.status
    }
  );
  assertInvariant(
    input.buyOrder.orderId === input.proposal.buyOrderId &&
      input.sellOrder.orderId === input.proposal.sellOrderId,
    "NO_MATCH_CANDIDATE",
    "Execution inputs must reference the proposal's locked orders.",
    {
      buyOrderId: input.buyOrder.orderId,
      proposalBuyOrderId: input.proposal.buyOrderId,
      proposalId: input.proposal.proposalId,
      sellOrderId: input.sellOrder.orderId,
      proposalSellOrderId: input.proposal.sellOrderId
    }
  );
  assertInvariant(
    input.buyLock.status === "active" &&
      input.sellLock.status === "active" &&
      input.buyLock.proposalId === input.proposal.proposalId &&
      input.sellLock.proposalId === input.proposal.proposalId,
    "ORDER_LOCK_NOT_ACTIVE",
    "Accepted match proposals require active locks for both orders.",
    {
      buyLockId: input.buyLock.lockId,
      proposalId: input.proposal.proposalId,
      sellLockId: input.sellLock.lockId
    }
  );
  assertInvariant(
    input.buyOrder.status === "open" && input.sellOrder.status === "open",
    "DARK_ORDER_NOT_OPEN",
    "Only open dark orders may execute.",
    {
      buyOrderId: input.buyOrder.orderId,
      buyStatus: input.buyOrder.status,
      sellOrderId: input.sellOrder.orderId,
      sellStatus: input.sellOrder.status
    }
  );

  const executedAt = normalizeTimestamp(input.executedAt, "executedAt");

  assertInvariant(
    !isDarkOrderExpiredAt(input.buyOrder, executedAt) &&
      !isDarkOrderExpiredAt(input.sellOrder, executedAt),
    "DARK_ORDER_EXPIRED",
    "Expired dark orders may not execute.",
    {
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId
    }
  );

  const executionId = assertNonEmpty(
    input.executionId,
    "EMPTY_IDENTIFIER",
    "executionId is required.",
    { field: "executionId" }
  );
  const instructionId = assertNonEmpty(
    input.instructionId,
    "EMPTY_IDENTIFIER",
    "instructionId is required.",
    { field: "instructionId" }
  );
  const acceptedAt = input.proposal.acceptedAt ?? executedAt;

  return {
    buyOrder: {
      ...input.buyOrder,
      status: "executed",
      executedAt,
      executionId,
      updatedAt: executedAt
    },
    sellOrder: {
      ...input.sellOrder,
      status: "executed",
      executedAt,
      executionId,
      updatedAt: executedAt
    },
    buyLock: releaseOrderLock({
      lock: input.buyLock,
      releasedAt: executedAt,
      releasedBy,
      reason: "executed"
    }),
    sellLock: releaseOrderLock({
      lock: input.sellLock,
      releasedAt: executedAt,
      releasedBy,
      reason: "executed"
    }),
    proposal: {
      ...input.proposal,
      status: "executed",
      executionId,
      updatedAt: executedAt
    },
    executionTicket: {
      executionId,
      executionKind: "dark_cross",
      pairId: input.pair.pairId,
      matchProposalId: input.proposal.proposalId,
      instrumentId: input.proposal.instrumentId,
      quantity: input.proposal.quantity,
      price: input.proposal.price,
      acceptedAt,
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId,
      buySubscriberId: input.buyOrder.subscriberId,
      sellSubscriberId: input.sellOrder.subscriberId,
      side: "buy"
    },
    settlementInstruction: {
      instructionId,
      pairId: input.pair.pairId,
      executionId,
      status: "pending",
      createdAt: executedAt,
      updatedAt: executedAt,
      settlementKind: "dark_cross",
      matchProposalId: input.proposal.proposalId,
      buyOrderId: input.buyOrder.orderId,
      sellOrderId: input.sellOrder.orderId,
      subscriberId: input.buyOrder.subscriberId,
      sellSubscriberId: input.sellOrder.subscriberId,
      settlementAgentId: releasedBy
    }
  };
};

export const synchronizeDarkCrossLifecycle = (
  input: SynchronizeDarkCrossLifecycleInput
): SynchronizeDarkCrossLifecycleResult => {
  const observedAt = normalizeTimestamp(input.observedAt, "observedAt");
  const orders = (input.orders ?? []).map((order) => expireDarkOrder(order, observedAt));
  const proposals = (input.proposals ?? []).map((proposal) =>
    expireMatchProposal(proposal, observedAt)
  );
  const proposalMap = new Map(proposals.map((proposal) => [proposal.proposalId, proposal]));
  const locks = (input.locks ?? []).map((lock) => {
    if (lock.status !== "active") {
      return lock;
    }

    const proposal = proposalMap.get(lock.proposalId);

    if (proposal?.status === "rejected") {
      return releaseOrderLock({
        lock,
        releasedAt: proposal.updatedAt,
        releasedBy: proposal.rejectedBy ?? "system",
        reason: "rejected"
      });
    }

    if (proposal?.status === "executed" && proposal.executionId !== undefined) {
      return releaseOrderLock({
        lock,
        releasedAt: proposal.updatedAt,
        releasedBy: "system",
        reason: "executed"
      });
    }

    if (
      proposal?.status === "expired" ||
      toMillis(observedAt, "INVALID_LOCK_EXPIRY", "observedAt") >=
        toMillis(lock.lockExpiresAt, "INVALID_LOCK_EXPIRY", "lockExpiresAt")
    ) {
      return releaseOrderLock({
        lock,
        releasedAt: observedAt,
        releasedBy: "system",
        reason: "expired"
      });
    }

    return lock;
  });

  return {
    orders,
    proposals,
    locks
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
