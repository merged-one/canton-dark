import type { HealthResponse } from "@canton-dark/api-contracts";
import {
  createAccessGrant,
  createDarkOrder,
  createDomainError,
  createExecutionFromQuote,
  createMatchProposal,
  createPairInstance,
  createQuote,
  createRfq,
  evaluateVenueConfiguration,
  hasEntitlement,
  setPairPauseState,
  transitionSettlementStatus,
  type AccessGrant,
  type DarkOrder,
  type Entitlement,
  type Execution,
  type MatchProposal,
  type PairInstance,
  type PairMode,
  type ParticipantRole,
  type Quote,
  type RFQ,
  type SettlementStatus,
  type VenueConfigurationDraft
} from "@canton-dark/domain-core";
import {
  buildPairDashboardView,
  projectPairSummary,
  projectVenueHealth,
  type PairDashboardView,
  type PairSummaryView,
  type TradingActivityView,
  type VenueHealthReadModel
} from "@canton-dark/query-models";

export type Clock = {
  now: () => Date;
};

export type IdGenerator = {
  nextId: (namespace: string) => string;
};

export type LedgerEventType =
  | "access.granted"
  | "dark-order.submitted"
  | "execution.recorded"
  | "match.proposed"
  | "pair.pause-state.updated"
  | "pair.registered"
  | "quote.recorded"
  | "rfq.submitted";

export type LedgerEvent = {
  aggregateId: string;
  eventId: string;
  occurredAt: string;
  pairId: string;
  payload: unknown;
  type: LedgerEventType;
};

export type ProjectionCollection = "access" | "activity" | "dashboard" | "health" | "pair-summary";

export type RiskAction =
  | "execute_quote"
  | "grant_access"
  | "pause_pair"
  | "propose_match"
  | "record_quote"
  | "register_pair"
  | "submit_dark_order"
  | "submit_rfq";

export type RiskDecision = {
  approved: boolean;
  reason?: string;
};

export type RiskControlInput = {
  action: RiskAction;
  actorId: string;
  pair: PairInstance;
  price?: number;
  quantity?: number;
};

export type AuditEntry = {
  action: string;
  actorId: string;
  at: string;
  detail: string;
  pairId: string;
};

export type NotificationMessage = {
  at: string;
  detail: string;
  kind: string;
  pairId: string;
  recipientIds: readonly string[];
  subject: string;
};

export type LedgerPort = {
  append: (event: LedgerEvent) => Promise<void>;
  getDarkOrder: (orderId: string) => Promise<DarkOrder | null>;
  getPair: (pairId: string) => Promise<PairInstance | null>;
  getQuote: (quoteId: string) => Promise<Quote | null>;
  getRfq: (rfqId: string) => Promise<RFQ | null>;
  listAccessGrants: (pairId: string) => Promise<readonly AccessGrant[]>;
  listDarkOrders: (pairId: string) => Promise<readonly DarkOrder[]>;
  listEvents: (pairId?: string) => Promise<readonly LedgerEvent[]>;
  listExecutions: (pairId: string) => Promise<readonly Execution[]>;
  listMatchProposals: (pairId: string) => Promise<readonly MatchProposal[]>;
  listQuotes: (pairId: string) => Promise<readonly Quote[]>;
  listRfqs: (pairId: string) => Promise<readonly RFQ[]>;
  saveAccessGrant: (grant: AccessGrant) => Promise<void>;
  saveDarkOrder: (order: DarkOrder) => Promise<void>;
  saveExecution: (execution: Execution) => Promise<void>;
  saveMatchProposal: (proposal: MatchProposal) => Promise<void>;
  savePair: (pair: PairInstance) => Promise<void>;
  saveQuote: (quote: Quote) => Promise<void>;
  saveRfq: (rfq: RFQ) => Promise<void>;
};

export type ProjectionStore = {
  get: (collection: ProjectionCollection, key: string) => Promise<unknown>;
  put: (collection: ProjectionCollection, key: string, value: unknown) => Promise<void>;
};

export type RiskControlPort = {
  evaluate: (input: RiskControlInput) => Promise<RiskDecision>;
};

export type SettlementPort = {
  submit: (execution: Execution) => Promise<SettlementStatus>;
};

export type AuditLogPort = {
  record: (entry: AuditEntry) => Promise<void>;
};

export type NotificationPort = {
  send: (message: NotificationMessage) => Promise<void>;
};

export type ReferencePricePort = {
  get: (pairId: string, instrumentId: string) => Promise<number>;
};

export type VenueApplicationDependencies = {
  auditLog: AuditLogPort;
  clock: Clock;
  idGenerator: IdGenerator;
  ledger: LedgerPort;
  notifications: NotificationPort;
  projections: ProjectionStore;
  referencePrices: ReferencePricePort;
  riskControl: RiskControlPort;
  settlement: SettlementPort;
};

export type RegisterPairCommand = {
  actorId: string;
  attestedBy?: string;
  dealers: readonly string[];
  jurisdiction: string;
  mode: PairMode;
  operatorId: string;
  pairId?: string;
  rulebookReleaseId?: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessCommand = {
  actorId: string;
  entitlements?: readonly Entitlement[];
  note?: string;
  pairId: string;
  role: ParticipantRole;
  subjectId: string;
};

export type PausePairCommand = {
  actorId: string;
  pairId: string;
  reason?: string;
  state: "active" | "paused";
};

export type SubmitRfqCommand = {
  actorId: string;
  directedDealerIds: readonly string[];
  expiresAt: string;
  instrumentId: string;
  pairId: string;
  quantity: number;
  side: RFQ["side"];
};

export type RecordQuoteCommand = {
  actorId: string;
  expiresAt: string;
  pairId: string;
  price: number;
  quantity: number;
  rfqId: string;
};

export type ExecuteQuoteCommand = {
  actorId: string;
  pairId: string;
  quoteId: string;
  rfqId: string;
};

export type SubmitDarkOrderCommand = {
  actorId: string;
  limitPrice: number;
  pairId: string;
  quantity: number;
  side: DarkOrder["side"];
};

export type ProposeMatchCommand = {
  actorId: string;
  buyOrderId: string;
  instrumentId: string;
  pairId: string;
  proposedPrice: number;
  proposedQuantity: number;
  sellOrderId: string;
};

const requirePair = async (ledger: LedgerPort, pairId: string): Promise<PairInstance> => {
  const pair = await ledger.getPair(pairId);

  if (pair === null) {
    throw new Error(`Pair ${pairId} was not found.`);
  }

  return pair;
};

const requireRfq = async (ledger: LedgerPort, rfqId: string): Promise<RFQ> => {
  const rfq = await ledger.getRfq(rfqId);

  if (rfq === null) {
    throw new Error(`RFQ ${rfqId} was not found.`);
  }

  return rfq;
};

const requireQuote = async (ledger: LedgerPort, quoteId: string): Promise<Quote> => {
  const quote = await ledger.getQuote(quoteId);

  if (quote === null) {
    throw new Error(`Quote ${quoteId} was not found.`);
  }

  return quote;
};

const requireDarkOrder = async (ledger: LedgerPort, orderId: string): Promise<DarkOrder> => {
  const order = await ledger.getDarkOrder(orderId);

  if (order === null) {
    throw new Error(`Dark order ${orderId} was not found.`);
  }

  return order;
};

const buildNotificationRecipients = (
  grants: readonly AccessGrant[],
  fallbackRecipients: readonly string[]
): readonly string[] => {
  const grantedRecipients = grants.map((grant) => grant.subjectId);

  return [...new Set([...grantedRecipients, ...fallbackRecipients])].sort((left, right) =>
    left.localeCompare(right)
  );
};

const createRiskError = (action: RiskAction, decision: RiskDecision): Error =>
  new Error(decision.reason ?? `${action} was rejected by risk controls.`);

const createDraftHealthDetail = (
  draft: {
    dealers: readonly string[];
    operatorId: string;
  },
  violationCount: number
): string =>
  violationCount === 0
    ? `Operator ${draft.operatorId.trim()} has ${draft.dealers.length} directed dealer configuration(s).`
    : `${violationCount} venue policy issue(s) require remediation before launch.`;

export const createVenueApplication = (dependencies: VenueApplicationDependencies) => {
  const ensureRiskApproved = async (input: RiskControlInput): Promise<void> => {
    const decision = await dependencies.riskControl.evaluate(input);

    if (!decision.approved) {
      throw createRiskError(input.action, decision);
    }
  };

  const appendEvent = async (
    type: LedgerEventType,
    pairId: string,
    aggregateId: string,
    payload: unknown
  ): Promise<void> => {
    await dependencies.ledger.append({
      type,
      payload,
      pairId,
      aggregateId,
      eventId: dependencies.idGenerator.nextId("event"),
      occurredAt: dependencies.clock.now().toISOString()
    });
  };

  const refreshProjections = async (pair: PairInstance): Promise<PairDashboardView> => {
    const [grants, rfqs, quotes, executions, darkOrders, matches] = await Promise.all([
      dependencies.ledger.listAccessGrants(pair.pairId),
      dependencies.ledger.listRfqs(pair.pairId),
      dependencies.ledger.listQuotes(pair.pairId),
      dependencies.ledger.listExecutions(pair.pairId),
      dependencies.ledger.listDarkOrders(pair.pairId),
      dependencies.ledger.listMatchProposals(pair.pairId)
    ]);
    const dashboard = buildPairDashboardView({
      pair,
      grants,
      records: {
        rfqs,
        quotes,
        executions,
        darkOrders,
        matches
      }
    });

    await Promise.all([
      dependencies.projections.put("pair-summary", pair.pairId, projectPairSummary(pair)),
      dependencies.projections.put("health", pair.pairId, dashboard.health),
      dependencies.projections.put("access", pair.pairId, dashboard.access),
      dependencies.projections.put("activity", pair.pairId, dashboard.activity),
      dependencies.projections.put("dashboard", pair.pairId, dashboard)
    ]);

    return dashboard;
  };

  const ensureActorEntitled = (
    pair: PairInstance,
    grants: readonly AccessGrant[],
    actorId: string,
    entitlement: Entitlement
  ): void => {
    if (actorId === pair.operatorId && entitlement !== "respond_quote") {
      return;
    }

    if (!hasEntitlement(actorId, grants, entitlement)) {
      throw createDomainError(
        "MISSING_ENTITLEMENT",
        `Actor ${actorId} is missing ${entitlement} permission for pair ${pair.pairId}.`,
        {
          actorId,
          entitlement,
          pairId: pair.pairId
        }
      );
    }
  };

  const registerPair = async (command: RegisterPairCommand): Promise<PairInstance> => {
    const now = dependencies.clock.now().toISOString();
    const pair = createPairInstance({
      pairId: command.pairId ?? dependencies.idGenerator.nextId("pair"),
      mode: command.mode,
      operatorId: command.operatorId,
      dealers: command.dealers,
      createdAt: now,
      operatorApproval: {
        status: "approved",
        approvedAt: now,
        approvedBy: command.actorId
      },
      regulatoryAttestation: {
        status: "attested",
        attestedAt: now,
        attestedBy: command.attestedBy ?? command.actorId,
        jurisdiction: command.jurisdiction
      },
      rulebookRelease: {
        releaseId: command.rulebookReleaseId ?? dependencies.idGenerator.nextId("rulebook"),
        version: command.rulebookVersion,
        effectiveAt: now,
        publishedBy: command.actorId,
        summary: command.rulebookSummary
      }
    });

    await ensureRiskApproved({
      action: "register_pair",
      actorId: command.actorId,
      pair
    });
    await dependencies.ledger.savePair(pair);
    await appendEvent("pair.registered", pair.pairId, pair.pairId, pair);

    const bootstrapGrants = [
      createAccessGrant({
        grantId: dependencies.idGenerator.nextId("grant"),
        pairId: pair.pairId,
        subjectId: pair.operatorId,
        role: "operator",
        grantedAt: now,
        grantedBy: command.actorId,
        note: "bootstrap operator access"
      }),
      ...pair.dealers.map((dealerId) =>
        createAccessGrant({
          grantId: dependencies.idGenerator.nextId("grant"),
          pairId: pair.pairId,
          subjectId: dealerId,
          role: "dealer",
          grantedAt: now,
          grantedBy: command.actorId,
          note: "bootstrap dealer access"
        })
      )
    ];

    for (const grant of bootstrapGrants) {
      await dependencies.ledger.saveAccessGrant(grant);
      await appendEvent("access.granted", pair.pairId, grant.grantId, grant);
    }

    await dependencies.auditLog.record({
      action: "register_pair",
      actorId: command.actorId,
      at: now,
      pairId: pair.pairId,
      detail: `${pair.mode} registered with ${pair.dealers.length} dealer(s).`
    });
    await dependencies.notifications.send({
      at: now,
      kind: "pair_registered",
      pairId: pair.pairId,
      recipientIds: buildNotificationRecipients(bootstrapGrants, [pair.operatorId]),
      subject: "Pair registered",
      detail: `${pair.pairId} is active under operator ${pair.operatorId}.`
    });
    await refreshProjections(pair);

    return pair;
  };

  const grantAccess = async (command: GrantAccessCommand): Promise<AccessGrant> => {
    const [pair, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = dependencies.clock.now().toISOString();

    ensureActorEntitled(pair, grants, command.actorId, "manage_access");
    await ensureRiskApproved({
      action: "grant_access",
      actorId: command.actorId,
      pair
    });

    const grant = createAccessGrant({
      grantId: dependencies.idGenerator.nextId("grant"),
      pairId: pair.pairId,
      subjectId: command.subjectId,
      role: command.role,
      grantedAt: now,
      grantedBy: command.actorId,
      ...(command.entitlements !== undefined ? { entitlements: command.entitlements } : {}),
      ...(command.note !== undefined ? { note: command.note } : {})
    });

    await dependencies.ledger.saveAccessGrant(grant);
    await appendEvent("access.granted", pair.pairId, grant.grantId, grant);
    await dependencies.auditLog.record({
      action: "grant_access",
      actorId: command.actorId,
      at: now,
      pairId: pair.pairId,
      detail: `${command.role} granted to ${command.subjectId}.`
    });
    await dependencies.notifications.send({
      at: now,
      kind: "access_granted",
      pairId: pair.pairId,
      recipientIds: [command.subjectId],
      subject: "Access granted",
      detail: `${command.subjectId} now holds ${command.role} access for ${pair.pairId}.`
    });
    await refreshProjections(pair);

    return grant;
  };

  const pausePair = async (command: PausePairCommand): Promise<PairInstance> => {
    const pair = await requirePair(dependencies.ledger, command.pairId);
    const grants = await dependencies.ledger.listAccessGrants(pair.pairId);
    const now = dependencies.clock.now().toISOString();

    ensureActorEntitled(pair, grants, command.actorId, "pause_pair");
    await ensureRiskApproved({
      action: "pause_pair",
      actorId: command.actorId,
      pair
    });

    const nextPair = setPairPauseState(pair, {
      state: command.state,
      changedAt: now,
      changedBy: command.actorId,
      ...(command.reason !== undefined ? { reason: command.reason } : {})
    });

    await dependencies.ledger.savePair(nextPair);
    await appendEvent("pair.pause-state.updated", pair.pairId, pair.pairId, nextPair.pauseState);
    await dependencies.auditLog.record({
      action: "pause_pair",
      actorId: command.actorId,
      at: now,
      pairId: pair.pairId,
      detail:
        nextPair.pauseState.state === "paused"
          ? `Pair paused: ${nextPair.pauseState.reason}.`
          : "Pair returned to active trading."
    });
    await dependencies.notifications.send({
      at: now,
      kind: "pair_pause_state_updated",
      pairId: pair.pairId,
      recipientIds: buildNotificationRecipients(grants, [pair.operatorId]),
      subject: "Pair pause state updated",
      detail:
        command.state === "paused"
          ? `${pair.pairId} paused by ${command.actorId}.`
          : `${pair.pairId} reactivated by ${command.actorId}.`
    });
    await refreshProjections(nextPair);

    return nextPair;
  };

  const submitRfq = async (command: SubmitRfqCommand): Promise<RFQ> => {
    const pair = await requirePair(dependencies.ledger, command.pairId);
    const grants = await dependencies.ledger.listAccessGrants(pair.pairId);

    const rfq = createRfq({
      rfqId: dependencies.idGenerator.nextId("rfq"),
      pair,
      accessGrants: grants,
      requesterId: command.actorId,
      directedDealerIds: command.directedDealerIds,
      instrumentId: command.instrumentId,
      side: command.side,
      quantity: command.quantity,
      createdAt: dependencies.clock.now().toISOString(),
      expiresAt: command.expiresAt
    });

    await ensureRiskApproved({
      action: "submit_rfq",
      actorId: command.actorId,
      pair,
      quantity: command.quantity
    });
    await dependencies.ledger.saveRfq(rfq);
    await appendEvent("rfq.submitted", pair.pairId, rfq.rfqId, rfq);
    await dependencies.auditLog.record({
      action: "submit_rfq",
      actorId: command.actorId,
      at: rfq.createdAt,
      pairId: pair.pairId,
      detail: `RFQ ${rfq.rfqId} submitted for ${rfq.quantity} units.`
    });
    await dependencies.notifications.send({
      at: rfq.createdAt,
      kind: "rfq_submitted",
      pairId: pair.pairId,
      recipientIds: rfq.directedDealerIds,
      subject: "RFQ submitted",
      detail: `RFQ ${rfq.rfqId} requires dealer response.`
    });
    await refreshProjections(pair);

    return rfq;
  };

  const recordQuote = async (command: RecordQuoteCommand): Promise<Quote> => {
    const [pair, rfq, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      requireRfq(dependencies.ledger, command.rfqId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const quote = createQuote({
      quoteId: dependencies.idGenerator.nextId("quote"),
      pair,
      rfq,
      accessGrants: grants,
      dealerId: command.actorId,
      price: command.price,
      quantity: command.quantity,
      createdAt: dependencies.clock.now().toISOString(),
      expiresAt: command.expiresAt
    });

    await ensureRiskApproved({
      action: "record_quote",
      actorId: command.actorId,
      pair,
      price: command.price,
      quantity: command.quantity
    });
    await dependencies.ledger.saveQuote(quote);
    await appendEvent("quote.recorded", pair.pairId, quote.quoteId, quote);
    await dependencies.auditLog.record({
      action: "record_quote",
      actorId: command.actorId,
      at: quote.createdAt,
      pairId: pair.pairId,
      detail: `Quote ${quote.quoteId} recorded for RFQ ${rfq.rfqId}.`
    });
    await dependencies.notifications.send({
      at: quote.createdAt,
      kind: "quote_recorded",
      pairId: pair.pairId,
      recipientIds: [rfq.requesterId],
      subject: "Quote recorded",
      detail: `Quote ${quote.quoteId} is available for RFQ ${rfq.rfqId}.`
    });
    await refreshProjections(pair);

    return quote;
  };

  const executeQuote = async (command: ExecuteQuoteCommand): Promise<Execution> => {
    const [pair, rfq, quote] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      requireRfq(dependencies.ledger, command.rfqId),
      requireQuote(dependencies.ledger, command.quoteId)
    ]);
    const execution = createExecutionFromQuote({
      executionId: dependencies.idGenerator.nextId("execution"),
      pair,
      quote,
      rfq,
      createdAt: dependencies.clock.now().toISOString()
    });

    await ensureRiskApproved({
      action: "execute_quote",
      actorId: command.actorId,
      pair,
      price: quote.price,
      quantity: quote.quantity
    });

    const settlementStatus = await dependencies.settlement.submit(execution);
    const finalExecution = transitionSettlementStatus(execution, settlementStatus);

    await dependencies.ledger.saveExecution(finalExecution);
    await appendEvent(
      "execution.recorded",
      pair.pairId,
      finalExecution.executionId,
      finalExecution
    );
    await dependencies.auditLog.record({
      action: "execute_quote",
      actorId: command.actorId,
      at: finalExecution.createdAt,
      pairId: pair.pairId,
      detail: `Execution ${finalExecution.executionId} recorded with ${finalExecution.settlementStatus} settlement status.`
    });
    await dependencies.notifications.send({
      at: finalExecution.createdAt,
      kind: "execution_recorded",
      pairId: pair.pairId,
      recipientIds: [finalExecution.buyerId, finalExecution.sellerId],
      subject: "Execution recorded",
      detail: `Execution ${finalExecution.executionId} completed at ${finalExecution.price}.`
    });
    await refreshProjections(pair);

    return finalExecution;
  };

  const submitDarkOrder = async (command: SubmitDarkOrderCommand): Promise<DarkOrder> => {
    const [pair, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const order = createDarkOrder({
      orderId: dependencies.idGenerator.nextId("order"),
      pair,
      accessGrants: grants,
      participantId: command.actorId,
      side: command.side,
      quantity: command.quantity,
      limitPrice: command.limitPrice,
      createdAt: dependencies.clock.now().toISOString()
    });

    await ensureRiskApproved({
      action: "submit_dark_order",
      actorId: command.actorId,
      pair,
      price: command.limitPrice,
      quantity: command.quantity
    });
    await dependencies.ledger.saveDarkOrder(order);
    await appendEvent("dark-order.submitted", pair.pairId, order.orderId, order);
    await dependencies.auditLog.record({
      action: "submit_dark_order",
      actorId: command.actorId,
      at: order.createdAt,
      pairId: pair.pairId,
      detail: `Dark order ${order.orderId} entered on the book.`
    });
    await refreshProjections(pair);

    return order;
  };

  const proposeMatch = async (command: ProposeMatchCommand): Promise<MatchProposal> => {
    const pair = await requirePair(dependencies.ledger, command.pairId);
    const [buyOrder, sellOrder, referencePrice] = await Promise.all([
      requireDarkOrder(dependencies.ledger, command.buyOrderId),
      requireDarkOrder(dependencies.ledger, command.sellOrderId),
      dependencies.referencePrices.get(command.pairId, command.instrumentId)
    ]);
    const proposal = createMatchProposal({
      proposalId: dependencies.idGenerator.nextId("match"),
      pair,
      buyOrder,
      sellOrder,
      proposedPrice: command.proposedPrice,
      proposedQuantity: command.proposedQuantity,
      referencePrice,
      createdAt: dependencies.clock.now().toISOString()
    });

    await ensureRiskApproved({
      action: "propose_match",
      actorId: command.actorId,
      pair,
      price: command.proposedPrice,
      quantity: command.proposedQuantity
    });
    await dependencies.ledger.saveMatchProposal(proposal);
    await appendEvent("match.proposed", pair.pairId, proposal.proposalId, proposal);
    await dependencies.auditLog.record({
      action: "propose_match",
      actorId: command.actorId,
      at: proposal.createdAt,
      pairId: pair.pairId,
      detail: `Match proposal ${proposal.proposalId} created from ${buyOrder.orderId}/${sellOrder.orderId}.`
    });
    await refreshProjections(pair);

    return proposal;
  };

  const getPairSummary = async (pairId: string): Promise<PairSummaryView | null> =>
    (await dependencies.projections.get("pair-summary", pairId)) as PairSummaryView | null;

  const getTradingActivity = async (pairId: string): Promise<TradingActivityView | null> =>
    (await dependencies.projections.get("activity", pairId)) as TradingActivityView | null;

  const getVenueHealth = async (pairId: string): Promise<VenueHealthReadModel | null> =>
    (await dependencies.projections.get("health", pairId)) as VenueHealthReadModel | null;

  const getPairDashboard = async (pairId: string): Promise<PairDashboardView | null> =>
    (await dependencies.projections.get("dashboard", pairId)) as PairDashboardView | null;

  return {
    registerPair,
    grantAccess,
    pausePair,
    submitRfq,
    recordQuote,
    executeQuote,
    submitDarkOrder,
    proposeMatch,
    getPairSummary,
    getTradingActivity,
    getVenueHealth,
    getPairDashboard
  };
};

export const buildVenueHealthReadModel = (draft: VenueConfigurationDraft): VenueHealthReadModel => {
  const decision = evaluateVenueConfiguration(draft);
  const previewDealers =
    decision.normalized.mode === "SingleDealerPair"
      ? [decision.normalized.dealers[0] ?? "draft-dealer"]
      : decision.normalized.dealers.length > 0
        ? decision.normalized.dealers
        : ["draft-dealer-a"];
  const previewPair = createPairInstance({
    pairId: "draft-preview",
    mode: decision.normalized.mode,
    operatorId: decision.normalized.operatorId || "draft-operator",
    dealers: previewDealers,
    createdAt: "2026-04-02T00:00:00.000Z",
    operatorApproval: {
      status: "approved",
      approvedAt: "2026-04-02T00:00:00.000Z",
      approvedBy: "draft-operator"
    },
    regulatoryAttestation: {
      status: "attested",
      attestedAt: "2026-04-02T00:00:00.000Z",
      attestedBy: "draft-operator",
      jurisdiction: "draft"
    },
    rulebookRelease: {
      releaseId: "draft-release",
      version: "draft",
      effectiveAt: "2026-04-02T00:00:00.000Z",
      publishedBy: "draft-operator",
      summary: "draft"
    }
  });
  const previewHealth = projectVenueHealth(previewPair, []);

  return {
    title: `${decision.normalized.mode} bootstrap`,
    status: decision.isValid ? "healthy" : "rejected",
    detail: createDraftHealthDetail(decision.normalized, decision.violations.length),
    summary: {
      pairId: "draft-preview",
      mode: decision.normalized.mode,
      operatorId: decision.normalized.operatorId,
      dealers: decision.normalized.dealers,
      paused: false,
      rulebookVersion: "draft",
      activeParticipantCount:
        decision.normalized.dealers.length + (decision.normalized.operatorId ? 1 : 0),
      ledgerFacts: previewHealth.summary.ledgerFacts,
      offLedgerFacts: previewHealth.summary.offLedgerFacts
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
