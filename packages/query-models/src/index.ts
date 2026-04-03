import {
  classifyFactLocation,
  isGrantActive,
  resolveEntitlements,
  type AccessGrant,
  type DarkOrder,
  type Entitlement,
  type Execution,
  type MatchProposal,
  type PairInstance,
  type PairMode,
  type ParticipantRole,
  type Quote,
  type RFQ
} from "@canton-dark/domain-core";

export type VenueStatus = "healthy" | "paused" | "rejected";

export type PairSummaryView = {
  approvalStatus: PairInstance["operatorApproval"]["status"];
  attestationStatus: PairInstance["regulatoryAttestation"]["status"];
  dealers: readonly string[];
  mode: PairMode;
  operatorId: string;
  pairId: string;
  paused: boolean;
  rulebookVersion: string;
};

export type VenueSummary = {
  activeParticipantCount: number;
  dealers: readonly string[];
  ledgerFacts: readonly string[];
  mode: PairMode;
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
  entitlements: readonly Entitlement[];
  roles: readonly ParticipantRole[];
  subjectId: string;
};

export type ParticipantAccessView = {
  pairId: string;
  participants: readonly ParticipantAccessItemView[];
};

export type RFQView = Pick<
  RFQ,
  "pairId" | "quantity" | "requesterId" | "rfqId" | "side" | "status"
> & {
  dealerCount: number;
};

export type QuoteView = Pick<
  Quote,
  "dealerId" | "pairId" | "price" | "quantity" | "quoteId" | "status"
>;

export type ExecutionView = Pick<
  Execution,
  | "buyerId"
  | "executionId"
  | "pairId"
  | "price"
  | "quantity"
  | "sellerId"
  | "settlementStatus"
  | "source"
>;

export type DarkOrderView = Pick<
  DarkOrder,
  "limitPrice" | "orderId" | "pairId" | "participantId" | "quantity" | "side" | "status"
>;

export type MatchProposalView = Pick<
  MatchProposal,
  "pairId" | "proposalId" | "proposedPrice" | "proposedQuantity" | "referencePrice" | "status"
>;

export type TradingActivityView = {
  darkOrders: readonly DarkOrderView[];
  executions: readonly ExecutionView[];
  matches: readonly MatchProposalView[];
  pairId: string;
  quotes: readonly QuoteView[];
  rfqs: readonly RFQView[];
};

export type PairDashboardView = {
  access: ParticipantAccessView;
  activity: TradingActivityView;
  health: VenueHealthReadModel;
  pair: PairSummaryView;
};

const factCatalog = [
  { category: "shared-rfq-state", label: "Shared RFQ state" },
  { category: "shared-execution-state", label: "Shared execution state" },
  { category: "query-cache", label: "Operator query cache" },
  { category: "local-analytics", label: "Operator analytics" },
  { category: "telemetry-projection", label: "Telemetry projection" },
  { category: "ui-state", label: "Transient UI state" }
] as const;

const projectFacts = (location: "off-ledger" | "on-ledger"): string[] =>
  factCatalog
    .filter((item) => classifyFactLocation(item.category) === location)
    .map((item) => item.label);

const bySubjectId = (left: ParticipantAccessItemView, right: ParticipantAccessItemView) =>
  left.subjectId.localeCompare(right.subjectId);

const uniqueSorted = <T extends string>(values: readonly T[]): T[] =>
  [...new Set(values)].sort((left, right) => left.localeCompare(right));

export const projectPairSummary = (pair: PairInstance): PairSummaryView => ({
  pairId: pair.pairId,
  mode: pair.mode,
  operatorId: pair.operatorId,
  dealers: pair.dealers,
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
    participants: participants.sort(bySubjectId)
  };
};

export const projectTradingActivity = (
  pairId: string,
  records: {
    darkOrders?: readonly DarkOrder[];
    executions?: readonly Execution[];
    matches?: readonly MatchProposal[];
    quotes?: readonly Quote[];
    rfqs?: readonly RFQ[];
  }
): TradingActivityView => ({
  pairId,
  rfqs: (records.rfqs ?? []).map((rfq) => ({
    rfqId: rfq.rfqId,
    pairId: rfq.pairId,
    requesterId: rfq.requesterId,
    side: rfq.side,
    quantity: rfq.quantity,
    status: rfq.status,
    dealerCount: rfq.directedDealerIds.length
  })),
  quotes: (records.quotes ?? []).map((quote) => ({
    quoteId: quote.quoteId,
    pairId: quote.pairId,
    dealerId: quote.dealerId,
    price: quote.price,
    quantity: quote.quantity,
    status: quote.status
  })),
  executions: (records.executions ?? []).map((execution) => ({
    executionId: execution.executionId,
    pairId: execution.pairId,
    buyerId: execution.buyerId,
    sellerId: execution.sellerId,
    price: execution.price,
    quantity: execution.quantity,
    settlementStatus: execution.settlementStatus,
    source: execution.source
  })),
  darkOrders: (records.darkOrders ?? []).map((order) => ({
    orderId: order.orderId,
    pairId: order.pairId,
    participantId: order.participantId,
    side: order.side,
    quantity: order.quantity,
    limitPrice: order.limitPrice,
    status: order.status
  })),
  matches: (records.matches ?? []).map((match) => ({
    proposalId: match.proposalId,
    pairId: match.pairId,
    proposedPrice: match.proposedPrice,
    proposedQuantity: match.proposedQuantity,
    referencePrice: match.referencePrice,
    status: match.status
  }))
});

export const projectVenueHealth = (
  pair: PairInstance,
  grants: readonly AccessGrant[],
  violations: readonly string[] = []
): VenueHealthReadModel => {
  const access = projectParticipantAccess(pair.pairId, grants);
  const status: VenueStatus =
    violations.length > 0 ? "rejected" : pair.pauseState.state === "paused" ? "paused" : "healthy";
  const detail =
    status === "rejected"
      ? `${violations.length} venue policy issue(s) require remediation before trading can resume.`
      : pair.pauseState.state === "paused"
        ? `Pair paused by ${pair.pauseState.changedBy}: ${pair.pauseState.reason}.`
        : `Operator ${pair.operatorId} governs ${pair.dealers.length} dealer perimeter(s) and ${access.participants.length} active participant grant(s).`;

  return {
    title: `${pair.mode} kernel health`,
    status,
    detail,
    summary: {
      pairId: pair.pairId,
      mode: pair.mode,
      operatorId: pair.operatorId,
      dealers: pair.dealers,
      paused: pair.pauseState.state === "paused",
      rulebookVersion: pair.rulebookRelease.version,
      activeParticipantCount: access.participants.length,
      ledgerFacts: projectFacts("on-ledger"),
      offLedgerFacts: projectFacts("off-ledger")
    },
    violations
  };
};

export const buildPairDashboardView = (input: {
  grants: readonly AccessGrant[];
  pair: PairInstance;
  records?: Parameters<typeof projectTradingActivity>[1];
  violations?: readonly string[];
}): PairDashboardView => ({
  pair: projectPairSummary(input.pair),
  access: projectParticipantAccess(input.pair.pairId, input.grants),
  activity: projectTradingActivity(input.pair.pairId, input.records ?? {}),
  health: projectVenueHealth(input.pair, input.grants, input.violations)
});
