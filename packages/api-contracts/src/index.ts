import type { PairSummaryView, VenueHealthReadModel } from "@canton-dark/query-models";

export type RegisterPairRequest = {
  dealers: readonly string[];
  jurisdiction: string;
  mode: "ATSPair" | "SingleDealerPair";
  operatorId: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessRequest = {
  entitlements?: readonly string[];
  role: "auditor" | "dealer" | "operator" | "settlement_delegate" | "subscriber";
  subjectId: string;
};

export type PausePairRequest = {
  reason?: string;
  state: "active" | "paused";
};

export type SubmitRfqRequest = {
  directedDealerIds: readonly string[];
  expiresAt: string;
  instrumentId: string;
  quantity: number;
  side: "buy" | "sell";
};

export type SubmitDarkOrderRequest = {
  limitPrice: number;
  quantity: number;
  side: "buy" | "sell";
};

export type HealthResponse = {
  generatedAt: string;
  service: "venue-api";
  venue: VenueHealthReadModel;
};

export type ValidateVenueResponse = {
  ok: boolean;
  violations: readonly string[];
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

      if (record[key] === undefined) {
        if (schema.optional === true) {
          continue;
        }

        throw new ContractValidationError(nextPath, "is required");
      }

      result[key] = schema.parse(record[key], nextPath);
    }

    return result as T;
  }
});

const pairSummaryViewSchema = objectSchema<PairSummaryView>({
  pairId: stringSchema(),
  mode: enumSchema(["ATSPair", "SingleDealerPair"]),
  operatorId: stringSchema(),
  dealers: arraySchema(stringSchema()),
  paused: booleanSchema(),
  rulebookVersion: stringSchema(),
  approvalStatus: enumSchema(["approved", "rejected"]),
  attestationStatus: enumSchema(["attested", "expired"])
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

export const registerPairRequestSchema = objectSchema<RegisterPairRequest>({
  mode: enumSchema(["ATSPair", "SingleDealerPair"]),
  operatorId: stringSchema(),
  dealers: arraySchema(stringSchema()),
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

export const submitRfqRequestSchema = objectSchema<SubmitRfqRequest>({
  directedDealerIds: arraySchema(stringSchema()),
  instrumentId: stringSchema(),
  side: enumSchema(["buy", "sell"]),
  quantity: numberSchema(),
  expiresAt: stringSchema()
});

export const submitDarkOrderRequestSchema = objectSchema<SubmitDarkOrderRequest>({
  side: enumSchema(["buy", "sell"]),
  quantity: numberSchema(),
  limitPrice: numberSchema()
});

export const healthResponseSchema = objectSchema<HealthResponse>({
  service: enumSchema(["venue-api"]),
  generatedAt: stringSchema(),
  venue: venueHealthSchema
});

export const validateVenueResponseSchema = objectSchema<ValidateVenueResponse>({
  ok: booleanSchema(),
  violations: arraySchema(stringSchema())
});

export const parseRegisterPairRequest = (value: unknown): RegisterPairRequest =>
  registerPairRequestSchema.parse(value);

export const parseHealthResponse = (value: unknown): HealthResponse =>
  healthResponseSchema.parse(value);

export const contractSchemas = {
  RegisterPairRequest: registerPairRequestSchema,
  GrantAccessRequest: grantAccessRequestSchema,
  PausePairRequest: pausePairRequestSchema,
  SubmitRfqRequest: submitRfqRequestSchema,
  SubmitDarkOrderRequest: submitDarkOrderRequestSchema,
  PairSummaryView: pairSummaryViewSchema,
  VenueHealthReadModel: venueHealthSchema,
  HealthResponse: healthResponseSchema,
  ValidateVenueResponse: validateVenueResponseSchema
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
              schema: ref("RegisterPairRequest")
            }
          }
        },
        responses: {
          "201": {
            description: "Registered pair summary",
            content: {
              "application/json": {
                schema: ref("PairSummaryView")
              }
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
        },
        responses: {
          "202": {
            description: "Access grant accepted"
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
        },
        responses: {
          "202": {
            description: "Pause state updated"
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
              schema: ref("SubmitRfqRequest")
            }
          }
        },
        responses: {
          "202": {
            description: "RFQ accepted"
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
        },
        responses: {
          "202": {
            description: "Dark order accepted"
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
