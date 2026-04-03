import {
  acceptDealerQuote,
  acceptMatchProposal,
  canDarkOrdersCross,
  cancelDarkOrder,
  cancelRfqSession,
  compareDarkOrderPriority,
  createAccessGrant,
  createDealerInvitations,
  createDealerQuote,
  createDarkOrder,
  createDomainError,
  createMatchProposal,
  createPairInstance,
  createRfqSession,
  executeDarkMatch,
  hasEntitlement,
  hasActiveOrderLock,
  isOrderLockActive,
  markDealerInvitationResponded,
  markRfqQuoted,
  progressSettlementInstruction,
  rejectMatchProposal,
  rejectAllQuotes,
  rejectRfqSession,
  releaseOrderLock,
  reviseDealerQuote,
  setPairPauseState,
  synchronizeDarkCrossLifecycle,
  synchronizeRfqLifecycle,
  withdrawDealerQuote,
  type AccessGrant,
  type AuditRecord,
  type DealerInvitation,
  type DealerQuote,
  type DarkOrder,
  type ExecuteDarkMatchResult,
  type ExecutionTicket,
  type InviteRevisionPolicy,
  type MatchProposal,
  type OperatorOversightRole,
  type OrderLock,
  type PairInstance,
  type PairMode,
  type QuoteRevision,
  type QuoteWithdrawal,
  type RFQSession,
  type SettlementInstruction,
  type SettlementStatus
} from "@canton-dark/domain-core";
import {
  projectAuditTrail,
  projectDealerInvitationHistory,
  projectDealerWorkbenchView,
  projectOperatorOversightView,
  projectOperatorView,
  projectSubscriberQuoteLadder,
  projectSubscriberView,
  projectVenueHealth,
  type AuditTrailView,
  type DealerInvitationHistoryView,
  type DealerWorkbenchView,
  type OperatorOversightView,
  type OperatorView,
  type QuoteComparisonView,
  type SubscriberView,
  type VenueHealthReadModel
} from "@canton-dark/query-models";

export type Clock = {
  now: () => Date;
};

export type IdGenerator = {
  nextId: (namespace: string) => string;
};

export type LedgerPort = {
  getDarkOrder: (orderId: string) => Promise<DarkOrder | null>;
  getExecutionTicket: (executionId: string) => Promise<ExecutionTicket | null>;
  getMatchProposal: (proposalId: string) => Promise<MatchProposal | null>;
  getPair: (pairId: string) => Promise<PairInstance | null>;
  getOrderLock: (lockId: string) => Promise<OrderLock | null>;
  getQuote: (quoteId: string) => Promise<DealerQuote | null>;
  getRfq: (rfqId: string) => Promise<RFQSession | null>;
  getSettlementInstruction: (instructionId: string) => Promise<SettlementInstruction | null>;
  listAccessGrants: (pairId: string) => Promise<readonly AccessGrant[]>;
  listDarkOrders: (pairId: string) => Promise<readonly DarkOrder[]>;
  listExecutionTickets: (pairId: string) => Promise<readonly ExecutionTicket[]>;
  listInvitations: (pairId: string) => Promise<readonly DealerInvitation[]>;
  listMatchProposals: (pairId: string) => Promise<readonly MatchProposal[]>;
  listOrderLocks: (pairId: string) => Promise<readonly OrderLock[]>;
  listPairs: () => Promise<readonly PairInstance[]>;
  listQuoteRevisions: (pairId: string) => Promise<readonly QuoteRevision[]>;
  listQuoteWithdrawals: (pairId: string) => Promise<readonly QuoteWithdrawal[]>;
  listQuotes: (pairId: string) => Promise<readonly DealerQuote[]>;
  listRfqs: (pairId: string) => Promise<readonly RFQSession[]>;
  listSettlementInstructions: (pairId: string) => Promise<readonly SettlementInstruction[]>;
  saveAccessGrant: (grant: AccessGrant) => Promise<void>;
  saveDarkOrder: (order: DarkOrder) => Promise<void>;
  saveExecutionTicket: (execution: ExecutionTicket) => Promise<void>;
  saveInvitation: (invitation: DealerInvitation) => Promise<void>;
  saveMatchProposal: (proposal: MatchProposal) => Promise<void>;
  saveOrderLock: (lock: OrderLock) => Promise<void>;
  savePair: (pair: PairInstance) => Promise<void>;
  saveQuote: (quote: DealerQuote) => Promise<void>;
  saveQuoteRevision: (revision: QuoteRevision) => Promise<void>;
  saveQuoteWithdrawal: (withdrawal: QuoteWithdrawal) => Promise<void>;
  saveRfq: (rfq: RFQSession) => Promise<void>;
  saveSettlementInstruction: (instruction: SettlementInstruction) => Promise<void>;
};

export type AuditLogPort = {
  list: (pairId?: string) => Promise<readonly AuditRecord[]>;
  record: (entry: AuditRecord) => Promise<void>;
};

export type VenueApplicationDependencies = {
  auditLog: AuditLogPort;
  clock: Clock;
  idGenerator: IdGenerator;
  ledger: LedgerPort;
};

export type CreatePairCommand = {
  actorId: string;
  dealerId?: string;
  dealerIds?: readonly string[];
  inviteRevisionPolicy?: InviteRevisionPolicy;
  jurisdiction: string;
  mode?: PairMode;
  operatorId: string;
  operatorOversightRole?: OperatorOversightRole;
  pairId?: string;
  rulebookReleaseId?: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessCommand = {
  actorId: string;
  entitlements?: readonly AccessGrant["entitlements"][number][];
  note?: string;
  pairId: string;
  role: AccessGrant["role"];
  subjectId: string;
};

export type PausePairCommand = {
  actorId: string;
  pairId: string;
  reason?: string;
  state: "active" | "paused";
};

export type OpenRfqCommand = {
  actorId: string;
  instrumentId: string;
  pairId: string;
  quantity: number;
  responseWindowClosesAt?: string;
  side: RFQSession["side"];
};

export type InviteDealersCommand = {
  actorId: string;
  dealerIds: readonly string[];
  pairId: string;
  rfqId: string;
};

export type ReviseInviteSetCommand = InviteDealersCommand;

export type RejectRfqCommand = {
  actorId: string;
  pairId: string;
  reason?: string;
  rfqId: string;
};

export type SubmitQuoteCommand = {
  actorId: string;
  expiresAt: string;
  pairId: string;
  price: number;
  quantity: number;
  rfqId: string;
};

export type ReviseQuoteCommand = {
  actorId: string;
  expiresAt: string;
  pairId: string;
  price: number;
  quantity: number;
  quoteId: string;
  rfqId: string;
};

export type WithdrawQuoteCommand = {
  actorId: string;
  pairId: string;
  quoteId: string;
  reason?: string;
  rfqId: string;
};

export type CancelRfqCommand = {
  actorId: string;
  pairId: string;
  rfqId: string;
};

export type AcceptQuoteCommand = {
  actorId: string;
  pairId: string;
  quoteId: string;
  rfqId: string;
};

export type RejectAllQuotesCommand = {
  actorId: string;
  pairId: string;
  reason?: string;
  rfqId: string;
};

export type MarkSettlementProgressionCommand = {
  actorId: string;
  instructionId: string;
  pairId: string;
  status: SettlementStatus;
};

export type SubmitDarkOrderCommand = {
  actorId: string;
  clientOrderId: string;
  expiresAt?: string;
  instrumentId: string;
  limitPrice: number;
  pairId: string;
  quantity: number;
  side: RFQSession["side"];
};

export type CancelDarkOrderCommand = {
  actorId: string;
  orderId: string;
  pairId: string;
};

export type GenerateMatchProposalCommand = {
  actorId: string;
  buyOrderId?: string;
  expiresAt?: string;
  pairId: string;
  sellOrderId?: string;
};

export type AcceptMatchCommand = {
  actorId: string;
  pairId: string;
  proposalId: string;
};

export type RejectMatchCommand = {
  actorId: string;
  pairId: string;
  proposalId: string;
  reason?: string;
};

export type ReleaseExpiredLockCommand = {
  actorId: string;
  pairId: string;
  proposalId: string;
};

export type ExecuteSettlementCommand = {
  actorId: string;
  pairId: string;
  proposalId: string;
};

export type DarkSubscriberState = {
  executions: readonly ExecutionTicket[];
  locks: readonly OrderLock[];
  orders: readonly DarkOrder[];
  proposals: readonly MatchProposal[];
  settlements: readonly SettlementInstruction[];
  subscriberId: string;
};

const requirePair = async (ledger: LedgerPort, pairId: string): Promise<PairInstance> => {
  const pair = await ledger.getPair(pairId);

  if (pair === null) {
    throw new Error(`Pair ${pairId} was not found.`);
  }

  return pair;
};

const requireRfqFrom = (rfqs: readonly RFQSession[], rfqId: string): RFQSession => {
  const rfq = rfqs.find((candidate) => candidate.rfqId === rfqId);

  if (rfq === undefined) {
    throw new Error(`RFQ ${rfqId} was not found.`);
  }

  return rfq;
};

const requireQuoteFrom = (quotes: readonly DealerQuote[], quoteId: string): DealerQuote => {
  const quote = quotes.find((candidate) => candidate.quoteId === quoteId);

  if (quote === undefined) {
    throw new Error(`Quote ${quoteId} was not found.`);
  }

  return quote;
};

const requireDarkOrderFrom = (orders: readonly DarkOrder[], orderId: string): DarkOrder => {
  const order = orders.find((candidate) => candidate.orderId === orderId);

  if (order === undefined) {
    throw new Error(`Dark order ${orderId} was not found.`);
  }

  return order;
};

const requireMatchProposalFrom = (
  proposals: readonly MatchProposal[],
  proposalId: string
): MatchProposal => {
  const proposal = proposals.find((candidate) => candidate.proposalId === proposalId);

  if (proposal === undefined) {
    throw new Error(`Match proposal ${proposalId} was not found.`);
  }

  return proposal;
};

const requireOrderLockFrom = (locks: readonly OrderLock[], lockId: string): OrderLock => {
  const lock = locks.find((candidate) => candidate.lockId === lockId);

  if (lock === undefined) {
    throw new Error(`Order lock ${lockId} was not found.`);
  }

  return lock;
};

const requireSettlementInstruction = async (
  ledger: LedgerPort,
  instructionId: string
): Promise<SettlementInstruction> => {
  const instruction = await ledger.getSettlementInstruction(instructionId);

  if (instruction === null) {
    throw new Error(`Settlement instruction ${instructionId} was not found.`);
  }

  return instruction;
};

const ensureActorEntitled = (
  pair: PairInstance,
  grants: readonly AccessGrant[],
  actorId: string,
  entitlement: AccessGrant["entitlements"][number]
): void => {
  if (
    actorId === pair.operatorId &&
    entitlement !== "respond_quote" &&
    entitlement !== "accept_quote"
  ) {
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

const ensureSubscriberOwnsRfq = (rfq: RFQSession, actorId: string): void => {
  if (rfq.subscriberId !== actorId) {
    throw createDomainError(
      "MISSING_ENTITLEMENT",
      `Actor ${actorId} does not own RFQ ${rfq.rfqId}.`,
      {
        actorId,
        rfqId: rfq.rfqId,
        subscriberId: rfq.subscriberId
      }
    );
  }
};

const ensureDealerOwnsRfq = (rfq: RFQSession, actorId: string): void => {
  const invitedDealerIds = rfq.invitedDealerIds ?? [rfq.dealerId];

  if (!invitedDealerIds.includes(actorId)) {
    throw createDomainError(
      "MISSING_ENTITLEMENT",
      `Actor ${actorId} does not own RFQ ${rfq.rfqId} as a routed dealer.`,
      {
        actorId,
        invitedDealerIds,
        rfqId: rfq.rfqId
      }
    );
  }
};

const ensureActorCanViewOperatorScope = (pair: PairInstance, actorId: string): void => {
  if (pair.operatorId !== actorId) {
    throw createDomainError(
      "MISSING_ENTITLEMENT",
      `Only the pair operator may access the operator view for pair ${pair.pairId}.`,
      {
        actorId,
        operatorId: pair.operatorId,
        pairId: pair.pairId
      }
    );
  }
};

const ensureActorCanViewSubscriberScope = (
  pair: PairInstance,
  grants: readonly AccessGrant[],
  actorId: string,
  subscriberId: string
): void => {
  if (actorId !== subscriberId) {
    throw createDomainError(
      "MISSING_ENTITLEMENT",
      `Only subscriber ${subscriberId} may access the subscriber view for pair ${pair.pairId}.`,
      {
        actorId,
        pairId: pair.pairId,
        subscriberId
      }
    );
  }

  ensureActorEntitled(pair, grants, actorId, "view_pair");
};

const ensureActorCanViewDealerScope = (
  pair: PairInstance,
  grants: readonly AccessGrant[],
  actorId: string,
  dealerId: string
): void => {
  if (actorId !== dealerId) {
    throw createDomainError(
      "MISSING_ENTITLEMENT",
      `Only dealer ${dealerId} may access the dealer workbench for pair ${pair.pairId}.`,
      {
        actorId,
        dealerId,
        pairId: pair.pairId
      }
    );
  }

  ensureActorEntitled(pair, grants, actorId, "view_pair");
};

const ensureActorCanViewAuditTrail = (
  pair: PairInstance,
  grants: readonly AccessGrant[],
  actorId: string
): void => {
  if (actorId === pair.operatorId) {
    return;
  }

  ensureActorEntitled(pair, grants, actorId, "view_audit");
};

const ensureActorCanManageDirectedRfq = (
  pair: PairInstance,
  grants: readonly AccessGrant[],
  rfq: RFQSession,
  actorId: string
): void => {
  if (actorId === pair.operatorId) {
    return;
  }

  ensureActorEntitled(pair, grants, actorId, "submit_rfq");
  ensureSubscriberOwnsRfq(rfq, actorId);
};

const hasChanged = <T>(left: T, right: T): boolean =>
  JSON.stringify(left) !== JSON.stringify(right);

const matchRfqInvitation =
  (rfq: RFQSession) =>
  (invitation: DealerInvitation): boolean =>
    invitation.rfqId === rfq.rfqId && invitation.pairId === rfq.pairId;

const matchRfqQuote =
  (rfq: RFQSession) =>
  (quote: DealerQuote): boolean =>
    quote.rfqId === rfq.rfqId && quote.pairId === rfq.pairId;

const delayProposalExpiry = (nowIso: string, milliseconds = 30_000): string =>
  new Date(Date.parse(nowIso) + milliseconds).toISOString();

const matchProposalByOrders =
  (buyOrderId: string, sellOrderId: string) =>
  (proposal: MatchProposal): boolean =>
    proposal.buyOrderId === buyOrderId &&
    proposal.sellOrderId === sellOrderId &&
    (proposal.status === "pending" || proposal.status === "accepted");

const selectDarkCrossCandidate = (
  orders: readonly DarkOrder[],
  locks: readonly OrderLock[]
): { buyOrder: DarkOrder; sellOrder: DarkOrder } | null => {
  const unlockedOrders = orders.filter(
    (order) => order.status === "open" && !hasActiveOrderLock(order.orderId, locks)
  );
  const buys = [...unlockedOrders]
    .filter((order) => order.side === "buy")
    .sort((left, right) => compareDarkOrderPriority("buy", left, right));
  const sells = [...unlockedOrders]
    .filter((order) => order.side === "sell")
    .sort((left, right) => compareDarkOrderPriority("sell", left, right));

  for (const buyOrder of buys) {
    const sellOrder = sells.find((candidate) => canDarkOrdersCross(buyOrder, candidate));

    if (sellOrder !== undefined) {
      return {
        buyOrder,
        sellOrder
      };
    }
  }

  return null;
};

const recordAudit = async (
  dependencies: VenueApplicationDependencies,
  entry: AuditRecord
): Promise<void> => {
  await dependencies.auditLog.record(entry);
};

const persistSynchronizedRfq = async (
  dependencies: VenueApplicationDependencies,
  prior: {
    invitations: readonly DealerInvitation[];
    quotes: readonly DealerQuote[];
    rfq: RFQSession;
  },
  next: {
    invitations: readonly DealerInvitation[];
    quotes: readonly DealerQuote[];
    rfq: RFQSession;
  }
): Promise<void> => {
  if (hasChanged(prior.rfq, next.rfq)) {
    await dependencies.ledger.saveRfq(next.rfq);
  }

  const priorInvitationMap = new Map(
    prior.invitations.map((invitation) => [invitation.invitationId, invitation])
  );

  for (const invitation of next.invitations) {
    const previous = priorInvitationMap.get(invitation.invitationId);

    if (previous === undefined || hasChanged(previous, invitation)) {
      await dependencies.ledger.saveInvitation(invitation);
    }
  }

  const priorQuoteMap = new Map(prior.quotes.map((quote) => [quote.quoteId, quote]));

  for (const quote of next.quotes) {
    const previous = priorQuoteMap.get(quote.quoteId);

    if (previous === undefined || hasChanged(previous, quote)) {
      await dependencies.ledger.saveQuote(quote);
    }
  }
};

const persistSynchronizedDarkCross = async (
  dependencies: VenueApplicationDependencies,
  prior: {
    locks: readonly OrderLock[];
    orders: readonly DarkOrder[];
    proposals: readonly MatchProposal[];
  },
  next: {
    locks: readonly OrderLock[];
    orders: readonly DarkOrder[];
    proposals: readonly MatchProposal[];
  }
): Promise<void> => {
  const priorOrderMap = new Map(prior.orders.map((order) => [order.orderId, order]));

  for (const order of next.orders) {
    const previous = priorOrderMap.get(order.orderId);

    if (previous === undefined || hasChanged(previous, order)) {
      await dependencies.ledger.saveDarkOrder(order);
    }
  }

  const priorLockMap = new Map(prior.locks.map((lock) => [lock.lockId, lock]));

  for (const lock of next.locks) {
    const previous = priorLockMap.get(lock.lockId);

    if (previous === undefined || hasChanged(previous, lock)) {
      await dependencies.ledger.saveOrderLock(lock);
    }
  }

  const priorProposalMap = new Map(
    prior.proposals.map((proposal) => [proposal.proposalId, proposal])
  );

  for (const proposal of next.proposals) {
    const previous = priorProposalMap.get(proposal.proposalId);

    if (previous === undefined || hasChanged(previous, proposal)) {
      await dependencies.ledger.saveMatchProposal(proposal);
    }
  }
};

const synchronizePairLifecycle = async (
  dependencies: VenueApplicationDependencies,
  pair: PairInstance
): Promise<void> => {
  const now = dependencies.clock.now().toISOString();
  const [rfqs, invitations, quotes] = await Promise.all([
    dependencies.ledger.listRfqs(pair.pairId),
    dependencies.ledger.listInvitations(pair.pairId),
    dependencies.ledger.listQuotes(pair.pairId)
  ]);
  const invitationMap = new Map(
    invitations.map((invitation) => [invitation.invitationId, invitation])
  );
  const quoteMap = new Map(quotes.map((quote) => [quote.quoteId, quote]));

  for (const rfq of rfqs) {
    const prior = {
      rfq,
      invitations: [...invitationMap.values()].filter(matchRfqInvitation(rfq)),
      quotes: [...quoteMap.values()].filter(matchRfqQuote(rfq))
    };
    const synced = synchronizeRfqLifecycle({
      pair,
      rfq,
      invitations: prior.invitations,
      quotes: prior.quotes,
      observedAt: now
    });

    if (hasChanged(prior.rfq, synced.rfq)) {
      await dependencies.ledger.saveRfq(synced.rfq);
    }

    for (const invitation of synced.invitations) {
      const previous = invitationMap.get(invitation.invitationId);

      if (previous === undefined || hasChanged(previous, invitation)) {
        await dependencies.ledger.saveInvitation(invitation);
        invitationMap.set(invitation.invitationId, invitation);
      }
    }

    for (const quote of synced.quotes) {
      const previous = quoteMap.get(quote.quoteId);

      if (previous === undefined || hasChanged(previous, quote)) {
        await dependencies.ledger.saveQuote(quote);
        quoteMap.set(quote.quoteId, quote);
      }
    }
  }
};

const synchronizeDarkCrossPairLifecycle = async (
  dependencies: VenueApplicationDependencies,
  pair: PairInstance
): Promise<void> => {
  const now = dependencies.clock.now().toISOString();
  const [orders, locks, proposals] = await Promise.all([
    dependencies.ledger.listDarkOrders(pair.pairId),
    dependencies.ledger.listOrderLocks(pair.pairId),
    dependencies.ledger.listMatchProposals(pair.pairId)
  ]);
  const synced = synchronizeDarkCrossLifecycle({
    orders,
    locks,
    proposals,
    observedAt: now
  });

  await persistSynchronizedDarkCross(
    dependencies,
    {
      orders,
      locks,
      proposals
    },
    synced
  );
};

const loadRawPairSnapshot = async (dependencies: VenueApplicationDependencies, pairId: string) => {
  const pair = await requirePair(dependencies.ledger, pairId);
  const [
    grants,
    rfqs,
    quotes,
    executions,
    settlements,
    invitations,
    revisions,
    withdrawals,
    darkOrders,
    orderLocks,
    matchProposals
  ] = await Promise.all([
    dependencies.ledger.listAccessGrants(pairId),
    dependencies.ledger.listRfqs(pairId),
    dependencies.ledger.listQuotes(pairId),
    dependencies.ledger.listExecutionTickets(pairId),
    dependencies.ledger.listSettlementInstructions(pairId),
    dependencies.ledger.listInvitations(pairId),
    dependencies.ledger.listQuoteRevisions(pairId),
    dependencies.ledger.listQuoteWithdrawals(pairId),
    dependencies.ledger.listDarkOrders(pairId),
    dependencies.ledger.listOrderLocks(pairId),
    dependencies.ledger.listMatchProposals(pairId)
  ]);

  return {
    pair,
    grants,
    rfqs,
    quotes,
    executions,
    settlements,
    invitations,
    revisions,
    withdrawals,
    darkOrders,
    orderLocks,
    matchProposals
  };
};

const loadLivePairSnapshot = async (dependencies: VenueApplicationDependencies, pairId: string) => {
  const pair = await requirePair(dependencies.ledger, pairId);

  await synchronizePairLifecycle(dependencies, pair);
  await synchronizeDarkCrossPairLifecycle(dependencies, pair);

  return loadRawPairSnapshot(dependencies, pairId);
};

export const createVenueApplication = (dependencies: VenueApplicationDependencies) => {
  const nowIso = (): string => dependencies.clock.now().toISOString();
  const darkCrossQueues = new Map<string, Promise<void>>();

  const serializeDarkCrossPair = async <T>(pairId: string, work: () => Promise<T>): Promise<T> => {
    const prior = darkCrossQueues.get(pairId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });
    const settledPrior = Promise.allSettled([prior]);

    darkCrossQueues.set(
      pairId,
      settledPrior.then(() => current)
    );

    await settledPrior;

    try {
      return await work();
    } finally {
      release();
    }
  };

  const createPair = async (command: CreatePairCommand): Promise<PairInstance> => {
    const now = nowIso();
    const mode = command.mode ?? "SingleDealerPair";
    const pairInputBase = {
      pairId: command.pairId ?? dependencies.idGenerator.nextId("pair"),
      mode,
      operatorId: command.operatorId,
      createdAt: now,
      operatorApproval: {
        status: "approved" as const,
        approvedAt: now,
        approvedBy: command.actorId
      },
      regulatoryAttestation: {
        status: "attested" as const,
        attestedAt: now,
        attestedBy: command.actorId,
        jurisdiction: command.jurisdiction
      },
      rulebookRelease: {
        releaseId: command.rulebookReleaseId ?? dependencies.idGenerator.nextId("rulebook"),
        version: command.rulebookVersion,
        effectiveAt: now,
        publishedBy: command.actorId,
        summary: command.rulebookSummary
      }
    };
    const pair =
      mode === "SingleDealerPair"
        ? createPairInstance({
            ...pairInputBase,
            mode: "SingleDealerPair",
            dealerId: command.dealerId ?? ""
          })
        : createPairInstance({
            ...pairInputBase,
            mode: "ATSPair",
            dealerIds: command.dealerIds ?? [],
            ...(command.operatorOversightRole !== undefined
              ? { operatorOversightRole: command.operatorOversightRole }
              : {}),
            ...(command.inviteRevisionPolicy !== undefined
              ? { inviteRevisionPolicy: command.inviteRevisionPolicy }
              : {})
          });
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
      ...pair.dealerIds.map((dealerId) =>
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

    await dependencies.ledger.savePair(pair);

    for (const grant of bootstrapGrants) {
      await dependencies.ledger.saveAccessGrant(grant);
      await recordAudit(dependencies, {
        action: "grant_access",
        actorId: command.actorId,
        at: now,
        detail: `${grant.role} access granted to ${grant.subjectId}.`,
        entityId: grant.grantId,
        pairId: pair.pairId
      });
    }

    await recordAudit(dependencies, {
      action: "create_pair",
      actorId: command.actorId,
      at: now,
      detail:
        pair.mode === "SingleDealerPair"
          ? `SingleDealerPair ${pair.pairId} created with dealer ${pair.dealerId}.`
          : `ATSPair ${pair.pairId} created with directed dealers ${pair.dealerIds.join(", ")}.`,
      entityId: pair.pairId,
      pairId: pair.pairId
    });

    return pair;
  };

  const grantAccess = async (command: GrantAccessCommand): Promise<AccessGrant> => {
    const [pair, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();

    ensureActorEntitled(pair, grants, command.actorId, "manage_access");

    if (command.role === "dealer") {
      if (pair.mode === "SingleDealerPair" && command.subjectId !== pair.dealerId) {
        throw createDomainError(
          "SINGLE_DEALER_PAIR_REQUIRES_ONE_DEALER",
          `SingleDealerPair ${pair.pairId} already binds dealer ${pair.dealerId}.`,
          {
            pairId: pair.pairId,
            dealerId: pair.dealerId,
            subjectId: command.subjectId
          }
        );
      }

      if (pair.mode === "ATSPair" && !pair.dealerIds.includes(command.subjectId)) {
        throw createDomainError(
          "INVALID_INVITATION_DEALER",
          `Dealer ${command.subjectId} is not bound to ATSPair ${pair.pairId}.`,
          {
            dealerIds: pair.dealerIds,
            pairId: pair.pairId,
            subjectId: command.subjectId
          }
        );
      }
    }

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
    await recordAudit(dependencies, {
      action: "grant_access",
      actorId: command.actorId,
      at: now,
      detail: `${command.role} access granted to ${command.subjectId}.`,
      entityId: grant.grantId,
      pairId: pair.pairId
    });

    return grant;
  };

  const pausePair = async (command: PausePairCommand): Promise<PairInstance> => {
    const [pair, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();

    ensureActorEntitled(pair, grants, command.actorId, "pause_pair");

    const nextPair = setPairPauseState(pair, {
      state: command.state,
      changedAt: now,
      changedBy: command.actorId,
      ...(command.reason !== undefined ? { reason: command.reason } : {})
    });

    await dependencies.ledger.savePair(nextPair);
    const detail =
      command.state === "paused" && nextPair.pauseState.state === "paused"
        ? `Pair paused: ${nextPair.pauseState.reason}.`
        : "Pair reactivated.";

    await recordAudit(dependencies, {
      action: command.state === "paused" ? "pause_pair" : "unpause_pair",
      actorId: command.actorId,
      at: now,
      detail,
      entityId: pair.pairId,
      pairId: pair.pairId
    });

    return nextPair;
  };

  const openRfq = async (command: OpenRfqCommand): Promise<RFQSession> => {
    const [pair, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();
    const rfq = createRfqSession({
      rfqId: dependencies.idGenerator.nextId("rfq"),
      pair,
      accessGrants: grants,
      subscriberId: command.actorId,
      instrumentId: command.instrumentId,
      side: command.side,
      quantity: command.quantity,
      createdAt: now,
      ...(command.responseWindowClosesAt !== undefined
        ? { responseWindowClosesAt: command.responseWindowClosesAt }
        : {})
    });

    await dependencies.ledger.saveRfq(rfq);
    await recordAudit(dependencies, {
      action: "open_rfq",
      actorId: command.actorId,
      at: now,
      detail: `RFQ ${rfq.rfqId} opened for ${rfq.quantity} units.`,
      entityId: rfq.rfqId,
      pairId: pair.pairId
    });

    return rfq;
  };

  const inviteDealers = async (
    command: InviteDealersCommand
  ): Promise<{ invitations: readonly DealerInvitation[]; rfq: RFQSession }> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq)),
      observedAt: now
    });

    await persistSynchronizedRfq(
      dependencies,
      {
        rfq,
        invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
        quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
      },
      synced
    );

    ensureActorCanManageDirectedRfq(snapshot.pair, snapshot.grants, synced.rfq, command.actorId);

    const invited = createDealerInvitations({
      accessGrants: snapshot.grants,
      createdAt: now,
      dealerIds: command.dealerIds,
      invitedBy: command.actorId,
      invitations: synced.invitations,
      pair: snapshot.pair,
      rfq: synced.rfq
    });

    await dependencies.ledger.saveRfq(invited.rfq);

    for (const invitation of invited.invitations) {
      await dependencies.ledger.saveInvitation(invitation);
    }

    await recordAudit(dependencies, {
      action: "invite_dealers",
      actorId: command.actorId,
      at: now,
      detail: `RFQ ${command.rfqId} directed to dealers ${command.dealerIds.join(", ")}.`,
      entityId: command.rfqId,
      pairId: command.pairId
    });

    return invited;
  };

  const reviseInviteSet = async (
    command: ReviseInviteSetCommand
  ): Promise<{ invitations: readonly DealerInvitation[]; rfq: RFQSession }> => {
    const invited = await inviteDealers(command);
    const now = nowIso();

    await recordAudit(dependencies, {
      action: "revise_invite_set",
      actorId: command.actorId,
      at: now,
      detail: `RFQ ${command.rfqId} invite set revised to dealers ${command.dealerIds.join(", ")}.`,
      entityId: command.rfqId,
      pairId: command.pairId
    });

    return invited;
  };

  const rejectRfq = async (command: RejectRfqCommand): Promise<RFQSession> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq)),
      observedAt: now
    });

    await persistSynchronizedRfq(
      dependencies,
      {
        rfq,
        invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
        quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
      },
      synced
    );

    ensureActorEntitled(snapshot.pair, snapshot.grants, command.actorId, "respond_quote");
    ensureDealerOwnsRfq(synced.rfq, command.actorId);

    const rejected = rejectRfqSession({
      rfq: synced.rfq,
      rejectedAt: now,
      rejectedBy: command.actorId,
      ...(command.reason !== undefined ? { reason: command.reason } : {})
    });

    await dependencies.ledger.saveRfq(rejected);
    await recordAudit(dependencies, {
      action: "reject_rfq",
      actorId: command.actorId,
      at: now,
      detail: `RFQ ${rejected.rfqId} rejected by dealer ${command.actorId}.`,
      entityId: rejected.rfqId,
      pairId: snapshot.pair.pairId
    });

    return rejected;
  };

  const submitQuote = async (
    command: SubmitQuoteCommand
  ): Promise<{ quote: DealerQuote; rfq: RFQSession }> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const prior = {
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
    };
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: prior.invitations,
      quotes: prior.quotes,
      observedAt: now
    });

    await persistSynchronizedRfq(dependencies, prior, synced);

    const quote = createDealerQuote({
      quoteId: dependencies.idGenerator.nextId("quote"),
      pair: snapshot.pair,
      rfq: synced.rfq,
      accessGrants: snapshot.grants,
      invitations: synced.invitations,
      existingQuotes: synced.quotes,
      dealerId: command.actorId,
      price: command.price,
      quantity: command.quantity,
      createdAt: now,
      expiresAt: command.expiresAt
    });
    const quotedRfq = markRfqQuoted(synced.rfq, now);

    await dependencies.ledger.saveQuote(quote);
    await dependencies.ledger.saveRfq(quotedRfq);

    const invitation = synced.invitations.find(
      (candidate) =>
        candidate.dealerId === command.actorId &&
        (candidate.status === "open" || candidate.status === "responded")
    );

    if (invitation !== undefined) {
      await dependencies.ledger.saveInvitation(
        markDealerInvitationResponded(invitation, now, quote.quoteId)
      );
    }

    await recordAudit(dependencies, {
      action: "submit_quote",
      actorId: command.actorId,
      at: now,
      detail: `Quote ${quote.quoteId} submitted for RFQ ${quotedRfq.rfqId}.`,
      entityId: quote.quoteId,
      pairId: snapshot.pair.pairId
    });

    return {
      quote,
      rfq: quotedRfq
    };
  };

  const reviseQuote = async (
    command: ReviseQuoteCommand
  ): Promise<{ nextQuote: DealerQuote; previousQuote: DealerQuote; rfq: RFQSession }> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const prior = {
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
    };
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: prior.invitations,
      quotes: prior.quotes,
      observedAt: now
    });

    await persistSynchronizedRfq(dependencies, prior, synced);

    const quote = requireQuoteFrom(synced.quotes, command.quoteId);
    const revised = reviseDealerQuote({
      accessGrants: snapshot.grants,
      createdAt: now,
      dealerId: command.actorId,
      existingQuotes: synced.quotes,
      expiresAt: command.expiresAt,
      invitations: synced.invitations,
      pair: snapshot.pair,
      price: command.price,
      quantity: command.quantity,
      quote,
      quoteId: dependencies.idGenerator.nextId("quote"),
      revisionId: dependencies.idGenerator.nextId("quote-revision"),
      rfq: synced.rfq
    });
    const quotedRfq = markRfqQuoted(synced.rfq, now);

    await dependencies.ledger.saveQuote(revised.previousQuote);
    await dependencies.ledger.saveQuote(revised.nextQuote);
    await dependencies.ledger.saveQuoteRevision(revised.revision);
    await dependencies.ledger.saveRfq(quotedRfq);

    await recordAudit(dependencies, {
      action: "revise_quote",
      actorId: command.actorId,
      at: now,
      detail: `Quote ${command.quoteId} revised into ${revised.nextQuote.quoteId}.`,
      entityId: revised.revision.revisionId,
      pairId: snapshot.pair.pairId
    });

    return {
      previousQuote: revised.previousQuote,
      nextQuote: revised.nextQuote,
      rfq: quotedRfq
    };
  };

  const withdrawQuote = async (
    command: WithdrawQuoteCommand
  ): Promise<{ quote: DealerQuote; rfq: RFQSession }> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const prior = {
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
    };
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: prior.invitations,
      quotes: prior.quotes,
      observedAt: now
    });

    await persistSynchronizedRfq(dependencies, prior, synced);

    const quote = requireQuoteFrom(synced.quotes, command.quoteId);
    const withdrawn = withdrawDealerQuote({
      dealerId: command.actorId,
      pair: snapshot.pair,
      quote,
      rfq: synced.rfq,
      withdrawalId: dependencies.idGenerator.nextId("quote-withdrawal"),
      withdrawnAt: now,
      ...(command.reason !== undefined ? { reason: command.reason } : {})
    });

    await dependencies.ledger.saveQuote(withdrawn.quote);

    if (withdrawn.withdrawal !== undefined) {
      await dependencies.ledger.saveQuoteWithdrawal(withdrawn.withdrawal);
    }

    const afterWithdrawal = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq: synced.rfq,
      invitations: synced.invitations,
      quotes: synced.quotes
        .filter((candidate) => candidate.quoteId !== withdrawn.quote.quoteId)
        .concat(withdrawn.quote),
      observedAt: now
    });

    await persistSynchronizedRfq(
      dependencies,
      {
        rfq: synced.rfq,
        invitations: synced.invitations,
        quotes: synced.quotes
      },
      afterWithdrawal
    );

    await recordAudit(dependencies, {
      action: "withdraw_quote",
      actorId: command.actorId,
      at: now,
      detail: `Quote ${command.quoteId} withdrawn by dealer ${command.actorId}.`,
      entityId: command.quoteId,
      pairId: snapshot.pair.pairId
    });

    return {
      quote: withdrawn.quote,
      rfq: afterWithdrawal.rfq
    };
  };

  const cancelRfq = async (command: CancelRfqCommand): Promise<RFQSession> => {
    const [pair, rfq, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.getRfq(command.rfqId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();

    if (rfq === null) {
      throw new Error(`RFQ ${command.rfqId} was not found.`);
    }

    ensureActorEntitled(pair, grants, command.actorId, "submit_rfq");
    ensureSubscriberOwnsRfq(rfq, command.actorId);

    const cancelled = cancelRfqSession(rfq, now, command.actorId);

    await dependencies.ledger.saveRfq(cancelled);
    await recordAudit(dependencies, {
      action: "cancel_rfq",
      actorId: command.actorId,
      at: now,
      detail: `RFQ ${rfq.rfqId} cancelled by subscriber ${command.actorId}.`,
      entityId: rfq.rfqId,
      pairId: pair.pairId
    });

    return cancelled;
  };

  const acceptQuote = async (
    command: AcceptQuoteCommand
  ): Promise<{
    executionTicket: ExecutionTicket;
    quote: DealerQuote;
    rfq: RFQSession;
    settlementInstruction: SettlementInstruction;
  }> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const prior = {
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
    };
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: prior.invitations,
      quotes: prior.quotes,
      observedAt: now
    });

    await persistSynchronizedRfq(dependencies, prior, synced);

    const quote = requireQuoteFrom(synced.quotes, command.quoteId);

    if (quote.status === "expired") {
      await recordAudit(dependencies, {
        action: "expire_quote",
        actorId: quote.dealerId,
        at: now,
        detail: `Quote ${quote.quoteId} expired before acceptance.`,
        entityId: quote.quoteId,
        pairId: snapshot.pair.pairId
      });

      throw createDomainError("QUOTE_EXPIRED", "Dealer quotes must be accepted before expiry.", {
        pairId: snapshot.pair.pairId,
        quoteId: quote.quoteId
      });
    }

    const accepted = acceptDealerQuote({
      pair: snapshot.pair,
      rfq: synced.rfq,
      quote,
      otherQuotes: synced.quotes,
      accessGrants: snapshot.grants,
      acceptedBy: command.actorId,
      acceptedAt: now,
      executionId: dependencies.idGenerator.nextId("execution"),
      instructionId: dependencies.idGenerator.nextId("settlement")
    });

    await dependencies.ledger.saveRfq(accepted.rfq);
    await dependencies.ledger.saveQuote(accepted.quote);

    for (const staleQuote of accepted.staleQuotes) {
      await dependencies.ledger.saveQuote(staleQuote);
    }

    await dependencies.ledger.saveExecutionTicket(accepted.executionTicket);
    await dependencies.ledger.saveSettlementInstruction(accepted.settlementInstruction);
    await recordAudit(dependencies, {
      action: "accept_quote",
      actorId: command.actorId,
      at: now,
      detail: `Quote ${accepted.quote.quoteId} accepted into execution ${accepted.executionTicket.executionId}.`,
      entityId: accepted.executionTicket.executionId,
      pairId: snapshot.pair.pairId
    });

    return accepted;
  };

  const rejectAllPairQuotes = async (
    command: RejectAllQuotesCommand
  ): Promise<{ rfq: RFQSession; staleQuotes: readonly DealerQuote[] }> => {
    const snapshot = await loadRawPairSnapshot(dependencies, command.pairId);
    const rfq = requireRfqFrom(snapshot.rfqs, command.rfqId);
    const now = nowIso();
    const prior = {
      rfq,
      invitations: snapshot.invitations.filter(matchRfqInvitation(rfq)),
      quotes: snapshot.quotes.filter(matchRfqQuote(rfq))
    };
    const synced = synchronizeRfqLifecycle({
      pair: snapshot.pair,
      rfq,
      invitations: prior.invitations,
      quotes: prior.quotes,
      observedAt: now
    });

    await persistSynchronizedRfq(dependencies, prior, synced);

    const rejected = rejectAllQuotes({
      accessGrants: snapshot.grants,
      quotes: synced.quotes,
      rejectedAt: now,
      rejectedBy: command.actorId,
      rfq: synced.rfq,
      ...(command.reason !== undefined ? { reason: command.reason } : {})
    });

    await dependencies.ledger.saveRfq(rejected.rfq);

    for (const staleQuote of rejected.staleQuotes) {
      await dependencies.ledger.saveQuote(staleQuote);
    }

    await recordAudit(dependencies, {
      action: "reject_all_quotes",
      actorId: command.actorId,
      at: now,
      detail: `Subscriber ${command.actorId} rejected all quotes for RFQ ${command.rfqId}.`,
      entityId: command.rfqId,
      pairId: snapshot.pair.pairId
    });

    return rejected;
  };

  const markSettlementProgression = async (
    command: MarkSettlementProgressionCommand
  ): Promise<SettlementInstruction> => {
    const [pair, grants, instruction] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      dependencies.ledger.listAccessGrants(command.pairId),
      requireSettlementInstruction(dependencies.ledger, command.instructionId)
    ]);
    const now = nowIso();

    ensureActorEntitled(pair, grants, command.actorId, "progress_settlement");

    const nextInstruction = progressSettlementInstruction(instruction, command.status, now);

    await dependencies.ledger.saveSettlementInstruction(nextInstruction);
    await recordAudit(dependencies, {
      action: "mark_settlement_progression",
      actorId: command.actorId,
      at: now,
      detail: `Settlement instruction ${instruction.instructionId} moved to ${command.status}.`,
      entityId: instruction.instructionId,
      pairId: pair.pairId
    });

    return nextInstruction;
  };

  const submitDarkOrder = async (command: SubmitDarkOrderCommand): Promise<DarkOrder> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);
      const now = nowIso();
      const existing = snapshot.darkOrders.find(
        (order) =>
          order.subscriberId === command.actorId && order.clientOrderId === command.clientOrderId
      );

      if (existing !== undefined) {
        return existing;
      }

      const order = createDarkOrder({
        orderId: dependencies.idGenerator.nextId("dark-order"),
        pair: snapshot.pair,
        accessGrants: snapshot.grants,
        subscriberId: command.actorId,
        clientOrderId: command.clientOrderId,
        instrumentId: command.instrumentId,
        side: command.side,
        quantity: command.quantity,
        limitPrice: command.limitPrice,
        createdAt: now,
        ...(command.expiresAt !== undefined ? { expiresAt: command.expiresAt } : {})
      });

      await dependencies.ledger.saveDarkOrder(order);
      await recordAudit(dependencies, {
        action: "submit_dark_order",
        actorId: command.actorId,
        at: now,
        detail: `Dark order ${order.orderId} submitted for ${order.quantity} units.`,
        entityId: order.orderId,
        pairId: snapshot.pair.pairId
      });

      return order;
    });

  const cancelDarkOrderCommand = async (command: CancelDarkOrderCommand): Promise<DarkOrder> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);
      const now = nowIso();
      const order = requireDarkOrderFrom(snapshot.darkOrders, command.orderId);
      const cancelled = cancelDarkOrder({
        pair: snapshot.pair,
        order,
        accessGrants: snapshot.grants,
        activeLocks: snapshot.orderLocks,
        cancelledAt: now,
        cancelledBy: command.actorId
      });

      await dependencies.ledger.saveDarkOrder(cancelled);
      await recordAudit(dependencies, {
        action: "cancel_dark_order",
        actorId: command.actorId,
        at: now,
        detail: `Dark order ${cancelled.orderId} cancelled.`,
        entityId: cancelled.orderId,
        pairId: snapshot.pair.pairId
      });

      return cancelled;
    });

  const generateMatchProposal = async (
    command: GenerateMatchProposalCommand
  ): Promise<{ buyLock: OrderLock; proposal: MatchProposal; sellLock: OrderLock }> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);
      const now = nowIso();

      ensureActorCanViewOperatorScope(snapshot.pair, command.actorId);

      const selected =
        command.buyOrderId !== undefined || command.sellOrderId !== undefined
          ? (() => {
              if (command.buyOrderId === undefined || command.sellOrderId === undefined) {
                throw createDomainError(
                  "NO_MATCH_CANDIDATE",
                  "Targeted match proposals require both a buy order id and a sell order id.",
                  {
                    buyOrderId: command.buyOrderId,
                    sellOrderId: command.sellOrderId
                  }
                );
              }

              return {
                buyOrder: requireDarkOrderFrom(snapshot.darkOrders, command.buyOrderId),
                sellOrder: requireDarkOrderFrom(snapshot.darkOrders, command.sellOrderId)
              };
            })()
          : selectDarkCrossCandidate(snapshot.darkOrders, snapshot.orderLocks);

      if (selected === null) {
        throw createDomainError(
          "NO_MATCH_CANDIDATE",
          "No compatible dark-cross candidate is currently available for the pair.",
          {
            pairId: snapshot.pair.pairId
          }
        );
      }

      const existingProposal = snapshot.matchProposals.find(
        matchProposalByOrders(selected.buyOrder.orderId, selected.sellOrder.orderId)
      );

      if (existingProposal !== undefined) {
        return {
          proposal: existingProposal,
          buyLock: requireOrderLockFrom(snapshot.orderLocks, existingProposal.buyLockId),
          sellLock: requireOrderLockFrom(snapshot.orderLocks, existingProposal.sellLockId)
        };
      }

      const activeLocks = snapshot.orderLocks.filter(
        (lock) =>
          isOrderLockActive(lock) &&
          (lock.orderId === selected.buyOrder.orderId ||
            lock.orderId === selected.sellOrder.orderId)
      );

      if (activeLocks.length > 0) {
        throw createDomainError(
          "ORDER_LOCK_ACTIVE",
          "One or more candidate orders are already locked by another proposal.",
          {
            lockIds: activeLocks.map((lock) => lock.lockId),
            pairId: snapshot.pair.pairId
          }
        );
      }

      const created = createMatchProposal({
        pair: snapshot.pair,
        accessGrants: snapshot.grants,
        createdAt: now,
        createdBy: command.actorId,
        proposalId: dependencies.idGenerator.nextId("match-proposal"),
        buyLockId: dependencies.idGenerator.nextId("order-lock"),
        sellLockId: dependencies.idGenerator.nextId("order-lock"),
        buyOrder: selected.buyOrder,
        sellOrder: selected.sellOrder,
        expiresAt: command.expiresAt ?? delayProposalExpiry(now)
      });

      await dependencies.ledger.saveOrderLock(created.buyLock);
      await dependencies.ledger.saveOrderLock(created.sellLock);
      await dependencies.ledger.saveMatchProposal(created.proposal);
      await recordAudit(dependencies, {
        action: "generate_match_proposal",
        actorId: command.actorId,
        at: now,
        detail: `Match proposal ${created.proposal.proposalId} locked orders ${created.proposal.buyOrderId} and ${created.proposal.sellOrderId}.`,
        entityId: created.proposal.proposalId,
        pairId: snapshot.pair.pairId
      });

      return created;
    });

  const acceptMatch = async (command: AcceptMatchCommand): Promise<MatchProposal> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);
      const now = nowIso();
      const proposal = requireMatchProposalFrom(snapshot.matchProposals, command.proposalId);
      const accepted = acceptMatchProposal({
        proposal,
        accessGrants: snapshot.grants,
        actorId: command.actorId,
        acceptedAt: now
      });

      await dependencies.ledger.saveMatchProposal(accepted);
      await recordAudit(dependencies, {
        action: "accept_match_proposal",
        actorId: command.actorId,
        at: now,
        detail: `Match proposal ${accepted.proposalId} accepted by ${command.actorId}.`,
        entityId: accepted.proposalId,
        pairId: snapshot.pair.pairId
      });

      return accepted;
    });

  const rejectMatch = async (
    command: RejectMatchCommand
  ): Promise<{ buyLock: OrderLock; proposal: MatchProposal; sellLock: OrderLock }> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);
      const now = nowIso();
      const proposal = requireMatchProposalFrom(snapshot.matchProposals, command.proposalId);
      const rejected = rejectMatchProposal({
        proposal,
        accessGrants: snapshot.grants,
        actorId: command.actorId,
        rejectedAt: now,
        ...(command.reason !== undefined ? { reason: command.reason } : {})
      });
      const buyLock = releaseOrderLock({
        lock: requireOrderLockFrom(snapshot.orderLocks, proposal.buyLockId),
        releasedAt: now,
        releasedBy: command.actorId,
        reason: "rejected"
      });
      const sellLock = releaseOrderLock({
        lock: requireOrderLockFrom(snapshot.orderLocks, proposal.sellLockId),
        releasedAt: now,
        releasedBy: command.actorId,
        reason: "rejected"
      });

      await dependencies.ledger.saveMatchProposal(rejected);
      await dependencies.ledger.saveOrderLock(buyLock);
      await dependencies.ledger.saveOrderLock(sellLock);
      await recordAudit(dependencies, {
        action: "reject_match_proposal",
        actorId: command.actorId,
        at: now,
        detail: `Match proposal ${rejected.proposalId} rejected by ${command.actorId}.`,
        entityId: rejected.proposalId,
        pairId: snapshot.pair.pairId
      });

      return {
        proposal: rejected,
        buyLock,
        sellLock
      };
    });

  const releaseExpiredLock = async (
    command: ReleaseExpiredLockCommand
  ): Promise<{ locks: readonly OrderLock[]; proposal: MatchProposal }> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);

      ensureActorCanViewOperatorScope(snapshot.pair, command.actorId);

      const proposal = requireMatchProposalFrom(snapshot.matchProposals, command.proposalId);
      const locks = [
        requireOrderLockFrom(snapshot.orderLocks, proposal.buyLockId),
        requireOrderLockFrom(snapshot.orderLocks, proposal.sellLockId)
      ];

      if (proposal.status === "pending" || proposal.status === "accepted") {
        throw createDomainError(
          "ORDER_LOCK_ACTIVE",
          "The proposal lock window is still active and cannot be released yet.",
          {
            proposalId: proposal.proposalId,
            status: proposal.status
          }
        );
      }

      return {
        proposal,
        locks
      };
    });

  const executeSettlement = async (
    command: ExecuteSettlementCommand
  ): Promise<ExecuteDarkMatchResult> =>
    serializeDarkCrossPair(command.pairId, async () => {
      const snapshot = await loadLivePairSnapshot(dependencies, command.pairId);
      const now = nowIso();
      const proposal = requireMatchProposalFrom(snapshot.matchProposals, command.proposalId);

      if (proposal.status === "executed" && proposal.executionId !== undefined) {
        const executionTicket = snapshot.executions.find(
          (execution) => execution.executionId === proposal.executionId
        );
        const settlementInstruction = snapshot.settlements.find(
          (instruction) => instruction.executionId === proposal.executionId
        );

        if (executionTicket !== undefined && settlementInstruction !== undefined) {
          return {
            proposal,
            buyOrder: requireDarkOrderFrom(snapshot.darkOrders, proposal.buyOrderId),
            sellOrder: requireDarkOrderFrom(snapshot.darkOrders, proposal.sellOrderId),
            buyLock: requireOrderLockFrom(snapshot.orderLocks, proposal.buyLockId),
            sellLock: requireOrderLockFrom(snapshot.orderLocks, proposal.sellLockId),
            executionTicket,
            settlementInstruction
          };
        }
      }

      const executed = executeDarkMatch({
        pair: snapshot.pair,
        accessGrants: snapshot.grants,
        proposal,
        buyOrder: requireDarkOrderFrom(snapshot.darkOrders, proposal.buyOrderId),
        sellOrder: requireDarkOrderFrom(snapshot.darkOrders, proposal.sellOrderId),
        buyLock: requireOrderLockFrom(snapshot.orderLocks, proposal.buyLockId),
        sellLock: requireOrderLockFrom(snapshot.orderLocks, proposal.sellLockId),
        executionId: dependencies.idGenerator.nextId("execution"),
        instructionId: dependencies.idGenerator.nextId("settlement"),
        executedAt: now,
        releasedBy: command.actorId
      });

      await dependencies.ledger.saveDarkOrder(executed.buyOrder);
      await dependencies.ledger.saveDarkOrder(executed.sellOrder);
      await dependencies.ledger.saveOrderLock(executed.buyLock);
      await dependencies.ledger.saveOrderLock(executed.sellLock);
      await dependencies.ledger.saveMatchProposal(executed.proposal);
      await dependencies.ledger.saveExecutionTicket(executed.executionTicket);
      await dependencies.ledger.saveSettlementInstruction(executed.settlementInstruction);
      await recordAudit(dependencies, {
        action: "execute_dark_match",
        actorId: command.actorId,
        at: now,
        detail: `Match proposal ${proposal.proposalId} executed into ${executed.executionTicket.executionId}.`,
        entityId: executed.executionTicket.executionId,
        pairId: snapshot.pair.pairId
      });

      return executed;
    });

  const getDarkSubscriberState = async (
    pairId: string,
    subscriberId: string,
    actorId: string
  ): Promise<DarkSubscriberState | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);

    ensureActorCanViewSubscriberScope(snapshot.pair, snapshot.grants, actorId, subscriberId);

    const orders = snapshot.darkOrders.filter((order) => order.subscriberId === subscriberId);
    const visibleOrderIds = new Set(orders.map((order) => order.orderId));
    const proposals = snapshot.matchProposals.filter(
      (proposal) =>
        proposal.buySubscriberId === subscriberId || proposal.sellSubscriberId === subscriberId
    );
    const proposalLockIds = new Set(
      proposals.flatMap((proposal) => [proposal.buyLockId, proposal.sellLockId])
    );
    const locks = snapshot.orderLocks.filter(
      (lock) => proposalLockIds.has(lock.lockId) || visibleOrderIds.has(lock.orderId)
    );
    const executions = snapshot.executions.filter(
      (execution) =>
        execution.executionKind === "dark_cross" &&
        (execution.buySubscriberId === subscriberId || execution.sellSubscriberId === subscriberId)
    );
    const executionIds = new Set(executions.map((execution) => execution.executionId));
    const settlements = snapshot.settlements.filter(
      (instruction) =>
        instruction.settlementKind === "dark_cross" && executionIds.has(instruction.executionId)
    );

    return {
      subscriberId,
      orders,
      proposals,
      locks,
      executions,
      settlements
    };
  };

  const listPairs = async (): Promise<readonly PairInstance[]> => dependencies.ledger.listPairs();

  const getOperatorView = async (pairId: string, actorId: string): Promise<OperatorView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    if (pair.mode === "ATSPair" && pair.operatorOversightRole === "blinded") {
      throw createDomainError(
        "MISSING_ENTITLEMENT",
        `Use the operator oversight view for blinded ATSPair ${pair.pairId}.`,
        {
          pairId: pair.pairId
        }
      );
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);

    ensureActorCanViewOperatorScope(snapshot.pair, actorId);

    return projectOperatorView(snapshot);
  };

  const getSubscriberView = async (
    pairId: string,
    subscriberId: string,
    actorId: string
  ): Promise<SubscriberView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);

    ensureActorCanViewSubscriberScope(snapshot.pair, snapshot.grants, actorId, subscriberId);

    return projectSubscriberView({
      ...snapshot,
      subscriberId
    });
  };

  const getDealerWorkbenchView = async (
    pairId: string,
    dealerId: string,
    actorId: string
  ): Promise<DealerWorkbenchView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);

    ensureActorCanViewDealerScope(snapshot.pair, snapshot.grants, actorId, dealerId);

    return projectDealerWorkbenchView({
      pair: snapshot.pair,
      rfqs: snapshot.rfqs,
      quotes: snapshot.quotes,
      executions: snapshot.executions,
      dealerId
    });
  };

  const getAuditTrail = async (pairId: string, actorId: string): Promise<AuditTrailView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    ensureActorCanViewAuditTrail(pair, await dependencies.ledger.listAccessGrants(pairId), actorId);

    return projectAuditTrail(pairId, await dependencies.auditLog.list(pairId));
  };

  const getVenueHealth = async (pairId: string): Promise<VenueHealthReadModel | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    return projectVenueHealth(pair, await dependencies.ledger.listAccessGrants(pairId));
  };

  const getSubscriberQuoteLadder = async (
    pairId: string,
    rfqId: string,
    actorId: string
  ): Promise<QuoteComparisonView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);
    const rfq = snapshot.rfqs.find((candidate) => candidate.rfqId === rfqId);

    if (rfq === undefined) {
      return null;
    }

    ensureActorCanViewSubscriberScope(snapshot.pair, snapshot.grants, actorId, rfq.subscriberId);

    return projectSubscriberQuoteLadder({
      invitations: snapshot.invitations,
      pair: snapshot.pair,
      rfq,
      quotes: snapshot.quotes
    });
  };

  const getDealerInvitationHistory = async (
    pairId: string,
    dealerId: string,
    actorId: string
  ): Promise<DealerInvitationHistoryView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);

    ensureActorCanViewDealerScope(snapshot.pair, snapshot.grants, actorId, dealerId);

    return projectDealerInvitationHistory({
      dealerId,
      pair: snapshot.pair,
      invitations: snapshot.invitations,
      quotes: snapshot.quotes,
      revisions: snapshot.revisions,
      withdrawals: snapshot.withdrawals
    });
  };

  const getOperatorOversightView = async (
    pairId: string,
    actorId: string
  ): Promise<OperatorOversightView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadLivePairSnapshot(dependencies, pairId);

    ensureActorCanViewOperatorScope(snapshot.pair, actorId);

    return projectOperatorOversightView({
      pair: snapshot.pair,
      grants: snapshot.grants,
      rfqs: snapshot.rfqs,
      invitations: snapshot.invitations,
      quotes: snapshot.quotes,
      executions: snapshot.executions,
      settlements: snapshot.settlements,
      revisions: snapshot.revisions,
      withdrawals: snapshot.withdrawals,
      auditEntries: await dependencies.auditLog.list(pairId)
    });
  };

  return {
    createPair,
    grantAccess,
    pausePair,
    openRfq,
    inviteDealers,
    reviseInviteSet,
    rejectRfq,
    submitQuote,
    reviseQuote,
    withdrawQuote,
    cancelRfq,
    acceptQuote,
    rejectAllQuotes: rejectAllPairQuotes,
    markSettlementProgression,
    submitDarkOrder,
    cancelDarkOrder: cancelDarkOrderCommand,
    generateMatchProposal,
    acceptMatch,
    rejectMatch,
    releaseExpiredLock,
    executeSettlement,
    listPairs,
    getOperatorView,
    getSubscriberView,
    getDealerWorkbenchView,
    getAuditTrail,
    getVenueHealth,
    getSubscriberQuoteLadder,
    getDealerInvitationHistory,
    getOperatorOversightView,
    getDarkSubscriberState
  };
};
