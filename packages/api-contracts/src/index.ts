import type {
  AuditTrailView,
  DealerInvitationHistoryView,
  DealerWorkbenchView,
  OperatorOversightView,
  OperatorView,
  QuoteComparisonView,
  SubscriberView,
  VenueHealthReadModel
} from "@canton-dark/query-models";
import type {
  DarkOrder,
  Entitlement,
  ExecutionTicket,
  MatchProposal,
  OrderLock,
  SettlementInstruction
} from "@canton-dark/domain-core";

export type CreatePairRequest = {
  dealerId?: string;
  dealerIds?: readonly string[];
  inviteRevisionPolicy?: "before_first_response" | "locked";
  jurisdiction: string;
  mode: "ATSPair" | "SingleDealerPair";
  operatorId: string;
  operatorOversightRole?: "blinded" | "full";
  pairId?: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessRequest = {
  entitlements?: readonly Entitlement[];
  role: "auditor" | "dealer" | "operator" | "settlement_delegate" | "subscriber";
  subjectId: string;
};

export type PausePairRequest = {
  reason?: string;
  state: "active" | "paused";
};

export type OpenRfqRequest = {
  instrumentId: string;
  quantity: number;
  responseWindowClosesAt?: string;
  side: "buy" | "sell";
};

export type InviteDealersRequest = {
  dealerIds: readonly string[];
};

export type RejectRfqRequest = {
  reason?: string;
};

export type SubmitQuoteRequest = {
  expiresAt: string;
  price: number;
  quantity: number;
};

export type WithdrawQuoteRequest = {
  reason?: string;
};

export type RejectAllQuotesRequest = {
  reason?: string;
};

export type MarkSettlementProgressionRequest = {
  status: "affirmed" | "failed" | "instructed" | "pending" | "settled";
};

export type SubmitDarkOrderRequest = {
  clientOrderId: string;
  expiresAt?: string;
  instrumentId: string;
  limitPrice: number;
  quantity: number;
  side: "buy" | "sell";
};

export type GenerateMatchProposalRequest = {
  buyOrderId?: string;
  expiresAt?: string;
  sellOrderId?: string;
};

export type RejectMatchRequest = {
  reason?: string;
};

export type DarkSubscriberStateResponse = {
  executions: readonly ExecutionTicket[];
  locks: readonly OrderLock[];
  orders: readonly DarkOrder[];
  proposals: readonly MatchProposal[];
  settlements: readonly SettlementInstruction[];
  subscriberId: string;
};

export type HealthResponse = {
  generatedAt: string;
  service: "venue-api";
  venue: VenueHealthReadModel;
};

export type DemoMode =
  | "empty"
  | "phase1-complete"
  | "phase1-ready"
  | "phase2-ready"
  | "phase3-ready";

export type DemoResetRequest = {
  mode: DemoMode;
  seed?: number;
};

export type DemoClockAdvanceRequest = {
  milliseconds: number;
};

export type DemoStatusResponse = {
  buyOrderId?: string;
  currentTime: string;
  dealerId: string;
  dealerIds: readonly string[];
  mode: DemoMode;
  operatorId: string;
  pairId: string;
  proposalId?: string;
  secondarySubscriberId?: string;
  seed: number;
  sellOrderId?: string;
  subscriberId: string;
};

export type OpenApiSchema = {
  additionalProperties?: boolean;
  description?: string;
  enum?: readonly string[];
  items?: OpenApiSchema;
  nullable?: boolean;
  properties?: Record<string, OpenApiSchema>;
  required?: readonly string[];
  type?: "array" | "boolean" | "number" | "object" | "string";
};

export class ContractValidationError extends Error {
  readonly path: string;

  constructor(path: string, message: string) {
    super(`${path}: ${message}`);
    this.name = "ContractValidationError";
    this.path = path;
  }
}

type Schema<T> = {
  openapi: OpenApiSchema;
  optional?: true;
  parse: (value: unknown, path?: string) => T;
};

const stringSchema = (): Schema<string> => ({
  openapi: {
    type: "string"
  },
  parse(value, path = "$") {
    if (typeof value !== "string") {
      throw new ContractValidationError(path, "expected string");
    }

    return value;
  }
});

const numberSchema = (): Schema<number> => ({
  openapi: {
    type: "number"
  },
  parse(value, path = "$") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      throw new ContractValidationError(path, "expected number");
    }

    return value;
  }
});

const booleanSchema = (): Schema<boolean> => ({
  openapi: {
    type: "boolean"
  },
  parse(value, path = "$") {
    if (typeof value !== "boolean") {
      throw new ContractValidationError(path, "expected boolean");
    }

    return value;
  }
});

const enumSchema = <T extends string>(values: readonly T[]): Schema<T> => ({
  openapi: {
    type: "string",
    enum: values
  },
  parse(value, path = "$") {
    if (typeof value !== "string" || !values.includes(value as T)) {
      throw new ContractValidationError(path, `expected one of ${values.join(", ")}`);
    }

    return value as T;
  }
});

const arraySchema = <T>(item: Schema<T>): Schema<readonly T[]> => ({
  openapi: {
    type: "array",
    items: item.openapi
  },
  parse(value, path = "$") {
    if (!Array.isArray(value)) {
      throw new ContractValidationError(path, "expected array");
    }

    return value.map((entry, index) => item.parse(entry, `${path}[${index}]`));
  }
});

const optionalSchema = <T>(inner: Schema<T>): Schema<T | undefined> => ({
  openapi: inner.openapi,
  optional: true,
  parse(value, path = "$") {
    return value === undefined ? undefined : inner.parse(value, path);
  }
});

const nullableSchema = <T>(inner: Schema<T>): Schema<T | null> => ({
  openapi: {
    ...inner.openapi,
    nullable: true
  },
  parse(value, path = "$") {
    return value === null ? null : inner.parse(value, path);
  }
});

const objectSchema = <T extends Record<string, unknown>>(
  shape: Record<string, Schema<unknown>>
): Schema<T> => ({
  openapi: {
    type: "object",
    properties: Object.fromEntries(
      Object.entries(shape).map(([key, schema]) => [key, schema.openapi])
    ),
    required: Object.entries(shape)
      .filter(([, schema]) => schema.optional !== true)
      .map(([key]) => key),
    additionalProperties: false
  },
  parse(value, path = "$") {
    if (value === null || typeof value !== "object" || Array.isArray(value)) {
      throw new ContractValidationError(path, "expected object");
    }

    const record = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};

    for (const [key, schema] of Object.entries(shape)) {
      const nextPath = `${path}.${key}`;
      const rawValue = record[key];

      if (rawValue === undefined && schema.optional !== true) {
        throw new ContractValidationError(nextPath, "is required");
      }

      const parsed = schema.parse(rawValue, nextPath);

      if (parsed !== undefined) {
        result[key] = parsed;
      }
    }

    return result as T;
  }
});

const pairSummaryViewSchema = objectSchema<OperatorView["pair"]>({
  pairId: stringSchema(),
  mode: enumSchema(["ATSPair", "SingleDealerPair"]),
  operatorId: stringSchema(),
  dealerId: stringSchema(),
  paused: booleanSchema(),
  rulebookVersion: stringSchema(),
  approvalStatus: enumSchema(["approved", "rejected"]),
  attestationStatus: enumSchema(["attested", "expired"])
});

const participantAccessItemSchema = objectSchema<OperatorView["access"]["participants"][number]>({
  subjectId: stringSchema(),
  roles: arraySchema(
    enumSchema(["auditor", "dealer", "operator", "settlement_delegate", "subscriber"])
  ),
  entitlements: arraySchema(stringSchema())
});

const participantAccessSchema = objectSchema<OperatorView["access"]>({
  pairId: stringSchema(),
  participants: arraySchema(participantAccessItemSchema)
});

const rfqViewSchema = objectSchema<OperatorView["rfqs"][number]>({
  rfqId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  instrumentId: stringSchema(),
  side: enumSchema(["buy", "sell"]),
  quantity: numberSchema(),
  status: enumSchema(["accepted", "cancelled", "open", "quote_expired", "quoted", "rejected"]),
  createdAt: stringSchema()
});

const quoteViewSchema = objectSchema<OperatorView["quotes"][number]>({
  quoteId: stringSchema(),
  rfqId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  price: numberSchema(),
  quantity: numberSchema(),
  expiresAt: stringSchema(),
  status: enumSchema(["accepted", "expired", "open", "stale", "withdrawn"]),
  createdAt: stringSchema()
});

const executionViewSchema = objectSchema<ExecutionTicket>({
  acceptedAt: stringSchema(),
  buyOrderId: optionalSchema(stringSchema()),
  buySubscriberId: optionalSchema(stringSchema()),
  dealerId: optionalSchema(stringSchema()),
  executionId: stringSchema(),
  executionKind: optionalSchema(enumSchema(["dark_cross", "rfq_quote"])),
  instrumentId: stringSchema(),
  matchProposalId: optionalSchema(stringSchema()),
  pairId: stringSchema(),
  quantity: numberSchema(),
  price: numberSchema(),
  quoteId: optionalSchema(stringSchema()),
  rfqId: optionalSchema(stringSchema()),
  sellOrderId: optionalSchema(stringSchema()),
  sellSubscriberId: optionalSchema(stringSchema()),
  side: optionalSchema(enumSchema(["buy", "sell"])),
  subscriberId: optionalSchema(stringSchema())
});

const settlementViewSchema = objectSchema<SettlementInstruction>({
  buyOrderId: optionalSchema(stringSchema()),
  createdAt: stringSchema(),
  dealerId: optionalSchema(stringSchema()),
  executionId: stringSchema(),
  instructionId: stringSchema(),
  matchProposalId: optionalSchema(stringSchema()),
  pairId: stringSchema(),
  sellOrderId: optionalSchema(stringSchema()),
  sellSubscriberId: optionalSchema(stringSchema()),
  status: enumSchema(["affirmed", "failed", "instructed", "pending", "settled"]),
  settlementAgentId: optionalSchema(stringSchema()),
  settlementKind: optionalSchema(enumSchema(["dark_cross", "rfq_quote"])),
  subscriberId: optionalSchema(stringSchema()),
  updatedAt: stringSchema()
});

const darkOrderSchema = objectSchema<DarkOrder>({
  cancelledAt: optionalSchema(stringSchema()),
  cancelledBy: optionalSchema(stringSchema()),
  clientOrderId: stringSchema(),
  createdAt: stringSchema(),
  executedAt: optionalSchema(stringSchema()),
  executionId: optionalSchema(stringSchema()),
  expiresAt: optionalSchema(stringSchema()),
  instrumentId: stringSchema(),
  limitPrice: numberSchema(),
  orderId: stringSchema(),
  pairId: stringSchema(),
  quantity: numberSchema(),
  side: enumSchema(["buy", "sell"]),
  status: enumSchema(["cancelled", "executed", "expired", "open"]),
  subscriberId: stringSchema(),
  updatedAt: stringSchema()
});

const orderLockSchema = objectSchema<OrderLock>({
  lockExpiresAt: stringSchema(),
  lockId: stringSchema(),
  lockedAt: stringSchema(),
  lockedBy: stringSchema(),
  orderId: stringSchema(),
  pairId: stringSchema(),
  proposalId: stringSchema(),
  releasedAt: optionalSchema(stringSchema()),
  releasedBy: optionalSchema(stringSchema()),
  releaseReason: optionalSchema(enumSchema(["executed", "expired", "rejected"])),
  status: enumSchema(["active", "expired", "released"]),
  subscriberId: stringSchema(),
  updatedAt: stringSchema()
});

const matchProposalSchema = objectSchema<MatchProposal>({
  acceptedAt: optionalSchema(stringSchema()),
  buyAcceptedAt: optionalSchema(stringSchema()),
  buyLockId: stringSchema(),
  buyOrderId: stringSchema(),
  buyResponse: enumSchema(["accepted", "pending", "rejected"]),
  buySubscriberId: stringSchema(),
  createdAt: stringSchema(),
  createdBy: stringSchema(),
  executionId: optionalSchema(stringSchema()),
  expiresAt: stringSchema(),
  instrumentId: stringSchema(),
  pairId: stringSchema(),
  price: numberSchema(),
  proposalId: stringSchema(),
  quantity: numberSchema(),
  rejectedAt: optionalSchema(stringSchema()),
  rejectedBy: optionalSchema(stringSchema()),
  rejectionReason: optionalSchema(stringSchema()),
  sellAcceptedAt: optionalSchema(stringSchema()),
  sellLockId: stringSchema(),
  sellOrderId: stringSchema(),
  sellResponse: enumSchema(["accepted", "pending", "rejected"]),
  sellSubscriberId: stringSchema(),
  status: enumSchema(["accepted", "executed", "expired", "pending", "rejected"]),
  updatedAt: stringSchema()
});

const invitationViewSchema = objectSchema<DealerInvitationHistoryView["invitations"][number]>({
  invitationId: stringSchema(),
  rfqId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  invitationVersion: numberSchema(),
  invitedAt: stringSchema(),
  invitedBy: stringSchema(),
  responseWindowClosesAt: stringSchema(),
  status: enumSchema(["expired", "open", "responded", "withdrawn"]),
  respondedAt: optionalSchema(stringSchema()),
  withdrawnAt: optionalSchema(stringSchema()),
  withdrawnBy: optionalSchema(stringSchema()),
  withdrawalReason: optionalSchema(stringSchema())
});

const quoteRevisionViewSchema = objectSchema<DealerInvitationHistoryView["revisions"][number]>({
  revisionId: stringSchema(),
  pairId: stringSchema(),
  rfqId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  previousQuoteId: stringSchema(),
  nextQuoteId: stringSchema(),
  revisedAt: stringSchema(),
  revisedBy: stringSchema()
});

const quoteWithdrawalViewSchema = objectSchema<DealerInvitationHistoryView["withdrawals"][number]>({
  withdrawalId: stringSchema(),
  pairId: stringSchema(),
  rfqId: stringSchema(),
  quoteId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  withdrawnAt: stringSchema(),
  withdrawnBy: stringSchema(),
  reason: optionalSchema(stringSchema())
});

const quoteComparisonItemSchema = objectSchema<QuoteComparisonView["quotes"][number]>({
  quoteId: stringSchema(),
  rfqId: stringSchema(),
  dealerId: stringSchema(),
  price: numberSchema(),
  quantity: numberSchema(),
  expiresAt: stringSchema(),
  status: enumSchema(["accepted", "expired", "open", "stale", "withdrawn"]),
  createdAt: stringSchema(),
  comparable: booleanSchema(),
  rank: optionalSchema(numberSchema())
});

const quoteComparisonViewSchema = objectSchema<QuoteComparisonView>({
  invitations: arraySchema(invitationViewSchema),
  pairId: stringSchema(),
  rfqId: stringSchema(),
  responseWindowClosesAt: optionalSchema(stringSchema()),
  subscriberId: stringSchema(),
  side: enumSchema(["buy", "sell"]),
  tieBreakRule: stringSchema(),
  quotes: arraySchema(quoteComparisonItemSchema)
});

const operatorOversightQuoteSchema = objectSchema<OperatorOversightView["quotes"][number]>({
  quoteId: stringSchema(),
  rfqId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  createdAt: stringSchema(),
  expiresAt: stringSchema(),
  status: enumSchema(["accepted", "expired", "open", "stale", "withdrawn"]),
  price: nullableSchema(numberSchema()),
  quantity: nullableSchema(numberSchema())
});

const venueHealthSchema = objectSchema<VenueHealthReadModel>({
  title: stringSchema(),
  status: enumSchema(["healthy", "paused", "rejected"]),
  detail: stringSchema(),
  summary: objectSchema<VenueHealthReadModel["summary"]>({
    pairId: stringSchema(),
    mode: enumSchema(["ATSPair", "SingleDealerPair"]),
    operatorId: stringSchema(),
    dealers: arraySchema(stringSchema()),
    paused: booleanSchema(),
    rulebookVersion: stringSchema(),
    activeParticipantCount: numberSchema(),
    ledgerFacts: arraySchema(stringSchema()),
    offLedgerFacts: arraySchema(stringSchema())
  }),
  violations: arraySchema(stringSchema())
});

const operatorViewSchema = objectSchema<OperatorView>({
  pair: pairSummaryViewSchema,
  access: participantAccessSchema,
  rfqs: arraySchema(rfqViewSchema),
  quotes: arraySchema(quoteViewSchema),
  executions: arraySchema(executionViewSchema),
  settlements: arraySchema(settlementViewSchema),
  health: venueHealthSchema
});

const subscriberViewSchema = objectSchema<SubscriberView>({
  availableDealerIds: arraySchema(stringSchema()),
  pair: pairSummaryViewSchema,
  subscriberId: stringSchema(),
  entitlements: arraySchema(stringSchema()),
  canOpenRfq: booleanSchema(),
  rfqs: arraySchema(rfqViewSchema),
  quotes: arraySchema(quoteViewSchema),
  executions: arraySchema(executionViewSchema),
  settlements: arraySchema(settlementViewSchema)
});

const dealerWorkbenchViewSchema = objectSchema<DealerWorkbenchView>({
  pair: pairSummaryViewSchema,
  dealerId: stringSchema(),
  rfqs: arraySchema(rfqViewSchema),
  quotes: arraySchema(quoteViewSchema),
  executions: arraySchema(executionViewSchema)
});

const dealerInvitationHistoryViewSchema = objectSchema<DealerInvitationHistoryView>({
  pair: pairSummaryViewSchema,
  dealerId: stringSchema(),
  invitations: arraySchema(invitationViewSchema),
  quotes: arraySchema(quoteViewSchema),
  revisions: arraySchema(quoteRevisionViewSchema),
  withdrawals: arraySchema(quoteWithdrawalViewSchema)
});

const operatorOversightViewSchema = objectSchema<OperatorOversightView>({
  access: participantAccessSchema,
  dealerUniverse: arraySchema(stringSchema()),
  executions: arraySchema(executionViewSchema),
  health: venueHealthSchema,
  pair: pairSummaryViewSchema,
  inviteRevisionPolicy: enumSchema(["before_first_response", "locked"]),
  oversightRole: enumSchema(["blinded", "full"]),
  rfqs: arraySchema(rfqViewSchema),
  invitations: arraySchema(invitationViewSchema),
  quotes: arraySchema(operatorOversightQuoteSchema),
  quoteLadders: arraySchema(quoteComparisonViewSchema),
  revisions: arraySchema(quoteRevisionViewSchema),
  settlements: arraySchema(settlementViewSchema),
  withdrawals: arraySchema(quoteWithdrawalViewSchema),
  audits: arraySchema(
    objectSchema<OperatorOversightView["audits"][number]>({
      action: stringSchema(),
      actorId: stringSchema(),
      at: stringSchema(),
      detail: stringSchema(),
      entityId: optionalSchema(stringSchema()),
      pairId: stringSchema()
    })
  )
});

const auditTrailViewSchema = objectSchema<AuditTrailView>({
  pairId: stringSchema(),
  entries: arraySchema(
    objectSchema<AuditTrailView["entries"][number]>({
      action: stringSchema(),
      actorId: stringSchema(),
      at: stringSchema(),
      detail: stringSchema(),
      entityId: optionalSchema(stringSchema()),
      pairId: stringSchema()
    })
  )
});

const createPairRequestSchemaBase = objectSchema<CreatePairRequest>({
  mode: enumSchema(["ATSPair", "SingleDealerPair"]),
  operatorId: stringSchema(),
  dealerId: optionalSchema(stringSchema()),
  dealerIds: optionalSchema(arraySchema(stringSchema())),
  operatorOversightRole: optionalSchema(enumSchema(["blinded", "full"])),
  inviteRevisionPolicy: optionalSchema(enumSchema(["before_first_response", "locked"])),
  pairId: optionalSchema(stringSchema()),
  jurisdiction: stringSchema(),
  rulebookVersion: stringSchema(),
  rulebookSummary: stringSchema()
});

export const createPairRequestSchema: Schema<CreatePairRequest> = {
  ...createPairRequestSchemaBase,
  parse(value, path = "$") {
    const parsed = createPairRequestSchemaBase.parse(value, path);

    if (parsed.mode === "SingleDealerPair" && parsed.dealerId === undefined) {
      throw new ContractValidationError(`${path}.dealerId`, "is required");
    }

    if (
      parsed.mode === "ATSPair" &&
      (parsed.dealerIds === undefined || parsed.dealerIds.length < 2)
    ) {
      throw new ContractValidationError(`${path}.dealerIds`, "must include at least two dealers");
    }

    return parsed;
  }
};

export const grantAccessRequestSchema = objectSchema<GrantAccessRequest>({
  subjectId: stringSchema(),
  role: enumSchema(["auditor", "dealer", "operator", "settlement_delegate", "subscriber"]),
  entitlements: optionalSchema(arraySchema(stringSchema()))
});

export const pausePairRequestSchema = objectSchema<PausePairRequest>({
  state: enumSchema(["active", "paused"]),
  reason: optionalSchema(stringSchema())
});

export const openRfqRequestSchema = objectSchema<OpenRfqRequest>({
  instrumentId: stringSchema(),
  side: enumSchema(["buy", "sell"]),
  quantity: numberSchema(),
  responseWindowClosesAt: optionalSchema(stringSchema())
});

export const inviteDealersRequestSchema = objectSchema<InviteDealersRequest>({
  dealerIds: arraySchema(stringSchema())
});

export const rejectRfqRequestSchema = objectSchema<RejectRfqRequest>({
  reason: optionalSchema(stringSchema())
});

export const submitQuoteRequestSchema = objectSchema<SubmitQuoteRequest>({
  price: numberSchema(),
  quantity: numberSchema(),
  expiresAt: stringSchema()
});

export const withdrawQuoteRequestSchema = objectSchema<WithdrawQuoteRequest>({
  reason: optionalSchema(stringSchema())
});

export const rejectAllQuotesRequestSchema = objectSchema<RejectAllQuotesRequest>({
  reason: optionalSchema(stringSchema())
});

export const markSettlementProgressionRequestSchema =
  objectSchema<MarkSettlementProgressionRequest>({
    status: enumSchema(["affirmed", "failed", "instructed", "pending", "settled"])
  });

export const submitDarkOrderRequestSchema = objectSchema<SubmitDarkOrderRequest>({
  clientOrderId: stringSchema(),
  expiresAt: optionalSchema(stringSchema()),
  instrumentId: stringSchema(),
  limitPrice: numberSchema(),
  quantity: numberSchema(),
  side: enumSchema(["buy", "sell"])
});

const generateMatchProposalRequestSchemaBase = objectSchema<GenerateMatchProposalRequest>({
  buyOrderId: optionalSchema(stringSchema()),
  expiresAt: optionalSchema(stringSchema()),
  sellOrderId: optionalSchema(stringSchema())
});

export const generateMatchProposalRequestSchema: Schema<GenerateMatchProposalRequest> = {
  ...generateMatchProposalRequestSchemaBase,
  parse(value, path = "$") {
    const parsed = generateMatchProposalRequestSchemaBase.parse(value, path);

    if ((parsed.buyOrderId === undefined) !== (parsed.sellOrderId === undefined)) {
      throw new ContractValidationError(
        path,
        "buyOrderId and sellOrderId must either both be provided or both be omitted"
      );
    }

    return parsed;
  }
};

export const rejectMatchRequestSchema = objectSchema<RejectMatchRequest>({
  reason: optionalSchema(stringSchema())
});

export const healthResponseSchema = objectSchema<HealthResponse>({
  service: enumSchema(["venue-api"]),
  generatedAt: stringSchema(),
  venue: venueHealthSchema
});

export const darkSubscriberStateResponseSchema = objectSchema<DarkSubscriberStateResponse>({
  executions: arraySchema(executionViewSchema),
  locks: arraySchema(orderLockSchema),
  orders: arraySchema(darkOrderSchema),
  proposals: arraySchema(matchProposalSchema),
  settlements: arraySchema(settlementViewSchema),
  subscriberId: stringSchema()
});

export const demoResetRequestSchema = objectSchema<DemoResetRequest>({
  mode: enumSchema(["empty", "phase1-complete", "phase1-ready", "phase2-ready", "phase3-ready"]),
  seed: optionalSchema(numberSchema())
});

export const demoClockAdvanceRequestSchema = objectSchema<DemoClockAdvanceRequest>({
  milliseconds: numberSchema()
});

export const demoStatusResponseSchema = objectSchema<DemoStatusResponse>({
  buyOrderId: optionalSchema(stringSchema()),
  currentTime: stringSchema(),
  dealerIds: arraySchema(stringSchema()),
  mode: enumSchema(["empty", "phase1-complete", "phase1-ready", "phase2-ready", "phase3-ready"]),
  seed: numberSchema(),
  pairId: stringSchema(),
  operatorId: stringSchema(),
  dealerId: stringSchema(),
  proposalId: optionalSchema(stringSchema()),
  secondarySubscriberId: optionalSchema(stringSchema()),
  sellOrderId: optionalSchema(stringSchema()),
  subscriberId: stringSchema()
});

export const parseCreatePairRequest = (value: unknown): CreatePairRequest =>
  createPairRequestSchema.parse(value);

export const parseHealthResponse = (value: unknown): HealthResponse =>
  healthResponseSchema.parse(value);

export const parseDarkSubscriberStateResponse = (value: unknown): DarkSubscriberStateResponse =>
  darkSubscriberStateResponseSchema.parse(value);

export const parseOperatorView = (value: unknown): OperatorView => operatorViewSchema.parse(value);

export const parseSubscriberView = (value: unknown): SubscriberView =>
  subscriberViewSchema.parse(value);

export const parseDealerWorkbenchView = (value: unknown): DealerWorkbenchView =>
  dealerWorkbenchViewSchema.parse(value);

export const parseDealerInvitationHistoryView = (value: unknown): DealerInvitationHistoryView =>
  dealerInvitationHistoryViewSchema.parse(value);

export const parseQuoteComparisonView = (value: unknown): QuoteComparisonView =>
  quoteComparisonViewSchema.parse(value);

export const parseOperatorOversightView = (value: unknown): OperatorOversightView =>
  operatorOversightViewSchema.parse(value);

export const parseAuditTrailView = (value: unknown): AuditTrailView =>
  auditTrailViewSchema.parse(value);

export const parseDemoResetRequest = (value: unknown): DemoResetRequest =>
  demoResetRequestSchema.parse(value);

export const parseDemoClockAdvanceRequest = (value: unknown): DemoClockAdvanceRequest =>
  demoClockAdvanceRequestSchema.parse(value);

export const parseDemoStatusResponse = (value: unknown): DemoStatusResponse =>
  demoStatusResponseSchema.parse(value);

export const parseSubmitDarkOrderRequest = (value: unknown): SubmitDarkOrderRequest =>
  submitDarkOrderRequestSchema.parse(value);

export const parseGenerateMatchProposalRequest = (value: unknown): GenerateMatchProposalRequest =>
  generateMatchProposalRequestSchema.parse(value);

export const parseRejectMatchRequest = (value: unknown): RejectMatchRequest =>
  rejectMatchRequestSchema.parse(value);

export const contractSchemas = {
  CreatePairRequest: createPairRequestSchema,
  GrantAccessRequest: grantAccessRequestSchema,
  PausePairRequest: pausePairRequestSchema,
  OpenRfqRequest: openRfqRequestSchema,
  InviteDealersRequest: inviteDealersRequestSchema,
  RejectRfqRequest: rejectRfqRequestSchema,
  SubmitQuoteRequest: submitQuoteRequestSchema,
  WithdrawQuoteRequest: withdrawQuoteRequestSchema,
  RejectAllQuotesRequest: rejectAllQuotesRequestSchema,
  MarkSettlementProgressionRequest: markSettlementProgressionRequestSchema,
  SubmitDarkOrderRequest: submitDarkOrderRequestSchema,
  GenerateMatchProposalRequest: generateMatchProposalRequestSchema,
  RejectMatchRequest: rejectMatchRequestSchema,
  OperatorView: operatorViewSchema,
  SubscriberView: subscriberViewSchema,
  DealerWorkbenchView: dealerWorkbenchViewSchema,
  DealerInvitationHistoryView: dealerInvitationHistoryViewSchema,
  QuoteComparisonView: quoteComparisonViewSchema,
  OperatorOversightView: operatorOversightViewSchema,
  AuditTrailView: auditTrailViewSchema,
  VenueHealthReadModel: venueHealthSchema,
  HealthResponse: healthResponseSchema,
  DarkSubscriberStateResponse: darkSubscriberStateResponseSchema,
  DemoResetRequest: demoResetRequestSchema,
  DemoClockAdvanceRequest: demoClockAdvanceRequestSchema,
  DemoStatusResponse: demoStatusResponseSchema
} as const;

const ref = (name: keyof typeof contractSchemas) => ({
  $ref: `#/components/schemas/${name}`
});

export const generateOpenApiDocument = () => ({
  openapi: "3.1.0",
  info: {
    title: "Canton Dark Venue API",
    version: "0.0.0"
  },
  paths: {
    "/health": {
      get: {
        responses: {
          "200": {
            description: "Venue health projection",
            content: {
              "application/json": {
                schema: ref("HealthResponse")
              }
            }
          }
        }
      }
    },
    "/demo/status": {
      get: {
        responses: {
          "200": {
            description: "Current demo bootstrap status",
            content: {
              "application/json": {
                schema: ref("DemoStatusResponse")
              }
            }
          }
        }
      }
    },
    "/demo/reset": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("DemoResetRequest")
            }
          }
        },
        responses: {
          "200": {
            description: "Demo state reset",
            content: {
              "application/json": {
                schema: ref("DemoStatusResponse")
              }
            }
          }
        }
      }
    },
    "/demo/clock/advance": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("DemoClockAdvanceRequest")
            }
          }
        },
        responses: {
          "200": {
            description: "Demo clock advanced",
            content: {
              "application/json": {
                schema: ref("DemoStatusResponse")
              }
            }
          }
        }
      }
    },
    "/pairs": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("CreatePairRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/access": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("GrantAccessRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/dark-orders": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("SubmitDarkOrderRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/dark-orders/{orderId}/cancel": {
      post: {
        responses: {
          "200": {
            description: "Dark order cancelled"
          }
        }
      }
    },
    "/pairs/{pairId}/match-proposals": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("GenerateMatchProposalRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/match-proposals/{proposalId}/accept": {
      post: {
        responses: {
          "200": {
            description: "Match proposal accepted"
          }
        }
      }
    },
    "/pairs/{pairId}/match-proposals/{proposalId}/reject": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("RejectMatchRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/match-proposals/{proposalId}/release-expired": {
      post: {
        responses: {
          "200": {
            description: "Expired proposal locks released"
          }
        }
      }
    },
    "/pairs/{pairId}/match-proposals/{proposalId}/execute": {
      post: {
        responses: {
          "200": {
            description: "Dark execution created"
          }
        }
      }
    },
    "/pairs/{pairId}/pause": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("PausePairRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("OpenRfqRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/invite-dealers": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("InviteDealersRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/revise-invite-set": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("InviteDealersRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/reject": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("RejectRfqRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/cancel": {
      post: {
        responses: {
          "200": {
            description: "RFQ cancelled"
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/quotes": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("SubmitQuoteRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/quotes/{quoteId}/revise": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("SubmitQuoteRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/quotes/{quoteId}/withdraw": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("WithdrawQuoteRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/quotes/{quoteId}/accept": {
      post: {
        responses: {
          "200": {
            description: "Quote accepted"
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/reject-all": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("RejectAllQuotesRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/settlements/{instructionId}/progress": {
      post: {
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: ref("MarkSettlementProgressionRequest")
            }
          }
        }
      }
    },
    "/pairs/{pairId}/views/operator": {
      get: {
        responses: {
          "200": {
            description: "Operator view",
            content: {
              "application/json": {
                schema: ref("OperatorView")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/views/subscriber": {
      get: {
        responses: {
          "200": {
            description: "Subscriber view",
            content: {
              "application/json": {
                schema: ref("SubscriberView")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/views/dark-subscriber": {
      get: {
        responses: {
          "200": {
            description: "Dark subscriber scoped state",
            content: {
              "application/json": {
                schema: ref("DarkSubscriberStateResponse")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/views/dealer-workbench": {
      get: {
        responses: {
          "200": {
            description: "Dealer workbench view",
            content: {
              "application/json": {
                schema: ref("DealerWorkbenchView")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/views/operator-oversight": {
      get: {
        responses: {
          "200": {
            description: "Operator oversight view",
            content: {
              "application/json": {
                schema: ref("OperatorOversightView")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/rfqs/{rfqId}/quote-ladder": {
      get: {
        responses: {
          "200": {
            description: "Subscriber quote ladder",
            content: {
              "application/json": {
                schema: ref("QuoteComparisonView")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/dealers/{dealerId}/history": {
      get: {
        responses: {
          "200": {
            description: "Dealer invitation and quote history",
            content: {
              "application/json": {
                schema: ref("DealerInvitationHistoryView")
              }
            }
          }
        }
      }
    },
    "/pairs/{pairId}/audit-trail": {
      get: {
        responses: {
          "200": {
            description: "Audit trail view",
            content: {
              "application/json": {
                schema: ref("AuditTrailView")
              }
            }
          }
        }
      }
    }
  },
  components: {
    schemas: Object.fromEntries(
      Object.entries(contractSchemas).map(([name, schema]) => [name, schema.openapi])
    )
  }
});
