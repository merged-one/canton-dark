import type {
  AuditTrailView,
  DealerWorkbenchView,
  OperatorView,
  SubscriberView,
  VenueHealthReadModel
} from "@canton-dark/query-models";
import type { Entitlement } from "@canton-dark/domain-core";

export type CreatePairRequest = {
  dealerId: string;
  jurisdiction: string;
  mode: "SingleDealerPair";
  operatorId: string;
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
  side: "buy" | "sell";
};

export type RejectRfqRequest = {
  reason?: string;
};

export type SubmitQuoteRequest = {
  expiresAt: string;
  price: number;
  quantity: number;
};

export type MarkSettlementProgressionRequest = {
  status: "affirmed" | "failed" | "instructed" | "pending" | "settled";
};

export type HealthResponse = {
  generatedAt: string;
  service: "venue-api";
  venue: VenueHealthReadModel;
};

export type DemoMode = "empty" | "phase1-complete" | "phase1-ready";

export type DemoResetRequest = {
  mode: DemoMode;
  seed?: number;
};

export type DemoClockAdvanceRequest = {
  milliseconds: number;
};

export type DemoStatusResponse = {
  currentTime: string;
  dealerId: string;
  mode: DemoMode;
  operatorId: string;
  pairId: string;
  seed: number;
  subscriberId: string;
};

export type OpenApiSchema = {
  additionalProperties?: boolean;
  description?: string;
  enum?: readonly string[];
  items?: OpenApiSchema;
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
  mode: enumSchema(["SingleDealerPair"]),
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
  status: enumSchema(["accepted", "expired", "open"]),
  createdAt: stringSchema()
});

const executionViewSchema = objectSchema<OperatorView["executions"][number]>({
  executionId: stringSchema(),
  pairId: stringSchema(),
  rfqId: stringSchema(),
  quoteId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema(),
  instrumentId: stringSchema(),
  side: enumSchema(["buy", "sell"]),
  quantity: numberSchema(),
  price: numberSchema(),
  acceptedAt: stringSchema()
});

const settlementViewSchema = objectSchema<OperatorView["settlements"][number]>({
  instructionId: stringSchema(),
  executionId: stringSchema(),
  status: enumSchema(["affirmed", "failed", "instructed", "pending", "settled"]),
  createdAt: stringSchema(),
  updatedAt: stringSchema()
});

const venueHealthSchema = objectSchema<VenueHealthReadModel>({
  title: stringSchema(),
  status: enumSchema(["healthy", "paused", "rejected"]),
  detail: stringSchema(),
  summary: objectSchema<VenueHealthReadModel["summary"]>({
    pairId: stringSchema(),
    mode: enumSchema(["SingleDealerPair"]),
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

export const createPairRequestSchema = objectSchema<CreatePairRequest>({
  mode: enumSchema(["SingleDealerPair"]),
  operatorId: stringSchema(),
  dealerId: stringSchema(),
  pairId: optionalSchema(stringSchema()),
  jurisdiction: stringSchema(),
  rulebookVersion: stringSchema(),
  rulebookSummary: stringSchema()
});

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
  quantity: numberSchema()
});

export const rejectRfqRequestSchema = objectSchema<RejectRfqRequest>({
  reason: optionalSchema(stringSchema())
});

export const submitQuoteRequestSchema = objectSchema<SubmitQuoteRequest>({
  price: numberSchema(),
  quantity: numberSchema(),
  expiresAt: stringSchema()
});

export const markSettlementProgressionRequestSchema =
  objectSchema<MarkSettlementProgressionRequest>({
    status: enumSchema(["affirmed", "failed", "instructed", "pending", "settled"])
  });

export const healthResponseSchema = objectSchema<HealthResponse>({
  service: enumSchema(["venue-api"]),
  generatedAt: stringSchema(),
  venue: venueHealthSchema
});

export const demoResetRequestSchema = objectSchema<DemoResetRequest>({
  mode: enumSchema(["empty", "phase1-complete", "phase1-ready"]),
  seed: optionalSchema(numberSchema())
});

export const demoClockAdvanceRequestSchema = objectSchema<DemoClockAdvanceRequest>({
  milliseconds: numberSchema()
});

export const demoStatusResponseSchema = objectSchema<DemoStatusResponse>({
  currentTime: stringSchema(),
  mode: enumSchema(["empty", "phase1-complete", "phase1-ready"]),
  seed: numberSchema(),
  pairId: stringSchema(),
  operatorId: stringSchema(),
  dealerId: stringSchema(),
  subscriberId: stringSchema()
});

export const parseCreatePairRequest = (value: unknown): CreatePairRequest =>
  createPairRequestSchema.parse(value);

export const parseHealthResponse = (value: unknown): HealthResponse =>
  healthResponseSchema.parse(value);

export const parseOperatorView = (value: unknown): OperatorView => operatorViewSchema.parse(value);

export const parseSubscriberView = (value: unknown): SubscriberView =>
  subscriberViewSchema.parse(value);

export const parseDealerWorkbenchView = (value: unknown): DealerWorkbenchView =>
  dealerWorkbenchViewSchema.parse(value);

export const parseAuditTrailView = (value: unknown): AuditTrailView =>
  auditTrailViewSchema.parse(value);

export const parseDemoResetRequest = (value: unknown): DemoResetRequest =>
  demoResetRequestSchema.parse(value);

export const parseDemoClockAdvanceRequest = (value: unknown): DemoClockAdvanceRequest =>
  demoClockAdvanceRequestSchema.parse(value);

export const parseDemoStatusResponse = (value: unknown): DemoStatusResponse =>
  demoStatusResponseSchema.parse(value);

export const contractSchemas = {
  CreatePairRequest: createPairRequestSchema,
  GrantAccessRequest: grantAccessRequestSchema,
  PausePairRequest: pausePairRequestSchema,
  OpenRfqRequest: openRfqRequestSchema,
  RejectRfqRequest: rejectRfqRequestSchema,
  SubmitQuoteRequest: submitQuoteRequestSchema,
  MarkSettlementProgressionRequest: markSettlementProgressionRequestSchema,
  OperatorView: operatorViewSchema,
  SubscriberView: subscriberViewSchema,
  DealerWorkbenchView: dealerWorkbenchViewSchema,
  AuditTrailView: auditTrailViewSchema,
  VenueHealthReadModel: venueHealthSchema,
  HealthResponse: healthResponseSchema,
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
    "/pairs/{pairId}/quotes/{quoteId}/accept": {
      post: {
        responses: {
          "200": {
            description: "Quote accepted"
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
