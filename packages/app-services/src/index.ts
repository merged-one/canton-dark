import {
  acceptDealerQuote,
  cancelRfqSession,
  createAccessGrant,
  createDealerQuote,
  createDomainError,
  createPairInstance,
  createRfqSession,
  expireDealerQuote,
  hasEntitlement,
  markRfqQuoteExpired,
  markRfqQuoted,
  progressSettlementInstruction,
  rejectRfqSession,
  setPairPauseState,
  type AccessGrant,
  type AuditRecord,
  type DealerQuote,
  type ExecutionTicket,
  type PairInstance,
  type RFQSession,
  type SettlementInstruction,
  type SettlementStatus
} from "@canton-dark/domain-core";
import {
  projectAuditTrail,
  projectDealerWorkbenchView,
  projectOperatorView,
  projectSubscriberView,
  projectVenueHealth,
  type AuditTrailView,
  type DealerWorkbenchView,
  type OperatorView,
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
  getExecutionTicket: (executionId: string) => Promise<ExecutionTicket | null>;
  getPair: (pairId: string) => Promise<PairInstance | null>;
  getQuote: (quoteId: string) => Promise<DealerQuote | null>;
  getRfq: (rfqId: string) => Promise<RFQSession | null>;
  getSettlementInstruction: (instructionId: string) => Promise<SettlementInstruction | null>;
  listAccessGrants: (pairId: string) => Promise<readonly AccessGrant[]>;
  listExecutionTickets: (pairId: string) => Promise<readonly ExecutionTicket[]>;
  listPairs: () => Promise<readonly PairInstance[]>;
  listQuotes: (pairId: string) => Promise<readonly DealerQuote[]>;
  listRfqs: (pairId: string) => Promise<readonly RFQSession[]>;
  listSettlementInstructions: (pairId: string) => Promise<readonly SettlementInstruction[]>;
  saveAccessGrant: (grant: AccessGrant) => Promise<void>;
  saveExecutionTicket: (execution: ExecutionTicket) => Promise<void>;
  savePair: (pair: PairInstance) => Promise<void>;
  saveQuote: (quote: DealerQuote) => Promise<void>;
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
  dealerId: string;
  jurisdiction: string;
  operatorId: string;
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
  side: RFQSession["side"];
};

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

export type MarkSettlementProgressionCommand = {
  actorId: string;
  instructionId: string;
  pairId: string;
  status: SettlementStatus;
};

const requirePair = async (ledger: LedgerPort, pairId: string): Promise<PairInstance> => {
  const pair = await ledger.getPair(pairId);

  if (pair === null) {
    throw new Error(`Pair ${pairId} was not found.`);
  }

  return pair;
};

const requireRfq = async (ledger: LedgerPort, rfqId: string): Promise<RFQSession> => {
  const rfq = await ledger.getRfq(rfqId);

  if (rfq === null) {
    throw new Error(`RFQ ${rfqId} was not found.`);
  }

  return rfq;
};

const requireQuote = async (ledger: LedgerPort, quoteId: string): Promise<DealerQuote> => {
  const quote = await ledger.getQuote(quoteId);

  if (quote === null) {
    throw new Error(`Quote ${quoteId} was not found.`);
  }

  return quote;
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
  if (rfq.dealerId !== actorId) {
    throw createDomainError(
      "MISSING_ENTITLEMENT",
      `Actor ${actorId} does not own RFQ ${rfq.rfqId} as dealer.`,
      {
        actorId,
        dealerId: rfq.dealerId,
        rfqId: rfq.rfqId
      }
    );
  }
};

const loadPairSnapshot = async (dependencies: VenueApplicationDependencies, pairId: string) => {
  const pair = await requirePair(dependencies.ledger, pairId);
  const [grants, rfqs, quotes, executions, settlements] = await Promise.all([
    dependencies.ledger.listAccessGrants(pairId),
    dependencies.ledger.listRfqs(pairId),
    dependencies.ledger.listQuotes(pairId),
    dependencies.ledger.listExecutionTickets(pairId),
    dependencies.ledger.listSettlementInstructions(pairId)
  ]);

  return {
    pair,
    grants,
    rfqs,
    quotes,
    executions,
    settlements
  };
};

const recordAudit = async (
  dependencies: VenueApplicationDependencies,
  entry: AuditRecord
): Promise<void> => {
  await dependencies.auditLog.record(entry);
};

export const createVenueApplication = (dependencies: VenueApplicationDependencies) => {
  const nowIso = (): string => dependencies.clock.now().toISOString();

  const createPair = async (command: CreatePairCommand): Promise<PairInstance> => {
    const now = nowIso();
    const pair = createPairInstance({
      pairId: command.pairId ?? dependencies.idGenerator.nextId("pair"),
      mode: "SingleDealerPair",
      operatorId: command.operatorId,
      dealerId: command.dealerId,
      createdAt: now,
      operatorApproval: {
        status: "approved",
        approvedAt: now,
        approvedBy: command.actorId
      },
      regulatoryAttestation: {
        status: "attested",
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
      createAccessGrant({
        grantId: dependencies.idGenerator.nextId("grant"),
        pairId: pair.pairId,
        subjectId: pair.dealerId,
        role: "dealer",
        grantedAt: now,
        grantedBy: command.actorId,
        note: "bootstrap dealer access"
      })
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
      detail: `SingleDealerPair ${pair.pairId} created with dealer ${pair.dealerId}.`,
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
    if (command.role === "dealer" && command.subjectId !== pair.dealerId) {
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
      createdAt: now
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

  const rejectRfq = async (command: RejectRfqCommand): Promise<RFQSession> => {
    const [pair, rfq, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      requireRfq(dependencies.ledger, command.rfqId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();

    ensureActorEntitled(pair, grants, command.actorId, "respond_quote");
    ensureDealerOwnsRfq(rfq, command.actorId);

    const rejected = rejectRfqSession({
      rfq,
      rejectedAt: now,
      rejectedBy: command.actorId,
      ...(command.reason !== undefined ? { reason: command.reason } : {})
    });

    await dependencies.ledger.saveRfq(rejected);
    await recordAudit(dependencies, {
      action: "reject_rfq",
      actorId: command.actorId,
      at: now,
      detail: `RFQ ${rfq.rfqId} rejected by dealer ${command.actorId}.`,
      entityId: rfq.rfqId,
      pairId: pair.pairId
    });

    return rejected;
  };

  const submitQuote = async (
    command: SubmitQuoteCommand
  ): Promise<{ quote: DealerQuote; rfq: RFQSession }> => {
    const [pair, rfq, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      requireRfq(dependencies.ledger, command.rfqId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();

    const quote = createDealerQuote({
      quoteId: dependencies.idGenerator.nextId("quote"),
      pair,
      rfq,
      accessGrants: grants,
      dealerId: command.actorId,
      price: command.price,
      quantity: command.quantity,
      createdAt: now,
      expiresAt: command.expiresAt
    });
    const quotedRfq = markRfqQuoted(rfq, now);

    await dependencies.ledger.saveQuote(quote);
    await dependencies.ledger.saveRfq(quotedRfq);
    await recordAudit(dependencies, {
      action: "submit_quote",
      actorId: command.actorId,
      at: now,
      detail: `Quote ${quote.quoteId} submitted for RFQ ${rfq.rfqId}.`,
      entityId: quote.quoteId,
      pairId: pair.pairId
    });

    return {
      quote,
      rfq: quotedRfq
    };
  };

  const cancelRfq = async (command: CancelRfqCommand): Promise<RFQSession> => {
    const [pair, rfq, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      requireRfq(dependencies.ledger, command.rfqId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();

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
    const [pair, rfq, quote, grants] = await Promise.all([
      requirePair(dependencies.ledger, command.pairId),
      requireRfq(dependencies.ledger, command.rfqId),
      requireQuote(dependencies.ledger, command.quoteId),
      dependencies.ledger.listAccessGrants(command.pairId)
    ]);
    const now = nowIso();
    const expiredQuote = expireDealerQuote(quote, now);

    if (expiredQuote !== quote) {
      await dependencies.ledger.saveQuote(expiredQuote);

      if (rfq.status === "quoted") {
        await dependencies.ledger.saveRfq(markRfqQuoteExpired(rfq, now));
      }

      await recordAudit(dependencies, {
        action: "expire_quote",
        actorId: quote.dealerId,
        at: now,
        detail: `Quote ${quote.quoteId} expired before acceptance.`,
        entityId: quote.quoteId,
        pairId: pair.pairId
      });

      throw createDomainError("QUOTE_EXPIRED", "Dealer quotes must be accepted before expiry.", {
        pairId: pair.pairId,
        quoteId: quote.quoteId
      });
    }

    const accepted = acceptDealerQuote({
      pair,
      rfq,
      quote,
      accessGrants: grants,
      acceptedBy: command.actorId,
      acceptedAt: now,
      executionId: dependencies.idGenerator.nextId("execution"),
      instructionId: dependencies.idGenerator.nextId("settlement")
    });

    await dependencies.ledger.saveRfq(accepted.rfq);
    await dependencies.ledger.saveQuote(accepted.quote);
    await dependencies.ledger.saveExecutionTicket(accepted.executionTicket);
    await dependencies.ledger.saveSettlementInstruction(accepted.settlementInstruction);
    await recordAudit(dependencies, {
      action: "accept_quote",
      actorId: command.actorId,
      at: now,
      detail: `Quote ${accepted.quote.quoteId} accepted into execution ${accepted.executionTicket.executionId}.`,
      entityId: accepted.executionTicket.executionId,
      pairId: pair.pairId
    });

    return accepted;
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

  const listPairs = async (): Promise<readonly PairInstance[]> => dependencies.ledger.listPairs();

  const getOperatorView = async (pairId: string): Promise<OperatorView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadPairSnapshot(dependencies, pairId);

    return projectOperatorView(snapshot);
  };

  const getSubscriberView = async (
    pairId: string,
    subscriberId: string
  ): Promise<SubscriberView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadPairSnapshot(dependencies, pairId);

    return projectSubscriberView({
      ...snapshot,
      subscriberId
    });
  };

  const getDealerWorkbenchView = async (
    pairId: string,
    dealerId: string
  ): Promise<DealerWorkbenchView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    const snapshot = await loadPairSnapshot(dependencies, pairId);

    return projectDealerWorkbenchView({
      pair: snapshot.pair,
      rfqs: snapshot.rfqs,
      quotes: snapshot.quotes,
      executions: snapshot.executions,
      dealerId
    });
  };

  const getAuditTrail = async (pairId: string): Promise<AuditTrailView | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    return projectAuditTrail(pairId, await dependencies.auditLog.list(pairId));
  };

  const getVenueHealth = async (pairId: string): Promise<VenueHealthReadModel | null> => {
    const pair = await dependencies.ledger.getPair(pairId);

    if (pair === null) {
      return null;
    }

    return projectVenueHealth(pair, await dependencies.ledger.listAccessGrants(pairId));
  };

  return {
    createPair,
    grantAccess,
    pausePair,
    openRfq,
    rejectRfq,
    submitQuote,
    cancelRfq,
    acceptQuote,
    markSettlementProgression,
    listPairs,
    getOperatorView,
    getSubscriberView,
    getDealerWorkbenchView,
    getAuditTrail,
    getVenueHealth
  };
};
