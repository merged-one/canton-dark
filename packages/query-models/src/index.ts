import {
  isGrantActive,
  listPairDealerIds,
  quoteTieBreakRule,
  rankComparableQuotes,
  resolveEntitlements,
  type AccessGrant,
  type AuditRecord,
  type DealerInvitation,
  type DealerQuote,
  type ExecutionTicket,
  type PairInstance,
  type QuoteRevision,
  type QuoteWithdrawal,
  type SettlementInstruction,
  type RFQSession
} from "@canton-dark/domain-core";

export type VenueStatus = "healthy" | "paused" | "rejected";

export type PairSummaryView = {
  approvalStatus: PairInstance["operatorApproval"]["status"];
  attestationStatus: PairInstance["regulatoryAttestation"]["status"];
  dealerId: string;
  mode: PairInstance["mode"];
  operatorId: string;
  pairId: string;
  paused: boolean;
  rulebookVersion: string;
};

export type VenueSummary = {
  activeParticipantCount: number;
  dealers: readonly string[];
  ledgerFacts: readonly string[];
  mode: PairInstance["mode"];
  offLedgerFacts: readonly string[];
  operatorId: string;
  pairId: string;
  paused: boolean;
  rulebookVersion: string;
};

export type VenueHealthReadModel = {
  detail: string;
  status: VenueStatus;
  summary: VenueSummary;
  title: string;
  violations: readonly string[];
};

export type ParticipantAccessItemView = {
  entitlements: readonly string[];
  roles: readonly AccessGrant["role"][];
  subjectId: string;
};

export type ParticipantAccessView = {
  pairId: string;
  participants: readonly ParticipantAccessItemView[];
};

export type RFQSessionView = Pick<
  RFQSession,
  | "createdAt"
  | "dealerId"
  | "instrumentId"
  | "quantity"
  | "rfqId"
  | "side"
  | "status"
  | "subscriberId"
>;

export type DealerQuoteView = Pick<
  DealerQuote,
  | "createdAt"
  | "dealerId"
  | "expiresAt"
  | "price"
  | "quantity"
  | "quoteId"
  | "rfqId"
  | "status"
  | "subscriberId"
>;

export type DealerInvitationView = Pick<
  DealerInvitation,
  | "dealerId"
  | "invitationId"
  | "invitationVersion"
  | "invitedAt"
  | "invitedBy"
  | "responseWindowClosesAt"
  | "respondedAt"
  | "rfqId"
  | "status"
  | "subscriberId"
  | "withdrawnAt"
  | "withdrawnBy"
  | "withdrawalReason"
>;

export type QuoteRevisionView = QuoteRevision;
export type QuoteWithdrawalView = QuoteWithdrawal;

export type QuoteComparisonItemView = {
  comparable: boolean;
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  price: number;
  quantity: number;
  quoteId: string;
  rank?: number;
  rfqId: string;
  status: DealerQuote["status"];
};

export type QuoteComparisonView = {
  pairId: string;
  quotes: readonly QuoteComparisonItemView[];
  rfqId: string;
  side: RFQSession["side"];
  subscriberId: string;
  tieBreakRule: string;
};

export type DealerInvitationHistoryView = {
  dealerId: string;
  invitations: readonly DealerInvitationView[];
  pair: PairSummaryView;
  quotes: readonly DealerQuoteView[];
  revisions: readonly QuoteRevisionView[];
  withdrawals: readonly QuoteWithdrawalView[];
};

export type OperatorOversightQuoteView = {
  createdAt: string;
  dealerId: string;
  expiresAt: string;
  price: number | null;
  quantity: number | null;
  quoteId: string;
  rfqId: string;
  status: DealerQuote["status"];
  subscriberId: string;
};

export type OperatorOversightView = {
  audits: readonly AuditTrailEntryView[];
  invitations: readonly DealerInvitationView[];
  oversightRole: PairInstance["operatorOversightRole"];
  pair: PairSummaryView;
  quoteLadders: readonly QuoteComparisonView[];
  quotes: readonly OperatorOversightQuoteView[];
  revisions: readonly QuoteRevisionView[];
  rfqs: readonly RFQSessionView[];
  withdrawals: readonly QuoteWithdrawalView[];
};

export type ExecutionTicketView = ExecutionTicket;

export type SettlementInstructionView = Pick<
  SettlementInstruction,
  "createdAt" | "executionId" | "instructionId" | "status" | "updatedAt"
>;

export type AuditTrailEntryView = AuditRecord;

export type OperatorView = {
  access: ParticipantAccessView;
  executions: readonly ExecutionTicketView[];
  health: VenueHealthReadModel;
  pair: PairSummaryView;
  quotes: readonly DealerQuoteView[];
  rfqs: readonly RFQSessionView[];
  settlements: readonly SettlementInstructionView[];
};

export type SubscriberView = {
  canOpenRfq: boolean;
  entitlements: readonly string[];
  executions: readonly ExecutionTicketView[];
  pair: PairSummaryView;
  quotes: readonly DealerQuoteView[];
  rfqs: readonly RFQSessionView[];
  settlements: readonly SettlementInstructionView[];
  subscriberId: string;
};

export type DealerWorkbenchView = {
  dealerId: string;
  executions: readonly ExecutionTicketView[];
  pair: PairSummaryView;
  quotes: readonly DealerQuoteView[];
  rfqs: readonly RFQSessionView[];
};

export type AuditTrailView = {
  entries: readonly AuditTrailEntryView[];
  pairId: string;
};

const onLedgerFacts = [
  "Operator approvals",
  "Rulebook releases",
  "Access grants",
  "RFQ sessions",
  "Dealer invitations",
  "Dealer quotes",
  "Quote revisions",
  "Quote withdrawals",
  "Execution tickets",
  "Settlement instructions"
] as const;

const offLedgerFacts = [
  "Operator query cache",
  "Operator analytics",
  "Telemetry projection",
  "Transient UI state"
] as const;

const sortBySubject = (left: ParticipantAccessItemView, right: ParticipantAccessItemView) =>
  left.subjectId.localeCompare(right.subjectId);

const sortByCreatedAt = <T extends { createdAt: string }>(left: T, right: T) =>
  left.createdAt === right.createdAt
    ? JSON.stringify(left).localeCompare(JSON.stringify(right))
    : left.createdAt.localeCompare(right.createdAt);

const sortByInvitedAt = (left: DealerInvitation, right: DealerInvitation) =>
  `${left.invitedAt}:${left.invitationId}`.localeCompare(
    `${right.invitedAt}:${right.invitationId}`
  );

const sortByRevisionAt = (left: QuoteRevision, right: QuoteRevision) =>
  `${left.revisedAt}:${left.revisionId}`.localeCompare(`${right.revisedAt}:${right.revisionId}`);

const sortByWithdrawalAt = (left: QuoteWithdrawal, right: QuoteWithdrawal) =>
  `${left.withdrawnAt}:${left.withdrawalId}`.localeCompare(
    `${right.withdrawnAt}:${right.withdrawalId}`
  );

const sortByAcceptedAt = (left: ExecutionTicket, right: ExecutionTicket) =>
  left.acceptedAt === right.acceptedAt
    ? left.executionId.localeCompare(right.executionId)
    : left.acceptedAt.localeCompare(right.acceptedAt);

const sortAuditEntries = (left: AuditRecord, right: AuditRecord) =>
  left.at === right.at ? left.action.localeCompare(right.action) : left.at.localeCompare(right.at);

const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

const projectRfq = (rfq: RFQSession): RFQSessionView => ({
  rfqId: rfq.rfqId,
  dealerId: rfq.dealerId,
  subscriberId: rfq.subscriberId,
  instrumentId: rfq.instrumentId,
  side: rfq.side,
  quantity: rfq.quantity,
  status: rfq.status,
  createdAt: rfq.createdAt
});

const projectQuote = (quote: DealerQuote): DealerQuoteView => ({
  quoteId: quote.quoteId,
  rfqId: quote.rfqId,
  dealerId: quote.dealerId,
  subscriberId: quote.subscriberId,
  price: quote.price,
  quantity: quote.quantity,
  expiresAt: quote.expiresAt,
  status: quote.status,
  createdAt: quote.createdAt
});

const projectInvitation = (invitation: DealerInvitation): DealerInvitationView => ({
  invitationId: invitation.invitationId,
  rfqId: invitation.rfqId,
  dealerId: invitation.dealerId,
  subscriberId: invitation.subscriberId,
  invitationVersion: invitation.invitationVersion,
  invitedAt: invitation.invitedAt,
  invitedBy: invitation.invitedBy,
  responseWindowClosesAt: invitation.responseWindowClosesAt,
  status: invitation.status,
  ...(invitation.respondedAt !== undefined ? { respondedAt: invitation.respondedAt } : {}),
  ...(invitation.withdrawnAt !== undefined ? { withdrawnAt: invitation.withdrawnAt } : {}),
  ...(invitation.withdrawnBy !== undefined ? { withdrawnBy: invitation.withdrawnBy } : {}),
  ...(invitation.withdrawalReason !== undefined
    ? { withdrawalReason: invitation.withdrawalReason }
    : {})
});

const projectExecution = (execution: ExecutionTicket): ExecutionTicketView => execution;

const projectSettlement = (instruction: SettlementInstruction): SettlementInstructionView => ({
  instructionId: instruction.instructionId,
  executionId: instruction.executionId,
  status: instruction.status,
  createdAt: instruction.createdAt,
  updatedAt: instruction.updatedAt
});

export const projectPairSummary = (pair: PairInstance): PairSummaryView => ({
  pairId: pair.pairId,
  mode: pair.mode,
  operatorId: pair.operatorId,
  dealerId: pair.dealerId,
  paused: pair.pauseState.state === "paused",
  rulebookVersion: pair.rulebookRelease.version,
  approvalStatus: pair.operatorApproval.status,
  attestationStatus: pair.regulatoryAttestation.status
});

export const projectParticipantAccess = (
  pairId: string,
  grants: readonly AccessGrant[]
): ParticipantAccessView => {
  const participants = uniqueSorted(
    grants.filter(isGrantActive).map((grant) => grant.subjectId)
  ).map((subjectId) => {
    const activeGrants = grants.filter(
      (grant) => grant.subjectId === subjectId && isGrantActive(grant)
    );

    return {
      subjectId,
      roles: uniqueSorted(activeGrants.map((grant) => grant.role)),
      entitlements: resolveEntitlements(subjectId, activeGrants)
    };
  });

  return {
    pairId,
    participants: participants.sort(sortBySubject)
  };
};

export const projectVenueHealth = (
  pair: PairInstance,
  grants: readonly AccessGrant[]
): VenueHealthReadModel => {
  const violations = [
    ...(pair.operatorApproval.status === "approved" ? [] : ["Operator approval is not active."]),
    ...(pair.regulatoryAttestation.status === "attested"
      ? []
      : ["Regulatory attestation is not active."])
  ];
  const status: VenueStatus =
    violations.length > 0 ? "rejected" : pair.pauseState.state === "paused" ? "paused" : "healthy";
  const activeParticipants = projectParticipantAccess(pair.pairId, grants).participants.length;
  const dealers = listPairDealerIds(pair);

  return {
    title: `${pair.mode} health`,
    status,
    detail:
      status === "rejected"
        ? `${violations.length} venue policy issue(s) require remediation before new trading activity.`
        : pair.pauseState.state === "paused"
          ? `Pair paused by ${pair.pauseState.changedBy}: ${pair.pauseState.reason}.`
          : pair.mode === "SingleDealerPair"
            ? `Operator ${pair.operatorId} oversees dealer ${pair.dealerId} with ${activeParticipants} active participant grant(s).`
            : `Operator ${pair.operatorId} oversees ${dealers.length} directed dealers with ${activeParticipants} active participant grant(s).`,
    summary: {
      pairId: pair.pairId,
      mode: pair.mode,
      operatorId: pair.operatorId,
      dealers,
      paused: pair.pauseState.state === "paused",
      rulebookVersion: pair.rulebookRelease.version,
      activeParticipantCount: activeParticipants,
      ledgerFacts: onLedgerFacts,
      offLedgerFacts
    },
    violations
  };
};

export const projectOperatorView = (input: {
  executions: readonly ExecutionTicket[];
  grants: readonly AccessGrant[];
  pair: PairInstance;
  quotes: readonly DealerQuote[];
  rfqs: readonly RFQSession[];
  settlements: readonly SettlementInstruction[];
}): OperatorView => ({
  pair: projectPairSummary(input.pair),
  access: projectParticipantAccess(input.pair.pairId, input.grants),
  rfqs: [...input.rfqs].sort(sortByCreatedAt).map(projectRfq),
  quotes: [...input.quotes].sort(sortByCreatedAt).map(projectQuote),
  executions: [...input.executions].sort(sortByAcceptedAt).map(projectExecution),
  settlements: [...input.settlements].sort(sortByCreatedAt).map(projectSettlement),
  health: projectVenueHealth(input.pair, input.grants)
});

export const projectSubscriberView = (input: {
  executions: readonly ExecutionTicket[];
  grants: readonly AccessGrant[];
  pair: PairInstance;
  quotes: readonly DealerQuote[];
  rfqs: readonly RFQSession[];
  settlements: readonly SettlementInstruction[];
  subscriberId: string;
}): SubscriberView => {
  const entitlements = resolveEntitlements(input.subscriberId, input.grants);
  const executionIds = new Set(
    input.executions
      .filter((execution) => execution.subscriberId === input.subscriberId)
      .map((execution) => execution.executionId)
  );

  return {
    pair: projectPairSummary(input.pair),
    subscriberId: input.subscriberId,
    entitlements,
    canOpenRfq: entitlements.includes("submit_rfq"),
    rfqs: input.rfqs
      .filter((rfq) => rfq.subscriberId === input.subscriberId)
      .sort(sortByCreatedAt)
      .map(projectRfq),
    quotes: input.quotes
      .filter((quote) => quote.subscriberId === input.subscriberId)
      .sort(sortByCreatedAt)
      .map(projectQuote),
    executions: input.executions
      .filter((execution) => execution.subscriberId === input.subscriberId)
      .sort(sortByAcceptedAt)
      .map(projectExecution),
    settlements: input.settlements
      .filter((settlement) => executionIds.has(settlement.executionId))
      .sort(sortByCreatedAt)
      .map(projectSettlement)
  };
};

export const projectDealerWorkbenchView = (input: {
  dealerId: string;
  executions: readonly ExecutionTicket[];
  pair: PairInstance;
  quotes: readonly DealerQuote[];
  rfqs: readonly RFQSession[];
}): DealerWorkbenchView => ({
  pair: projectPairSummary(input.pair),
  dealerId: input.dealerId,
  rfqs: input.rfqs
    .filter(
      (rfq) => rfq.dealerId === input.dealerId || rfq.invitedDealerIds?.includes(input.dealerId)
    )
    .sort(sortByCreatedAt)
    .map(projectRfq),
  quotes: input.quotes
    .filter((quote) => quote.dealerId === input.dealerId)
    .sort(sortByCreatedAt)
    .map(projectQuote),
  executions: input.executions
    .filter((execution) => execution.dealerId === input.dealerId)
    .sort(sortByAcceptedAt)
    .map(projectExecution)
});

export const projectSubscriberQuoteLadder = (input: {
  pair: PairInstance;
  quotes: readonly DealerQuote[];
  rfq: RFQSession;
}): QuoteComparisonView => {
  const relevantQuotes = input.quotes
    .filter(
      (quote) => quote.rfqId === input.rfq.rfqId && quote.subscriberId === input.rfq.subscriberId
    )
    .sort(sortByCreatedAt);
  const rankMap = new Map(
    rankComparableQuotes(input.rfq.side, relevantQuotes).map((entry) => [
      entry.quote.quoteId,
      entry.rank
    ])
  );

  return {
    pairId: input.pair.pairId,
    rfqId: input.rfq.rfqId,
    subscriberId: input.rfq.subscriberId,
    side: input.rfq.side,
    tieBreakRule: quoteTieBreakRule,
    quotes: relevantQuotes.map((quote) => {
      const rank = rankMap.get(quote.quoteId);

      return {
        quoteId: quote.quoteId,
        rfqId: quote.rfqId,
        dealerId: quote.dealerId,
        price: quote.price,
        quantity: quote.quantity,
        expiresAt: quote.expiresAt,
        status: quote.status,
        createdAt: quote.createdAt,
        comparable: rank !== undefined,
        ...(rank !== undefined ? { rank } : {})
      };
    })
  };
};

export const projectDealerInvitationHistory = (input: {
  dealerId: string;
  invitations: readonly DealerInvitation[];
  pair: PairInstance;
  quotes: readonly DealerQuote[];
  revisions: readonly QuoteRevision[];
  withdrawals: readonly QuoteWithdrawal[];
}): DealerInvitationHistoryView => ({
  pair: projectPairSummary(input.pair),
  dealerId: input.dealerId,
  invitations: input.invitations
    .filter((invitation) => invitation.dealerId === input.dealerId)
    .sort(sortByInvitedAt)
    .map(projectInvitation),
  quotes: input.quotes
    .filter((quote) => quote.dealerId === input.dealerId)
    .sort(sortByCreatedAt)
    .map(projectQuote),
  revisions: input.revisions
    .filter((revision) => revision.dealerId === input.dealerId)
    .sort(sortByRevisionAt),
  withdrawals: input.withdrawals
    .filter((withdrawal) => withdrawal.dealerId === input.dealerId)
    .sort(sortByWithdrawalAt)
});

export const projectOperatorOversightView = (input: {
  auditEntries: readonly AuditRecord[];
  invitations: readonly DealerInvitation[];
  pair: PairInstance;
  quotes: readonly DealerQuote[];
  revisions: readonly QuoteRevision[];
  rfqs: readonly RFQSession[];
  withdrawals: readonly QuoteWithdrawal[];
}): OperatorOversightView => {
  const ladders =
    input.pair.mode === "ATSPair" && input.pair.operatorOversightRole === "blinded"
      ? []
      : input.rfqs
          .filter((rfq) => rfq.subscriberId !== "")
          .sort(sortByCreatedAt)
          .map((rfq) =>
            projectSubscriberQuoteLadder({
              pair: input.pair,
              rfq,
              quotes: input.quotes
            })
          );

  return {
    pair: projectPairSummary(input.pair),
    oversightRole: input.pair.operatorOversightRole,
    rfqs: [...input.rfqs].sort(sortByCreatedAt).map(projectRfq),
    invitations: [...input.invitations].sort(sortByInvitedAt).map(projectInvitation),
    quotes: [...input.quotes].sort(sortByCreatedAt).map((quote) => ({
      quoteId: quote.quoteId,
      rfqId: quote.rfqId,
      dealerId: quote.dealerId,
      subscriberId: quote.subscriberId,
      expiresAt: quote.expiresAt,
      status: quote.status,
      createdAt: quote.createdAt,
      price:
        input.pair.mode === "ATSPair" &&
        input.pair.operatorOversightRole === "blinded" &&
        quote.status !== "accepted"
          ? null
          : quote.price,
      quantity:
        input.pair.mode === "ATSPair" &&
        input.pair.operatorOversightRole === "blinded" &&
        quote.status !== "accepted"
          ? null
          : quote.quantity
    })),
    quoteLadders: ladders,
    revisions: [...input.revisions].sort(sortByRevisionAt),
    withdrawals: [...input.withdrawals].sort(sortByWithdrawalAt),
    audits: projectAuditTrail(input.pair.pairId, input.auditEntries).entries
  };
};

export const projectAuditTrail = (
  pairId: string,
  entries: readonly AuditRecord[]
): AuditTrailView => ({
  pairId,
  entries: [...entries].sort(sortAuditEntries)
});
