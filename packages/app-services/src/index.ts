import {
  acceptDealerQuote,
  cancelRfqSession,
  createAccessGrant,
  createDealerInvitations,
  createDealerQuote,
  createDomainError,
  createPairInstance,
  createRfqSession,
  hasEntitlement,
  markDealerInvitationResponded,
  markRfqQuoted,
  progressSettlementInstruction,
  rejectAllQuotes,
  rejectRfqSession,
  reviseDealerQuote,
  setPairPauseState,
  synchronizeRfqLifecycle,
  withdrawDealerQuote,
  type AccessGrant,
  type AuditRecord,
  type DealerInvitation,
  type DealerQuote,
  type ExecutionTicket,
  type InviteRevisionPolicy,
  type OperatorOversightRole,
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
  getExecutionTicket: (executionId: string) => Promise<ExecutionTicket | null>;
  getPair: (pairId: string) => Promise<PairInstance | null>;
  getQuote: (quoteId: string) => Promise<DealerQuote | null>;
  getRfq: (rfqId: string) => Promise<RFQSession | null>;
  getSettlementInstruction: (instructionId: string) => Promise<SettlementInstruction | null>;
  listAccessGrants: (pairId: string) => Promise<readonly AccessGrant[]>;
  listExecutionTickets: (pairId: string) => Promise<readonly ExecutionTicket[]>;
  listInvitations: (pairId: string) => Promise<readonly DealerInvitation[]>;
  listPairs: () => Promise<readonly PairInstance[]>;
  listQuoteRevisions: (pairId: string) => Promise<readonly QuoteRevision[]>;
  listQuoteWithdrawals: (pairId: string) => Promise<readonly QuoteWithdrawal[]>;
  listQuotes: (pairId: string) => Promise<readonly DealerQuote[]>;
  listRfqs: (pairId: string) => Promise<readonly RFQSession[]>;
  listSettlementInstructions: (pairId: string) => Promise<readonly SettlementInstruction[]>;
  saveAccessGrant: (grant: AccessGrant) => Promise<void>;
  saveExecutionTicket: (execution: ExecutionTicket) => Promise<void>;
  saveInvitation: (invitation: DealerInvitation) => Promise<void>;
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

const loadRawPairSnapshot = async (dependencies: VenueApplicationDependencies, pairId: string) => {
  const pair = await requirePair(dependencies.ledger, pairId);
  const [grants, rfqs, quotes, executions, settlements, invitations, revisions, withdrawals] =
    await Promise.all([
      dependencies.ledger.listAccessGrants(pairId),
      dependencies.ledger.listRfqs(pairId),
      dependencies.ledger.listQuotes(pairId),
      dependencies.ledger.listExecutionTickets(pairId),
      dependencies.ledger.listSettlementInstructions(pairId),
      dependencies.ledger.listInvitations(pairId),
      dependencies.ledger.listQuoteRevisions(pairId),
      dependencies.ledger.listQuoteWithdrawals(pairId)
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
    withdrawals
  };
};

const loadLivePairSnapshot = async (dependencies: VenueApplicationDependencies, pairId: string) => {
  const pair = await requirePair(dependencies.ledger, pairId);

  await synchronizePairLifecycle(dependencies, pair);

  return loadRawPairSnapshot(dependencies, pairId);
};

export const createVenueApplication = (dependencies: VenueApplicationDependencies) => {
  const nowIso = (): string => dependencies.clock.now().toISOString();

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
      rfqs: snapshot.rfqs,
      invitations: snapshot.invitations,
      quotes: snapshot.quotes,
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
    listPairs,
    getOperatorView,
    getSubscriberView,
    getDealerWorkbenchView,
    getAuditTrail,
    getVenueHealth,
    getSubscriberQuoteLadder,
    getDealerInvitationHistory,
    getOperatorOversightView
  };
};
