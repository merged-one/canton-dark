import {
  createVenueApplication,
  type AuditLogPort,
  type Clock,
  type IdGenerator,
  type LedgerPort
} from "@canton-dark/app-services";
import type {
  AccessGrant,
  AuditRecord,
  DealerInvitation,
  DealerQuote,
  ExecutionTicket,
  PairInstance,
  QuoteRevision,
  QuoteWithdrawal,
  RFQSession,
  SettlementInstruction
} from "@canton-dark/domain-core";

export type DeterministicClock = Clock & {
  advanceBy: (milliseconds: number) => void;
  set: (next: Date | string) => void;
};

export type SeededIdGenerator = IdGenerator & {
  seed: number;
};

export type InMemoryLedgerPort = LedgerPort & {
  snapshot: () => {
    accessGrants: AccessGrant[];
    executions: ExecutionTicket[];
    invitations: DealerInvitation[];
    pairs: PairInstance[];
    quoteRevisions: QuoteRevision[];
    quoteWithdrawals: QuoteWithdrawal[];
    quotes: DealerQuote[];
    rfqs: RFQSession[];
    settlements: SettlementInstruction[];
  };
};

export type InMemoryAuditLogPort = AuditLogPort & {
  entries: () => AuditRecord[];
};

export type MemoryVenueEnvironment = {
  application: ReturnType<typeof createVenueApplication>;
  auditLog: InMemoryAuditLogPort;
  clock: DeterministicClock;
  idGenerator: SeededIdGenerator;
  ledger: InMemoryLedgerPort;
};

const clone = <T>(value: T): T => structuredClone(value);

export const createDeterministicClock = (
  startAt: Date | string = "2026-04-02T00:00:00.000Z"
): DeterministicClock => {
  let current = new Date(startAt);

  return {
    now: () => new Date(current),
    advanceBy: (milliseconds) => {
      current = new Date(current.getTime() + milliseconds);
    },
    set: (next) => {
      current = new Date(next);
    }
  };
};

export const createSeededIdGenerator = (seed: number): SeededIdGenerator => {
  const counters = new Map<string, number>();
  const stableSeed = Math.abs(seed >>> 0)
    .toString(36)
    .padStart(6, "0");

  return {
    seed,
    nextId(namespace) {
      const next = (counters.get(namespace) ?? 0) + 1;

      counters.set(namespace, next);

      return `${namespace}-${stableSeed}-${next.toString().padStart(6, "0")}`;
    }
  };
};

export const createInMemoryLedgerPort = (): InMemoryLedgerPort => {
  const pairs = new Map<string, PairInstance>();
  const accessGrants = new Map<string, AccessGrant[]>();
  const rfqs = new Map<string, RFQSession>();
  const quotes = new Map<string, DealerQuote>();
  const invitations = new Map<string, DealerInvitation>();
  const quoteRevisions = new Map<string, QuoteRevision>();
  const quoteWithdrawals = new Map<string, QuoteWithdrawal>();
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
    async listInvitations(pairId) {
      return clone([...invitations.values()].filter((invitation) => invitation.pairId === pairId));
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
      accessGrants.set(grant.pairId, [...(accessGrants.get(grant.pairId) ?? []), clone(grant)]);
    },
    async saveExecutionTicket(execution) {
      executions.set(execution.executionId, clone(execution));
    },
    async saveInvitation(invitation) {
      invitations.set(invitation.invitationId, clone(invitation));
    },
    async savePair(pair) {
      pairs.set(pair.pairId, clone(pair));
    },
    async saveQuote(quote) {
      quotes.set(quote.quoteId, clone(quote));
    },
    async saveQuoteRevision(revision) {
      quoteRevisions.set(revision.revisionId, clone(revision));
    },
    async saveQuoteWithdrawal(withdrawal) {
      quoteWithdrawals.set(withdrawal.withdrawalId, clone(withdrawal));
    },
    async saveRfq(rfq) {
      rfqs.set(rfq.rfqId, clone(rfq));
    },
    async saveSettlementInstruction(instruction) {
      settlements.set(instruction.instructionId, clone(instruction));
    },
    snapshot: () => ({
      pairs: clone([...pairs.values()]),
      accessGrants: clone([...accessGrants.values()].flat()),
      rfqs: clone([...rfqs.values()]),
      quotes: clone([...quotes.values()]),
      invitations: clone([...invitations.values()]),
      quoteRevisions: clone([...quoteRevisions.values()]),
      quoteWithdrawals: clone([...quoteWithdrawals.values()]),
      executions: clone([...executions.values()]),
      settlements: clone([...settlements.values()])
    })
  };
};

export const createInMemoryAuditLogPort = (): InMemoryAuditLogPort => {
  const entries: AuditRecord[] = [];

  return {
    async list(pairId) {
      return clone(entries.filter((entry) => pairId === undefined || entry.pairId === pairId));
    },
    async record(entry) {
      entries.push(clone(entry));
    },
    entries: () => clone(entries)
  };
};

export const createMemoryVenueEnvironment = (
  options: {
    seed?: number;
    startAt?: Date | string;
  } = {}
): MemoryVenueEnvironment => {
  const clock = createDeterministicClock(options.startAt);
  const idGenerator = createSeededIdGenerator(options.seed ?? 424242);
  const ledger = createInMemoryLedgerPort();
  const auditLog = createInMemoryAuditLogPort();

  return {
    clock,
    idGenerator,
    ledger,
    auditLog,
    application: createVenueApplication({
      clock,
      idGenerator,
      ledger,
      auditLog
    })
  };
};
