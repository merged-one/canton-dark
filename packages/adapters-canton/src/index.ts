import type { AuditLogPort, LedgerPort } from "@canton-dark/app-services";
import type {
  AccessGrant,
  AuditRecord,
  DealerInvitation,
  DealerQuote,
  DarkOrder,
  ExecutionTicket,
  MatchProposal,
  OrderLock,
  PairInstance,
  QuoteRevision,
  QuoteWithdrawal,
  RFQSession,
  SettlementInstruction,
  SettlementStatus
} from "@canton-dark/domain-core";

export type CantonCommandAction = "exercise" | "upsert_contract";

export type CantonCommand = {
  action: CantonCommandAction;
  choice?: string;
  key: string;
  observers: readonly string[];
  payload: Record<string, unknown>;
  submitter: string;
  template: string;
};

export type CantonQuery = {
  key: string;
  template: string;
};

export type CantonQueryResult = boolean | number | Record<string, unknown> | string | null;

export type CantonTransport = {
  query: (request: CantonQuery) => Promise<CantonQueryResult>;
  submit: (command: CantonCommand) => Promise<{ accepted: boolean; submissionId: string }>;
};

export type StubCantonTransport = CantonTransport & {
  prime: (template: string, key: string, value: Exclude<CantonQueryResult, null>) => void;
  submissions: () => CantonCommand[];
};

const clone = <T>(value: T): T => structuredClone(value);

const pairObservers = (pair: PairInstance): readonly string[] =>
  [pair.operatorId, ...pair.dealerIds].filter(
    (party, index, values) => values.indexOf(party) === index
  );

export const mapOperatorApprovalToCantonCommand = (pair: PairInstance): CantonCommand => ({
  action: "upsert_contract",
  template: "OperatorApproval",
  key: pair.pairId,
  submitter: pair.operatorId,
  observers: pairObservers(pair),
  payload: {
    pairId: pair.pairId,
    operatorId: pair.operatorId,
    dealerId: pair.dealerId,
    ...pair.operatorApproval
  }
});

export const mapRegulatoryAttestationToCantonCommand = (pair: PairInstance): CantonCommand => ({
  action: "upsert_contract",
  template: "RegulatoryAttestation",
  key: pair.pairId,
  submitter: pair.operatorId,
  observers: pairObservers(pair),
  payload: {
    pairId: pair.pairId,
    operatorId: pair.operatorId,
    dealerId: pair.dealerId,
    ...pair.regulatoryAttestation
  }
});

export const mapRulebookReleaseToCantonCommand = (pair: PairInstance): CantonCommand => ({
  action: "upsert_contract",
  template: "RulebookRelease",
  key: `${pair.pairId}:${pair.rulebookRelease.version}`,
  submitter: pair.operatorId,
  observers: pairObservers(pair),
  payload: {
    pairId: pair.pairId,
    operatorId: pair.operatorId,
    dealerId: pair.dealerId,
    ...pair.rulebookRelease
  }
});

export const mapPauseStateToCantonCommand = (pair: PairInstance): CantonCommand => ({
  action: "upsert_contract",
  template: "PauseState",
  key: pair.pairId,
  submitter: pair.operatorId,
  observers: pairObservers(pair),
  payload: {
    pairId: pair.pairId,
    operatorId: pair.operatorId,
    dealerId: pair.dealerId,
    ...pair.pauseState,
    reason: pair.pauseState.state === "paused" ? pair.pauseState.reason : null
  }
});

export const mapPairToCantonCommand = (pair: PairInstance): CantonCommand => ({
  action: "upsert_contract",
  template: "PairInstance",
  key: pair.pairId,
  submitter: pair.operatorId,
  observers: pairObservers(pair),
  payload: {
    pairId: pair.pairId,
    mode: pair.mode,
    operatorId: pair.operatorId,
    dealerId: pair.dealerId,
    dealerIds: pair.dealerIds,
    operatorOversightRole: pair.operatorOversightRole,
    inviteRevisionPolicy: pair.inviteRevisionPolicy,
    pauseState: pair.pauseState,
    rulebookRelease: pair.rulebookRelease,
    regulatoryAttestation: pair.regulatoryAttestation,
    operatorApproval: pair.operatorApproval
  }
});

export const mapAccessGrantToCantonCommand = (grant: AccessGrant): CantonCommand => ({
  action: "upsert_contract",
  template: "AccessGrant",
  key: grant.grantId,
  submitter: grant.grantedBy,
  observers: [grant.subjectId],
  payload: {
    pairId: grant.pairId,
    subjectId: grant.subjectId,
    role: grant.role,
    entitlements: grant.entitlements,
    revokedAt: grant.revokedAt ?? null,
    revokedBy: grant.revokedBy ?? null
  }
});

export const mapRfqSessionToCantonCommand = (rfq: RFQSession): CantonCommand => ({
  action: "upsert_contract",
  template: "RFQSession",
  key: rfq.rfqId,
  submitter: rfq.subscriberId,
  observers: [rfq.subscriberId, ...(rfq.invitedDealerIds ?? [rfq.dealerId])],
  payload: {
    pairId: rfq.pairId,
    dealerId: rfq.dealerId,
    invitedDealerIds: rfq.invitedDealerIds ?? null,
    currentInvitationVersion: rfq.currentInvitationVersion ?? null,
    subscriberId: rfq.subscriberId,
    instrumentId: rfq.instrumentId,
    side: rfq.side,
    quantity: rfq.quantity,
    status: rfq.status,
    acceptedQuoteId: rfq.acceptedQuoteId ?? null,
    firstResponseAt: rfq.firstResponseAt ?? null,
    responseWindowClosesAt: rfq.responseWindowClosesAt ?? null
  }
});

export const mapDealerInvitationToCantonCommand = (
  invitation: DealerInvitation
): CantonCommand => ({
  action: "upsert_contract",
  template: "DealerInvitation",
  key: invitation.invitationId,
  submitter: invitation.invitedBy,
  observers: [invitation.dealerId, invitation.subscriberId],
  payload: {
    pairId: invitation.pairId,
    rfqId: invitation.rfqId,
    dealerId: invitation.dealerId,
    subscriberId: invitation.subscriberId,
    invitedAt: invitation.invitedAt,
    invitedBy: invitation.invitedBy,
    invitationVersion: invitation.invitationVersion,
    responseWindowClosesAt: invitation.responseWindowClosesAt,
    status: invitation.status,
    respondedAt: invitation.respondedAt ?? null,
    withdrawnAt: invitation.withdrawnAt ?? null,
    withdrawnBy: invitation.withdrawnBy ?? null,
    withdrawalReason: invitation.withdrawalReason ?? null
  }
});

export const mapDealerQuoteToCantonCommand = (quote: DealerQuote): CantonCommand => ({
  action: "upsert_contract",
  template: "DealerQuote",
  key: quote.quoteId,
  submitter: quote.dealerId,
  observers: [quote.dealerId, quote.subscriberId],
  payload: {
    pairId: quote.pairId,
    rfqId: quote.rfqId,
    dealerId: quote.dealerId,
    subscriberId: quote.subscriberId,
    price: quote.price,
    quantity: quote.quantity,
    status: quote.status,
    expiresAt: quote.expiresAt,
    previousQuoteId: quote.previousQuoteId ?? null,
    replacementQuoteId: quote.replacementQuoteId ?? null,
    staleReason: quote.staleReason ?? null,
    withdrawnAt: quote.withdrawnAt ?? null,
    withdrawnBy: quote.withdrawnBy ?? null,
    withdrawalReason: quote.withdrawalReason ?? null
  }
});

export const mapQuoteRevisionToCantonCommand = (revision: QuoteRevision): CantonCommand => ({
  action: "upsert_contract",
  template: "QuoteRevision",
  key: revision.revisionId,
  submitter: revision.revisedBy,
  observers: [revision.dealerId, revision.subscriberId],
  payload: {
    pairId: revision.pairId,
    rfqId: revision.rfqId,
    dealerId: revision.dealerId,
    subscriberId: revision.subscriberId,
    previousQuoteId: revision.previousQuoteId,
    nextQuoteId: revision.nextQuoteId,
    revisedAt: revision.revisedAt
  }
});

export const mapQuoteWithdrawalToCantonCommand = (withdrawal: QuoteWithdrawal): CantonCommand => ({
  action: "upsert_contract",
  template: "QuoteWithdrawal",
  key: withdrawal.withdrawalId,
  submitter: withdrawal.withdrawnBy,
  observers: [withdrawal.dealerId, withdrawal.subscriberId],
  payload: {
    pairId: withdrawal.pairId,
    rfqId: withdrawal.rfqId,
    quoteId: withdrawal.quoteId,
    dealerId: withdrawal.dealerId,
    subscriberId: withdrawal.subscriberId,
    withdrawnAt: withdrawal.withdrawnAt,
    reason: withdrawal.reason ?? null
  }
});

export const mapDarkOrderToCantonCommand = (order: DarkOrder): CantonCommand => ({
  action: "upsert_contract",
  template: "DarkOrder",
  key: order.orderId,
  submitter: order.subscriberId,
  observers: [order.subscriberId],
  payload: {
    orderId: order.orderId,
    clientOrderId: order.clientOrderId,
    pairId: order.pairId,
    subscriberId: order.subscriberId,
    instrumentId: order.instrumentId,
    side: order.side,
    quantity: order.quantity,
    limitPrice: order.limitPrice,
    status: order.status,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    expiresAt: order.expiresAt ?? null,
    cancelledAt: order.cancelledAt ?? null,
    cancelledBy: order.cancelledBy ?? null,
    executedAt: order.executedAt ?? null,
    executionId: order.executionId ?? null
  }
});

export const mapOrderLockToCantonCommand = (lock: OrderLock): CantonCommand => ({
  action: "upsert_contract",
  template: "OrderLock",
  key: lock.lockId,
  submitter: lock.lockedBy,
  observers: [lock.subscriberId],
  payload: {
    lockId: lock.lockId,
    pairId: lock.pairId,
    orderId: lock.orderId,
    proposalId: lock.proposalId,
    subscriberId: lock.subscriberId,
    lockedAt: lock.lockedAt,
    lockedBy: lock.lockedBy,
    lockExpiresAt: lock.lockExpiresAt,
    status: lock.status,
    updatedAt: lock.updatedAt,
    releasedAt: lock.releasedAt ?? null,
    releasedBy: lock.releasedBy ?? null,
    releaseReason: lock.releaseReason ?? null
  }
});

export const mapMatchProposalToCantonCommand = (proposal: MatchProposal): CantonCommand => ({
  action: "upsert_contract",
  template: "MatchProposal",
  key: proposal.proposalId,
  submitter: proposal.createdBy,
  observers: [proposal.buySubscriberId, proposal.sellSubscriberId],
  payload: {
    proposalId: proposal.proposalId,
    pairId: proposal.pairId,
    instrumentId: proposal.instrumentId,
    quantity: proposal.quantity,
    price: proposal.price,
    buyOrderId: proposal.buyOrderId,
    sellOrderId: proposal.sellOrderId,
    buySubscriberId: proposal.buySubscriberId,
    sellSubscriberId: proposal.sellSubscriberId,
    buyLockId: proposal.buyLockId,
    sellLockId: proposal.sellLockId,
    buyResponse: proposal.buyResponse,
    sellResponse: proposal.sellResponse,
    status: proposal.status,
    createdAt: proposal.createdAt,
    createdBy: proposal.createdBy,
    expiresAt: proposal.expiresAt,
    updatedAt: proposal.updatedAt,
    acceptedAt: proposal.acceptedAt ?? null,
    buyAcceptedAt: proposal.buyAcceptedAt ?? null,
    sellAcceptedAt: proposal.sellAcceptedAt ?? null,
    rejectedAt: proposal.rejectedAt ?? null,
    rejectedBy: proposal.rejectedBy ?? null,
    rejectionReason: proposal.rejectionReason ?? null,
    executionId: proposal.executionId ?? null
  }
});

export const mapExecutionTicketToCantonCommand = (execution: ExecutionTicket): CantonCommand => ({
  action: "upsert_contract",
  template: "ExecutionTicket",
  key: execution.executionId,
  submitter:
    execution.subscriberId ?? execution.buySubscriberId ?? execution.sellSubscriberId ?? "system",
  observers: [
    execution.subscriberId,
    execution.dealerId,
    execution.buySubscriberId,
    execution.sellSubscriberId
  ].filter((party): party is string => typeof party === "string" && party.length > 0),
  payload: {
    pairId: execution.pairId,
    executionKind: execution.executionKind ?? "rfq_quote",
    rfqId: execution.rfqId ?? null,
    quoteId: execution.quoteId ?? null,
    dealerId: execution.dealerId ?? null,
    subscriberId: execution.subscriberId ?? null,
    instrumentId: execution.instrumentId,
    side: execution.side ?? null,
    quantity: execution.quantity,
    price: execution.price,
    acceptedAt: execution.acceptedAt,
    matchProposalId: execution.matchProposalId ?? null,
    buyOrderId: execution.buyOrderId ?? null,
    sellOrderId: execution.sellOrderId ?? null,
    buySubscriberId: execution.buySubscriberId ?? null,
    sellSubscriberId: execution.sellSubscriberId ?? null
  }
});

export const mapSettlementInstructionToCantonCommand = (
  instruction: SettlementInstruction
): CantonCommand => ({
  action: "upsert_contract",
  template: "SettlementInstruction",
  key: instruction.instructionId,
  submitter:
    instruction.settlementAgentId ??
    instruction.subscriberId ??
    instruction.sellSubscriberId ??
    "settlement-bridge",
  observers: [instruction.subscriberId, instruction.sellSubscriberId, instruction.dealerId].filter(
    (party): party is string => typeof party === "string" && party.length > 0
  ),
  payload: {
    pairId: instruction.pairId,
    executionId: instruction.executionId,
    status: instruction.status,
    createdAt: instruction.createdAt,
    updatedAt: instruction.updatedAt,
    settlementKind: instruction.settlementKind ?? "rfq_quote",
    matchProposalId: instruction.matchProposalId ?? null,
    buyOrderId: instruction.buyOrderId ?? null,
    sellOrderId: instruction.sellOrderId ?? null,
    subscriberId: instruction.subscriberId ?? null,
    sellSubscriberId: instruction.sellSubscriberId ?? null,
    dealerId: instruction.dealerId ?? null,
    settlementAgentId: instruction.settlementAgentId ?? null
  }
});

export const mapPausePairCommand = (pair: PairInstance, actorId: string): CantonCommand => ({
  action: "exercise",
  template: "PairInstance",
  choice: pair.pauseState.state === "paused" ? "Pause" : "Unpause",
  key: pair.pairId,
  submitter: actorId,
  observers: pairObservers(pair),
  payload:
    pair.pauseState.state === "paused"
      ? {
          reason: pair.pauseState.reason
        }
      : {}
});

export const mapCancelRfqCommand = (rfq: RFQSession, actorId: string): CantonCommand => ({
  action: "exercise",
  template: "RFQSession",
  choice: "Cancel",
  key: rfq.rfqId,
  submitter: actorId,
  observers: [rfq.subscriberId, rfq.dealerId],
  payload: {
    pairId: rfq.pairId
  }
});

export const mapRejectRfqCommand = (
  rfq: RFQSession,
  actorId: string,
  reason?: string
): CantonCommand => ({
  action: "exercise",
  template: "RFQSession",
  choice: "Reject",
  key: rfq.rfqId,
  submitter: actorId,
  observers: [rfq.subscriberId, rfq.dealerId],
  payload: {
    pairId: rfq.pairId,
    reason: reason ?? null
  }
});

export const mapAcceptQuoteCommand = (quote: DealerQuote, actorId: string): CantonCommand => ({
  action: "exercise",
  template: "DealerQuote",
  choice: "Accept",
  key: quote.quoteId,
  submitter: actorId,
  observers: [quote.dealerId, quote.subscriberId],
  payload: {
    pairId: quote.pairId,
    rfqId: quote.rfqId
  }
});

export const mapProgressSettlementCommand = (
  instruction: SettlementInstruction,
  actorId: string,
  status: SettlementStatus
): CantonCommand => ({
  action: "exercise",
  template: "SettlementInstruction",
  choice: "MarkProgression",
  key: instruction.instructionId,
  submitter: actorId,
  observers: [],
  payload: {
    pairId: instruction.pairId,
    status
  }
});

export const mapAuditRecordToCantonCommand = (entry: AuditRecord): CantonCommand => ({
  action: "upsert_contract",
  template: "AuditRecord",
  key: `${entry.pairId}:${entry.at}:${entry.action}`,
  submitter: entry.actorId,
  observers: [entry.actorId],
  payload: {
    pairId: entry.pairId,
    action: entry.action,
    detail: entry.detail,
    entityId: entry.entityId ?? null,
    at: entry.at
  }
});

export const createStubCantonTransport = (): StubCantonTransport => {
  const submissions: CantonCommand[] = [];
  const cache = new Map<string, Exclude<CantonQueryResult, null>>();

  return {
    async query(request) {
      return clone(cache.get(`${request.template}:${request.key}`) ?? null);
    },
    async submit(command) {
      submissions.push(clone(command));
      cache.set(`${command.template}:${command.key}`, clone(command.payload));

      return {
        accepted: true,
        submissionId: `${command.template}:${command.key}`
      };
    },
    prime(template, key, value) {
      cache.set(`${template}:${key}`, clone(value));
    },
    submissions: () => clone(submissions)
  };
};

export const createCantonLedgerPort = (transport: CantonTransport): LedgerPort => {
  const pairs = new Map<string, PairInstance>();
  const accessGrants = new Map<string, AccessGrant[]>();
  const rfqs = new Map<string, RFQSession>();
  const quotes = new Map<string, DealerQuote>();
  const invitations = new Map<string, DealerInvitation>();
  const quoteRevisions = new Map<string, QuoteRevision>();
  const quoteWithdrawals = new Map<string, QuoteWithdrawal>();
  const darkOrders = new Map<string, DarkOrder>();
  const orderLocks = new Map<string, OrderLock>();
  const matchProposals = new Map<string, MatchProposal>();
  const executions = new Map<string, ExecutionTicket>();
  const settlements = new Map<string, SettlementInstruction>();

  return {
    async getDarkOrder(orderId) {
      return clone(darkOrders.get(orderId) ?? null);
    },
    async getExecutionTicket(executionId) {
      return clone(executions.get(executionId) ?? null);
    },
    async getMatchProposal(proposalId) {
      return clone(matchProposals.get(proposalId) ?? null);
    },
    async getPair(pairId) {
      return clone(pairs.get(pairId) ?? null);
    },
    async getOrderLock(lockId) {
      return clone(orderLocks.get(lockId) ?? null);
    },
    async getQuote(quoteId) {
      return clone(quotes.get(quoteId) ?? null);
    },
    async getRfq(rfqId) {
      return clone(rfqs.get(rfqId) ?? null);
    },
    async getSettlementInstruction(instructionId) {
      return clone(settlements.get(instructionId) ?? null);
    },
    async listAccessGrants(pairId) {
      return clone(accessGrants.get(pairId) ?? []);
    },
    async listDarkOrders(pairId) {
      return clone([...darkOrders.values()].filter((order) => order.pairId === pairId));
    },
    async listExecutionTickets(pairId) {
      return clone([...executions.values()].filter((execution) => execution.pairId === pairId));
    },
    async listInvitations(pairId) {
      return clone([...invitations.values()].filter((invitation) => invitation.pairId === pairId));
    },
    async listMatchProposals(pairId) {
      return clone([...matchProposals.values()].filter((proposal) => proposal.pairId === pairId));
    },
    async listOrderLocks(pairId) {
      return clone([...orderLocks.values()].filter((lock) => lock.pairId === pairId));
    },
    async listPairs() {
      return clone([...pairs.values()]);
    },
    async listQuoteRevisions(pairId) {
      return clone([...quoteRevisions.values()].filter((revision) => revision.pairId === pairId));
    },
    async listQuoteWithdrawals(pairId) {
      return clone(
        [...quoteWithdrawals.values()].filter((withdrawal) => withdrawal.pairId === pairId)
      );
    },
    async listQuotes(pairId) {
      return clone([...quotes.values()].filter((quote) => quote.pairId === pairId));
    },
    async listRfqs(pairId) {
      return clone([...rfqs.values()].filter((rfq) => rfq.pairId === pairId));
    },
    async listSettlementInstructions(pairId) {
      return clone([...settlements.values()].filter((settlement) => settlement.pairId === pairId));
    },
    async saveAccessGrant(grant) {
      await transport.submit(mapAccessGrantToCantonCommand(grant));
      accessGrants.set(grant.pairId, [...(accessGrants.get(grant.pairId) ?? []), clone(grant)]);
    },
    async saveDarkOrder(order) {
      await transport.submit(mapDarkOrderToCantonCommand(order));
      darkOrders.set(order.orderId, clone(order));
    },
    async saveExecutionTicket(execution) {
      await transport.submit(mapExecutionTicketToCantonCommand(execution));
      executions.set(execution.executionId, clone(execution));
    },
    async saveInvitation(invitation) {
      await transport.submit(mapDealerInvitationToCantonCommand(invitation));
      invitations.set(invitation.invitationId, clone(invitation));
    },
    async saveMatchProposal(proposal) {
      await transport.submit(mapMatchProposalToCantonCommand(proposal));
      matchProposals.set(proposal.proposalId, clone(proposal));
    },
    async saveOrderLock(lock) {
      await transport.submit(mapOrderLockToCantonCommand(lock));
      orderLocks.set(lock.lockId, clone(lock));
    },
    async savePair(pair) {
      await transport.submit(mapOperatorApprovalToCantonCommand(pair));
      await transport.submit(mapRegulatoryAttestationToCantonCommand(pair));
      await transport.submit(mapRulebookReleaseToCantonCommand(pair));
      await transport.submit(mapPauseStateToCantonCommand(pair));
      await transport.submit(mapPairToCantonCommand(pair));
      pairs.set(pair.pairId, clone(pair));
    },
    async saveQuote(quote) {
      await transport.submit(mapDealerQuoteToCantonCommand(quote));
      quotes.set(quote.quoteId, clone(quote));
    },
    async saveQuoteRevision(revision) {
      await transport.submit(mapQuoteRevisionToCantonCommand(revision));
      quoteRevisions.set(revision.revisionId, clone(revision));
    },
    async saveQuoteWithdrawal(withdrawal) {
      await transport.submit(mapQuoteWithdrawalToCantonCommand(withdrawal));
      quoteWithdrawals.set(withdrawal.withdrawalId, clone(withdrawal));
    },
    async saveRfq(rfq) {
      await transport.submit(mapRfqSessionToCantonCommand(rfq));
      rfqs.set(rfq.rfqId, clone(rfq));
    },
    async saveSettlementInstruction(instruction) {
      await transport.submit(mapSettlementInstructionToCantonCommand(instruction));
      settlements.set(instruction.instructionId, clone(instruction));
    }
  };
};

export const createCantonAuditLogPort = (transport: CantonTransport): AuditLogPort => {
  const entries: AuditRecord[] = [];

  return {
    async list(pairId) {
      return clone(entries.filter((entry) => pairId === undefined || entry.pairId === pairId));
    },
    async record(entry) {
      await transport.submit(mapAuditRecordToCantonCommand(entry));
      entries.push(clone(entry));
    }
  };
};
