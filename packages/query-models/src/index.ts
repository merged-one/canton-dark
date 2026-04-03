import {
  isGrantActive,
  resolveEntitlements,
  type AccessGrant,
  type AuditRecord,
  type DealerQuote,
  type ExecutionTicket,
  type PairInstance,
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
  "Dealer quotes",
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

  return {
    title: `${pair.mode} health`,
    status,
    detail:
      status === "rejected"
        ? `${violations.length} venue policy issue(s) require remediation before new trading activity.`
        : pair.pauseState.state === "paused"
          ? `Pair paused by ${pair.pauseState.changedBy}: ${pair.pauseState.reason}.`
          : `Operator ${pair.operatorId} oversees dealer ${pair.dealerId} with ${projectParticipantAccess(pair.pairId, grants).participants.length} active participant grant(s).`,
    summary: {
      pairId: pair.pairId,
      mode: pair.mode,
      operatorId: pair.operatorId,
      dealers: [pair.dealerId],
      paused: pair.pauseState.state === "paused",
      rulebookVersion: pair.rulebookRelease.version,
      activeParticipantCount: projectParticipantAccess(pair.pairId, grants).participants.length,
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
    .filter((rfq) => rfq.dealerId === input.dealerId)
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

export const projectAuditTrail = (
  pairId: string,
  entries: readonly AuditRecord[]
): AuditTrailView => ({
  pairId,
  entries: [...entries].sort(sortAuditEntries)
});
