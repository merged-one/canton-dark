import {
  createMemoryVenueEnvironment,
  type MemoryVenueEnvironment
} from "@canton-dark/adapters-memory";
import {
  ContractValidationError,
  parseCreatePairRequest,
  type HealthResponse
} from "@canton-dark/api-contracts";
import {
  grantAccessRequestSchema,
  markSettlementProgressionRequestSchema,
  openRfqRequestSchema,
  pausePairRequestSchema,
  rejectRfqRequestSchema,
  submitQuoteRequestSchema
} from "@canton-dark/api-contracts";
import { DomainError } from "@canton-dark/domain-core";

type ApiRequest = {
  body?: unknown;
  headers?: Record<string, string | undefined>;
  method: string;
  url: string;
};

type ApiReply = {
  body: unknown;
  status: number;
};

export type VenueApiApp = {
  demoPairId: string;
  environment: MemoryVenueEnvironment;
  handleRequest: (request: ApiRequest) => Promise<ApiReply>;
};

const createReply = (status: number, body: unknown): ApiReply => ({
  status,
  body
});

const getActorId = (request: ApiRequest, url: URL): string => {
  const actorId = request.headers?.["x-actor-id"] ?? url.searchParams.get("actorId");

  if (actorId == null || actorId.trim() === "") {
    throw new ContractValidationError("$.actorId", "is required");
  }

  return actorId;
};

const handleError = (error: unknown): ApiReply => {
  if (error instanceof ContractValidationError) {
    return createReply(400, {
      message: error.message,
      path: error.path
    });
  }

  if (error instanceof DomainError) {
    return createReply(409, {
      code: error.code,
      message: error.message
    });
  }

  if (error instanceof Error) {
    if (error.message.endsWith("was not found.")) {
      return createReply(404, {
        message: error.message
      });
    }

    return createReply(500, {
      message: error.message
    });
  }

  return createReply(500, {
    message: "Unknown error"
  });
};

const parseBody = <T>(value: unknown, parser: (input: unknown) => T): T => parser(value ?? {});

const seedDemoState = async (environment: MemoryVenueEnvironment): Promise<string> => {
  const pair = await environment.application.createPair({
    actorId: "operator-demo",
    operatorId: "operator-demo",
    dealerId: "dealer-alpha",
    jurisdiction: "US",
    pairId: "pair-demo",
    rulebookSummary: "initial",
    rulebookVersion: "v1"
  });

  await environment.application.grantAccess({
    actorId: "operator-demo",
    pairId: pair.pairId,
    subjectId: "subscriber-1",
    role: "subscriber"
  });

  return pair.pairId;
};

export const createVenueApiApp = async (
  environment: MemoryVenueEnvironment = createMemoryVenueEnvironment()
): Promise<VenueApiApp> => {
  const demoPairId =
    (await environment.application.listPairs())[0]?.pairId ?? (await seedDemoState(environment));

  const handleRequest = async (request: ApiRequest): Promise<ApiReply> => {
    const url = new URL(request.url, "http://127.0.0.1:4301");

    try {
      if (request.method === "GET" && url.pathname === "/health") {
        const pairId = url.searchParams.get("pairId") ?? demoPairId;
        const venue = await environment.application.getVenueHealth(pairId);

        if (venue === null) {
          return createReply(404, {
            message: `Pair ${pairId} was not found.`
          });
        }

        const response: HealthResponse = {
          service: "venue-api",
          generatedAt: environment.clock.now().toISOString(),
          venue
        };

        return createReply(200, response);
      }

      if (request.method === "POST" && url.pathname === "/pairs") {
        const body = parseBody(request.body, parseCreatePairRequest);
        const pair = await environment.application.createPair({
          actorId: getActorId(request, url),
          operatorId: body.operatorId,
          dealerId: body.dealerId,
          jurisdiction: body.jurisdiction,
          rulebookSummary: body.rulebookSummary,
          rulebookVersion: body.rulebookVersion
        });

        return createReply(201, pair);
      }

      const path = url.pathname.split("/").filter(Boolean);

      if (path[0] !== "pairs" || path[1] === undefined) {
        return createReply(404, { message: "Not found" });
      }

      const pairId = path[1];

      if (request.method === "POST" && path[2] === "access" && path.length === 3) {
        const body = parseBody(request.body, (value) => grantAccessRequestSchema.parse(value));

        return createReply(
          201,
          await environment.application.grantAccess({
            actorId: getActorId(request, url),
            pairId,
            subjectId: body.subjectId,
            role: body.role,
            ...(body.entitlements !== undefined ? { entitlements: body.entitlements } : {})
          })
        );
      }

      if (request.method === "POST" && path[2] === "pause" && path.length === 3) {
        const body = parseBody(request.body, (value) => pausePairRequestSchema.parse(value));

        return createReply(
          200,
          await environment.application.pausePair({
            actorId: getActorId(request, url),
            pairId,
            state: body.state,
            ...(body.reason !== undefined ? { reason: body.reason } : {})
          })
        );
      }

      if (request.method === "POST" && path[2] === "rfqs" && path.length === 3) {
        const body = parseBody(request.body, (value) => openRfqRequestSchema.parse(value));

        return createReply(
          201,
          await environment.application.openRfq({
            actorId: getActorId(request, url),
            pairId,
            instrumentId: body.instrumentId,
            side: body.side,
            quantity: body.quantity
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "reject"
      ) {
        const body = parseBody(request.body, (value) => rejectRfqRequestSchema.parse(value));

        return createReply(
          200,
          await environment.application.rejectRfq({
            actorId: getActorId(request, url),
            pairId,
            rfqId: path[3],
            ...(body.reason !== undefined ? { reason: body.reason } : {})
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "cancel"
      ) {
        return createReply(
          200,
          await environment.application.cancelRfq({
            actorId: getActorId(request, url),
            pairId,
            rfqId: path[3]
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "quotes"
      ) {
        const body = parseBody(request.body, (value) => submitQuoteRequestSchema.parse(value));

        return createReply(
          201,
          await environment.application.submitQuote({
            actorId: getActorId(request, url),
            pairId,
            rfqId: path[3],
            price: body.price,
            quantity: body.quantity,
            expiresAt: body.expiresAt
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "quotes" &&
        path[3] !== undefined &&
        path[4] === "accept"
      ) {
        const quote = await environment.ledger.getQuote(path[3]);

        if (quote === null) {
          return createReply(404, {
            message: `Quote ${path[3]} was not found.`
          });
        }

        return createReply(
          200,
          await environment.application.acceptQuote({
            actorId: getActorId(request, url),
            pairId,
            rfqId: quote.rfqId,
            quoteId: quote.quoteId
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "settlements" &&
        path[3] !== undefined &&
        path[4] === "progress"
      ) {
        const body = parseBody(request.body, (value) =>
          markSettlementProgressionRequestSchema.parse(value)
        );

        return createReply(
          200,
          await environment.application.markSettlementProgression({
            actorId: getActorId(request, url),
            pairId,
            instructionId: path[3],
            status: body.status
          })
        );
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "operator") {
        const view = await environment.application.getOperatorView(pairId);

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "subscriber") {
        const subscriberId = url.searchParams.get("subscriberId");

        if (subscriberId === null) {
          throw new ContractValidationError("$.subscriberId", "is required");
        }

        const view = await environment.application.getSubscriberView(pairId, subscriberId);

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "dealer-workbench") {
        const dealerId = url.searchParams.get("dealerId");

        if (dealerId === null) {
          throw new ContractValidationError("$.dealerId", "is required");
        }

        const view = await environment.application.getDealerWorkbenchView(pairId, dealerId);

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "audit-trail") {
        const view = await environment.application.getAuditTrail(pairId);

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      return createReply(404, { message: "Not found" });
    } catch (error) {
      return handleError(error);
    }
  };

  return {
    demoPairId,
    environment,
    handleRequest
  };
};
