import type { AuditLogPort, LedgerPort } from "@canton-dark/app-services";
import type {
  AccessGrant,
  AuditRecord,
  DealerQuote,
  ExecutionTicket,
  PairInstance,
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

const pairObservers = (pair: PairInstance): readonly string[] => [pair.operatorId, pair.dealerId];

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
  observers: [rfq.subscriberId, rfq.dealerId],
  payload: {
    pairId: rfq.pairId,
    dealerId: rfq.dealerId,
    subscriberId: rfq.subscriberId,
    instrumentId: rfq.instrumentId,
    side: rfq.side,
    quantity: rfq.quantity,
    status: rfq.status,
    acceptedQuoteId: rfq.acceptedQuoteId ?? null
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
    expiresAt: quote.expiresAt
  }
});

export const mapExecutionTicketToCantonCommand = (execution: ExecutionTicket): CantonCommand => ({
  action: "upsert_contract",
  template: "ExecutionTicket",
  key: execution.executionId,
  submitter: execution.subscriberId,
  observers: [execution.subscriberId, execution.dealerId],
  payload: {
    pairId: execution.pairId,
    rfqId: execution.rfqId,
    quoteId: execution.quoteId,
    dealerId: execution.dealerId,
    subscriberId: execution.subscriberId,
    instrumentId: execution.instrumentId,
    side: execution.side,
    quantity: execution.quantity,
    price: execution.price,
    acceptedAt: execution.acceptedAt
  }
});

export const mapSettlementInstructionToCantonCommand = (
  instruction: SettlementInstruction
): CantonCommand => ({
  action: "upsert_contract",
  template: "SettlementInstruction",
  key: instruction.instructionId,
  submitter: "settlement-bridge",
  observers: [],
  payload: {
    pairId: instruction.pairId,
    executionId: instruction.executionId,
    status: instruction.status,
    createdAt: instruction.createdAt,
    updatedAt: instruction.updatedAt
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
  const executions = new Map<string, ExecutionTicket>();
  const settlements = new Map<string, SettlementInstruction>();

  return {
    async getExecutionTicket(executionId) {
      return clone(executions.get(executionId) ?? null);
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
    async getSettlementInstruction(instructionId) {
      return clone(settlements.get(instructionId) ?? null);
    },
    async listAccessGrants(pairId) {
      return clone(accessGrants.get(pairId) ?? []);
    },
    async listExecutionTickets(pairId) {
      return clone([...executions.values()].filter((execution) => execution.pairId === pairId));
    },
    async listPairs() {
      return clone([...pairs.values()]);
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
    async saveExecutionTicket(execution) {
      await transport.submit(mapExecutionTicketToCantonCommand(execution));
      executions.set(execution.executionId, clone(execution));
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
