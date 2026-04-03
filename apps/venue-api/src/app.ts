import {
  createMemoryVenueEnvironment,
  type MemoryVenueEnvironment
} from "@canton-dark/adapters-memory";
import {
  ContractValidationError,
  demoClockAdvanceRequestSchema,
  grantAccessRequestSchema,
  inviteDealersRequestSchema,
  markSettlementProgressionRequestSchema,
  openRfqRequestSchema,
  parseCreatePairRequest,
  parseDemoResetRequest,
  pausePairRequestSchema,
  rejectRfqRequestSchema,
  rejectAllQuotesRequestSchema,
  submitQuoteRequestSchema,
  withdrawQuoteRequestSchema,
  type DemoMode,
  type DemoStatusResponse,
  type HealthResponse
} from "@canton-dark/api-contracts";
import {
  phase1DemoDefaults,
  phase2DemoDefaults,
  seedPhase1DemoEnvironment,
  seedPhase2DemoEnvironment,
  type Phase1DemoMode,
  type Phase2DemoMode
} from "@canton-dark/sim-harness";

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

type VenueApiAppOptions = {
  bootstrapMode?: DemoMode;
  environment?: MemoryVenueEnvironment;
  seed?: number;
  startAt?: Date | string;
};

export type VenueApiApp = {
  readonly demoPairId: string;
  readonly environment: MemoryVenueEnvironment;
  handleRequest: (request: ApiRequest) => Promise<ApiReply>;
  resetDemoState: (input: { mode: DemoMode; seed?: number }) => Promise<DemoStatusResponse>;
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

const isDomainErrorLike = (error: unknown): error is { code: string; message: string } =>
  error instanceof Error &&
  "code" in error &&
  typeof (error as { code: unknown }).code === "string";

const handleError = (error: unknown): ApiReply => {
  if (error instanceof ContractValidationError) {
    return createReply(400, {
      message: error.message,
      path: error.path
    });
  }

  if (isDomainErrorLike(error)) {
    return createReply(error.code === "MISSING_ENTITLEMENT" ? 403 : 409, {
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

const isVenueApiAppOptions = (value: unknown): value is VenueApiAppOptions =>
  value !== null &&
  typeof value === "object" &&
  ("bootstrapMode" in value || "environment" in value || "seed" in value || "startAt" in value);

const isPhase2DemoMode = (mode: DemoMode): mode is Phase2DemoMode => mode === "phase2-ready";

const toBootstrapMode = (mode: DemoMode | undefined): DemoMode => mode ?? "phase1-ready";

const resolveDemoDefaults = (mode: DemoMode) =>
  isPhase2DemoMode(mode) ? phase2DemoDefaults : phase1DemoDefaults;

const createEnvironment = (options: VenueApiAppOptions): MemoryVenueEnvironment =>
  createMemoryVenueEnvironment({
    seed: options.seed ?? 424242,
    ...(options.startAt !== undefined ? { startAt: options.startAt } : {})
  });

export const createVenueApiApp = async (
  input?: MemoryVenueEnvironment | VenueApiAppOptions
): Promise<VenueApiApp> => {
  const options =
    input === undefined ? {} : isVenueApiAppOptions(input) ? input : { environment: input };
  const state = {
    environment: options.environment ?? createEnvironment(options),
    mode: toBootstrapMode(options.bootstrapMode),
    seed: options.seed ?? 424242,
    startAt: options.startAt
  };

  const buildDemoStatus = (): DemoStatusResponse => ({
    currentTime: state.environment.clock.now().toISOString(),
    dealerId: resolveDemoDefaults(state.mode).dealerId,
    dealerIds: resolveDemoDefaults(state.mode).dealerIds,
    mode: state.mode,
    operatorId: resolveDemoDefaults(state.mode).operatorId,
    pairId: resolveDemoDefaults(state.mode).pairId,
    seed: state.seed,
    subscriberId: resolveDemoDefaults(state.mode).subscriberId
  });

  const resetDemoState = async (next: {
    mode: DemoMode;
    seed?: number;
  }): Promise<DemoStatusResponse> => {
    state.mode = next.mode;
    state.seed = next.seed ?? state.seed;
    state.environment = createMemoryVenueEnvironment({
      seed: state.seed,
      ...(state.startAt !== undefined ? { startAt: state.startAt } : {})
    });

    if (isPhase2DemoMode(state.mode)) {
      await seedPhase2DemoEnvironment(state.environment, {
        mode: state.mode,
        seed: state.seed
      });
    } else {
      await seedPhase1DemoEnvironment(state.environment, {
        mode: state.mode as Phase1DemoMode,
        seed: state.seed
      });
    }

    return buildDemoStatus();
  };

  if (options.environment === undefined) {
    await resetDemoState({
      mode: state.mode,
      seed: state.seed
    });
  } else {
    state.mode = options.bootstrapMode ?? "empty";
  }

  const handleRequest = async (request: ApiRequest): Promise<ApiReply> => {
    const url = new URL(request.url, "http://127.0.0.1:4301");

    try {
      if (request.method === "GET" && url.pathname === "/demo/status") {
        return createReply(200, buildDemoStatus());
      }

      if (request.method === "POST" && url.pathname === "/demo/reset") {
        return createReply(
          200,
          await resetDemoState(parseBody(request.body, parseDemoResetRequest))
        );
      }

      if (request.method === "POST" && url.pathname === "/demo/clock/advance") {
        const body = parseBody(request.body, (value) => demoClockAdvanceRequestSchema.parse(value));

        state.environment.clock.advanceBy(body.milliseconds);

        return createReply(200, buildDemoStatus());
      }

      if (request.method === "GET" && url.pathname === "/health") {
        const pairId = url.searchParams.get("pairId") ?? buildDemoStatus().pairId;
        const venue = await state.environment.application.getVenueHealth(pairId);

        if (venue === null) {
          return createReply(404, {
            message: `Pair ${pairId} was not found.`
          });
        }

        const response: HealthResponse = {
          service: "venue-api",
          generatedAt: state.environment.clock.now().toISOString(),
          venue
        };

        return createReply(200, response);
      }

      if (request.method === "POST" && url.pathname === "/pairs") {
        const body = parseBody(request.body, parseCreatePairRequest);
        const pair = await state.environment.application.createPair({
          actorId: getActorId(request, url),
          operatorId: body.operatorId,
          jurisdiction: body.jurisdiction,
          mode: body.mode,
          ...(body.dealerId !== undefined ? { dealerId: body.dealerId } : {}),
          ...(body.dealerIds !== undefined ? { dealerIds: body.dealerIds } : {}),
          ...(body.operatorOversightRole !== undefined
            ? { operatorOversightRole: body.operatorOversightRole }
            : {}),
          ...(body.inviteRevisionPolicy !== undefined
            ? { inviteRevisionPolicy: body.inviteRevisionPolicy }
            : {}),
          ...(body.pairId !== undefined ? { pairId: body.pairId } : {}),
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
          await state.environment.application.grantAccess({
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
          await state.environment.application.pausePair({
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
          await state.environment.application.openRfq({
            actorId: getActorId(request, url),
            pairId,
            instrumentId: body.instrumentId,
            side: body.side,
            quantity: body.quantity,
            ...(body.responseWindowClosesAt !== undefined
              ? { responseWindowClosesAt: body.responseWindowClosesAt }
              : {})
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "invite-dealers"
      ) {
        const body = parseBody(request.body, (value) => inviteDealersRequestSchema.parse(value));

        return createReply(
          200,
          await state.environment.application.inviteDealers({
            actorId: getActorId(request, url),
            pairId,
            rfqId: path[3],
            dealerIds: body.dealerIds
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "revise-invite-set"
      ) {
        const body = parseBody(request.body, (value) => inviteDealersRequestSchema.parse(value));

        return createReply(
          200,
          await state.environment.application.reviseInviteSet({
            actorId: getActorId(request, url),
            pairId,
            rfqId: path[3],
            dealerIds: body.dealerIds
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
          await state.environment.application.rejectRfq({
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
          await state.environment.application.cancelRfq({
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
          await state.environment.application.submitQuote({
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
        path[4] === "revise"
      ) {
        const body = parseBody(request.body, (value) => submitQuoteRequestSchema.parse(value));
        const quote = await state.environment.ledger.getQuote(path[3]);

        if (quote === null) {
          return createReply(404, {
            message: `Quote ${path[3]} was not found.`
          });
        }

        return createReply(
          200,
          await state.environment.application.reviseQuote({
            actorId: getActorId(request, url),
            pairId,
            rfqId: quote.rfqId,
            quoteId: quote.quoteId,
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
        path[4] === "withdraw"
      ) {
        const body = parseBody(request.body, (value) => withdrawQuoteRequestSchema.parse(value));
        const quote = await state.environment.ledger.getQuote(path[3]);

        if (quote === null) {
          return createReply(404, {
            message: `Quote ${path[3]} was not found.`
          });
        }

        return createReply(
          200,
          await state.environment.application.withdrawQuote({
            actorId: getActorId(request, url),
            pairId,
            rfqId: quote.rfqId,
            quoteId: quote.quoteId,
            ...(body.reason !== undefined ? { reason: body.reason } : {})
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "quotes" &&
        path[3] !== undefined &&
        path[4] === "accept"
      ) {
        const quote = await state.environment.ledger.getQuote(path[3]);

        if (quote === null) {
          return createReply(404, {
            message: `Quote ${path[3]} was not found.`
          });
        }

        return createReply(
          200,
          await state.environment.application.acceptQuote({
            actorId: getActorId(request, url),
            pairId,
            rfqId: quote.rfqId,
            quoteId: quote.quoteId
          })
        );
      }

      if (
        request.method === "POST" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "reject-all"
      ) {
        const body = parseBody(request.body, (value) => rejectAllQuotesRequestSchema.parse(value));

        return createReply(
          200,
          await state.environment.application.rejectAllQuotes({
            actorId: getActorId(request, url),
            pairId,
            rfqId: path[3],
            ...(body.reason !== undefined ? { reason: body.reason } : {})
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
          await state.environment.application.markSettlementProgression({
            actorId: getActorId(request, url),
            pairId,
            instructionId: path[3],
            status: body.status
          })
        );
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "operator") {
        const view = await state.environment.application.getOperatorView(
          pairId,
          getActorId(request, url)
        );

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "subscriber") {
        const subscriberId = url.searchParams.get("subscriberId");

        if (subscriberId === null) {
          throw new ContractValidationError("$.subscriberId", "is required");
        }

        const view = await state.environment.application.getSubscriberView(
          pairId,
          subscriberId,
          getActorId(request, url)
        );

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "dealer-workbench") {
        const dealerId = url.searchParams.get("dealerId");

        if (dealerId === null) {
          throw new ContractValidationError("$.dealerId", "is required");
        }

        const view = await state.environment.application.getDealerWorkbenchView(
          pairId,
          dealerId,
          getActorId(request, url)
        );

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "views" && path[3] === "operator-oversight") {
        const view = await state.environment.application.getOperatorOversightView(
          pairId,
          getActorId(request, url)
        );

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (request.method === "GET" && path[2] === "audit-trail") {
        const view = await state.environment.application.getAuditTrail(
          pairId,
          getActorId(request, url)
        );

        return view === null
          ? createReply(404, { message: `Pair ${pairId} was not found.` })
          : createReply(200, view);
      }

      if (
        request.method === "GET" &&
        path[2] === "rfqs" &&
        path[3] !== undefined &&
        path[4] === "quote-ladder"
      ) {
        const view = await state.environment.application.getSubscriberQuoteLadder(
          pairId,
          path[3],
          getActorId(request, url)
        );

        return view === null
          ? createReply(404, { message: `RFQ ${path[3]} was not found.` })
          : createReply(200, view);
      }

      if (
        request.method === "GET" &&
        path[2] === "dealers" &&
        path[3] !== undefined &&
        path[4] === "history"
      ) {
        const view = await state.environment.application.getDealerInvitationHistory(
          pairId,
          path[3],
          getActorId(request, url)
        );

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
    get demoPairId() {
      return buildDemoStatus().pairId;
    },
    get environment() {
      return state.environment;
    },
    handleRequest,
    resetDemoState
  };
};
