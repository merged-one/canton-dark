import type {
  LedgerEvent,
  LedgerPort,
  NotificationPort,
  ReferencePricePort,
  SettlementPort
} from "@canton-dark/app-services";
import type {
  AccessGrant,
  DarkOrder,
  Execution,
  MatchProposal,
  PairInstance,
  Quote,
  RFQ,
  SettlementStatus
} from "@canton-dark/domain-core";

export type CantonSubmissionPlan = {
  informees: readonly string[];
  observers: readonly string[];
  pair: PairInstance;
};

export type CantonCommand = {
  key: string;
  observers: readonly string[];
  payload: Record<string, unknown>;
  resource: string;
  submitter: string;
};

export type CantonQuery = {
  key: string;
  resource: string;
};

export type CantonQueryResult = boolean | number | Record<string, unknown> | string | null;

export type CantonTransport = {
  query: (request: CantonQuery) => Promise<CantonQueryResult>;
  submit: (command: CantonCommand) => Promise<{ accepted: boolean; submissionId: string }>;
};

export type StubCantonTransport = CantonTransport & {
  prime: (resource: string, key: string, value: Exclude<CantonQueryResult, null>) => void;
  submissions: () => CantonCommand[];
};

const clone = <T>(value: T): T => structuredClone(value);

const pairParties = (pair: PairInstance): string[] =>
  [...new Set([pair.operatorId, ...pair.dealers])].sort((left, right) => left.localeCompare(right));

const mapPairPayload = (pair: PairInstance) => ({
  pairId: pair.pairId,
  mode: pair.mode,
  operatorId: pair.operatorId,
  dealers: pair.dealers,
  pauseState: pair.pauseState,
  rulebookVersion: pair.rulebookRelease.version,
  regulatoryAttestation: pair.regulatoryAttestation,
  operatorApproval: pair.operatorApproval
});

export const mapPairToCantonCommand = (pair: PairInstance): CantonCommand => ({
  resource: "PairInstance",
  key: pair.pairId,
  submitter: pair.operatorId,
  observers: pairParties(pair),
  payload: mapPairPayload(pair)
});

export const mapAccessGrantToCantonCommand = (grant: AccessGrant): CantonCommand => ({
  resource: "AccessGrant",
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

export const mapRfqToCantonCommand = (rfq: RFQ): CantonCommand => ({
  resource: "RFQ",
  key: rfq.rfqId,
  submitter: rfq.requesterId,
  observers: rfq.directedDealerIds,
  payload: {
    pairId: rfq.pairId,
    requesterId: rfq.requesterId,
    directedDealerIds: rfq.directedDealerIds,
    instrumentId: rfq.instrumentId,
    side: rfq.side,
    quantity: rfq.quantity,
    expiresAt: rfq.expiresAt
  }
});

export const mapQuoteToCantonCommand = (quote: Quote): CantonCommand => ({
  resource: "Quote",
  key: quote.quoteId,
  submitter: quote.dealerId,
  observers: [quote.dealerId],
  payload: {
    pairId: quote.pairId,
    rfqId: quote.rfqId,
    price: quote.price,
    quantity: quote.quantity,
    expiresAt: quote.expiresAt
  }
});

export const mapExecutionToCantonCommand = (execution: Execution): CantonCommand => ({
  resource: "Execution",
  key: execution.executionId,
  submitter: execution.buyerId,
  observers: [execution.buyerId, execution.sellerId],
  payload: {
    pairId: execution.pairId,
    price: execution.price,
    quantity: execution.quantity,
    source: execution.source,
    settlementStatus: execution.settlementStatus,
    quoteId: execution.quoteId ?? null,
    matchProposalId: execution.matchProposalId ?? null
  }
});

export const mapDarkOrderToCantonCommand = (order: DarkOrder): CantonCommand => ({
  resource: "DarkOrder",
  key: order.orderId,
  submitter: order.participantId,
  observers: [order.participantId],
  payload: {
    pairId: order.pairId,
    side: order.side,
    quantity: order.quantity,
    limitPrice: order.limitPrice,
    status: order.status
  }
});

export const mapMatchProposalToCantonCommand = (proposal: MatchProposal): CantonCommand => ({
  resource: "MatchProposal",
  key: proposal.proposalId,
  submitter: proposal.pairId,
  observers: [],
  payload: {
    pairId: proposal.pairId,
    buyOrderId: proposal.buyOrderId,
    sellOrderId: proposal.sellOrderId,
    proposedPrice: proposal.proposedPrice,
    proposedQuantity: proposal.proposedQuantity,
    referencePrice: proposal.referencePrice
  }
});

export const mapLedgerEventToCantonCommand = (event: LedgerEvent): CantonCommand => {
  switch (event.type) {
    case "pair.registered":
    case "pair.pause-state.updated":
      return mapPairToCantonCommand(event.payload as PairInstance);
    case "access.granted":
      return mapAccessGrantToCantonCommand(event.payload as AccessGrant);
    case "rfq.submitted":
      return mapRfqToCantonCommand(event.payload as RFQ);
    case "quote.recorded":
      return mapQuoteToCantonCommand(event.payload as Quote);
    case "execution.recorded":
      return mapExecutionToCantonCommand(event.payload as Execution);
    case "dark-order.submitted":
      return mapDarkOrderToCantonCommand(event.payload as DarkOrder);
    case "match.proposed":
      return mapMatchProposalToCantonCommand(event.payload as MatchProposal);
  }
};

export const createStubCantonTransport = (): StubCantonTransport => {
  const submissions: CantonCommand[] = [];
  const cache = new Map<string, Exclude<CantonQueryResult, null>>();

  return {
    async query(request) {
      return clone(cache.get(`${request.resource}:${request.key}`) ?? null);
    },
    async submit(command) {
      submissions.push(clone(command));
      cache.set(`${command.resource}:${command.key}`, clone(command.payload));

      return {
        accepted: true,
        submissionId: `${command.resource}-${command.key}`
      };
    },
    prime(resource, key, value) {
      cache.set(`${resource}:${key}`, clone(value));
    },
    submissions: () => clone(submissions)
  };
};

export const createCantonLedgerPort = (transport: CantonTransport): LedgerPort => {
  const pairs = new Map<string, PairInstance>();
  const accessGrants = new Map<string, AccessGrant[]>();
  const rfqs = new Map<string, RFQ>();
  const quotes = new Map<string, Quote>();
  const executions = new Map<string, Execution>();
  const darkOrders = new Map<string, DarkOrder>();
  const matchProposals = new Map<string, MatchProposal>();
  const events: LedgerEvent[] = [];

  return {
    async append(event) {
      await transport.submit(mapLedgerEventToCantonCommand(event));
      events.push(clone(event));
    },
    async getDarkOrder(orderId) {
      return clone(darkOrders.get(orderId) ?? null);
    },
    async getPair(pairId) {
      return clone(pairs.get(pairId) ?? null);
    },
    async getQuote(quoteId) {
      return clone(quotes.get(quoteId) ?? null);
    },
    async getRfq(rfqId) {
      return clone(rfqs.get(rfqId) ?? null);
    },
    async listAccessGrants(pairId) {
      return clone(accessGrants.get(pairId) ?? []);
    },
    async listDarkOrders(pairId) {
      return clone([...darkOrders.values()].filter((order) => order.pairId === pairId));
    },
    async listEvents(pairId) {
      return clone(events.filter((event) => pairId === undefined || event.pairId === pairId));
    },
    async listExecutions(pairId) {
      return clone([...executions.values()].filter((execution) => execution.pairId === pairId));
    },
    async listMatchProposals(pairId) {
      return clone([...matchProposals.values()].filter((proposal) => proposal.pairId === pairId));
    },
    async listQuotes(pairId) {
      return clone([...quotes.values()].filter((quote) => quote.pairId === pairId));
    },
    async listRfqs(pairId) {
      return clone([...rfqs.values()].filter((rfq) => rfq.pairId === pairId));
    },
    async saveAccessGrant(grant) {
      accessGrants.set(grant.pairId, [...(accessGrants.get(grant.pairId) ?? []), clone(grant)]);
    },
    async saveDarkOrder(order) {
      darkOrders.set(order.orderId, clone(order));
    },
    async saveExecution(execution) {
      executions.set(execution.executionId, clone(execution));
    },
    async saveMatchProposal(proposal) {
      matchProposals.set(proposal.proposalId, clone(proposal));
    },
    async savePair(pair) {
      pairs.set(pair.pairId, clone(pair));
    },
    async saveQuote(quote) {
      quotes.set(quote.quoteId, clone(quote));
    },
    async saveRfq(rfq) {
      rfqs.set(rfq.rfqId, clone(rfq));
    }
  };
};

export const createCantonNotificationPort = (transport: CantonTransport): NotificationPort => ({
  async send(message) {
    await transport.submit({
      resource: "Notification",
      key: `${message.kind}:${message.pairId}`,
      submitter: "notification-bridge",
      observers: message.recipientIds,
      payload: {
        pairId: message.pairId,
        subject: message.subject,
        detail: message.detail,
        recipientIds: message.recipientIds,
        at: message.at
      }
    });
  }
});

export const createCantonSettlementPort = (
  transport: CantonTransport,
  defaultStatus: SettlementStatus = "pending"
): SettlementPort => ({
  async submit(execution) {
    await transport.submit(mapExecutionToCantonCommand(execution));

    return defaultStatus;
  }
});

export const createCantonReferencePricePort = (
  transport: CantonTransport,
  fallbackPrice = 100
): ReferencePricePort => ({
  async get(pairId, instrumentId) {
    const result = await transport.query({
      resource: "ReferencePrice",
      key: `${pairId}:${instrumentId}`
    });

    return typeof result === "number" ? result : fallbackPrice;
  }
});
