import {
  createVenueApplication,
  type AuditEntry,
  type Clock,
  type IdGenerator,
  type LedgerEvent,
  type LedgerPort,
  type NotificationMessage,
  type ProjectionCollection,
  type ProjectionStore,
  type RiskAction,
  type RiskControlPort,
  type SettlementPort,
  type VenueApplicationDependencies
} from "@canton-dark/app-services";
import type {
  AccessGrant,
  DarkOrder,
  Execution,
  MatchProposal,
  PairInstance,
  Quote,
  RFQ,
  SettlementStatus,
  VenueConfigurationDraft
} from "@canton-dark/domain-core";

export type DeterministicClock = Clock & {
  advanceBy: (milliseconds: number) => void;
  set: (next: Date) => void;
};

export type SeededIdGenerator = IdGenerator & {
  seed: number;
};

export type InMemoryLedgerPort = LedgerPort & {
  snapshot: () => {
    accessGrants: AccessGrant[];
    darkOrders: DarkOrder[];
    events: LedgerEvent[];
    executions: Execution[];
    matchProposals: MatchProposal[];
    pairs: PairInstance[];
    quotes: Quote[];
    rfqs: RFQ[];
  };
};

export type InMemoryProjectionStore = ProjectionStore & {
  snapshot: () => Record<ProjectionCollection, Record<string, unknown>>;
};

export type InMemoryRiskControlPort = RiskControlPort & {
  decisions: () => { action: RiskAction; approved: boolean; pairId: string; reason?: string }[];
};

export type InMemorySettlementPort = SettlementPort & {
  submissions: () => Execution[];
};

export type InMemoryAuditLogPort = {
  entries: () => AuditEntry[];
  record: VenueApplicationDependencies["auditLog"]["record"];
};

export type InMemoryNotificationPort = {
  messages: () => NotificationMessage[];
  send: VenueApplicationDependencies["notifications"]["send"];
};

export type InMemoryReferencePricePort = VenueApplicationDependencies["referencePrices"] & {
  set: (pairId: string, instrumentId: string, price: number) => void;
};

export type MemoryVenueEnvironment = {
  auditLog: InMemoryAuditLogPort;
  application: ReturnType<typeof createVenueApplication>;
  clock: DeterministicClock;
  idGenerator: SeededIdGenerator;
  ledger: InMemoryLedgerPort;
  notifications: InMemoryNotificationPort;
  projections: InMemoryProjectionStore;
  referencePrices: InMemoryReferencePricePort;
  riskControl: InMemoryRiskControlPort;
  settlement: InMemorySettlementPort;
};

export type VenueRegistry = {
  get: () => VenueConfigurationDraft;
  replace: (nextDraft: VenueConfigurationDraft) => void;
};

const clone = <T>(value: T): T => structuredClone(value);

const keyForInstrument = (pairId: string, instrumentId: string): string =>
  `${pairId}:${instrumentId}`;

export const createInMemoryVenueRegistry = (
  initialDraft: VenueConfigurationDraft
): VenueRegistry => {
  let current = clone(initialDraft);

  return {
    get: () => clone(current),
    replace: (nextDraft) => {
      current = clone(nextDraft);
    }
  };
};

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
  const rfqs = new Map<string, RFQ>();
  const quotes = new Map<string, Quote>();
  const executions = new Map<string, Execution>();
  const darkOrders = new Map<string, DarkOrder>();
  const matchProposals = new Map<string, MatchProposal>();
  const events: LedgerEvent[] = [];

  return {
    async append(event) {
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
    },
    snapshot: () => ({
      pairs: clone([...pairs.values()]),
      accessGrants: clone([...accessGrants.values()].flat()),
      rfqs: clone([...rfqs.values()]),
      quotes: clone([...quotes.values()]),
      executions: clone([...executions.values()]),
      darkOrders: clone([...darkOrders.values()]),
      matchProposals: clone([...matchProposals.values()]),
      events: clone(events)
    })
  };
};

export const createInMemoryProjectionStore = (): InMemoryProjectionStore => {
  const projections = new Map<ProjectionCollection, Map<string, unknown>>([
    ["pair-summary", new Map()],
    ["health", new Map()],
    ["access", new Map()],
    ["activity", new Map()],
    ["dashboard", new Map()]
  ]);

  return {
    async get(collection: ProjectionCollection, key: string) {
      return clone(projections.get(collection)?.get(key) ?? null);
    },
    async put(collection, key, value) {
      const store = projections.get(collection);

      if (store === undefined) {
        throw new Error(`Unknown projection collection ${collection}.`);
      }

      store.set(key, clone(value));
    },
    snapshot: () =>
      Object.fromEntries(
        [...projections.entries()].map(([collection, store]) => [
          collection,
          Object.fromEntries([...store.entries()].map(([key, value]) => [key, clone(value)]))
        ])
      ) as Record<ProjectionCollection, Record<string, unknown>>
  };
};

export const createInMemoryRiskControlPort = (
  options: {
    blockedActions?: readonly RiskAction[];
    maxQuantity?: number;
  } = {}
): InMemoryRiskControlPort => {
  const decisions: { action: RiskAction; approved: boolean; pairId: string; reason?: string }[] =
    [];

  return {
    async evaluate(input) {
      const maxQuantity = options.maxQuantity ?? 1_000_000;
      const blocked = options.blockedActions?.includes(input.action) ?? false;
      const quantityExceeded =
        input.quantity !== undefined &&
        Number.isFinite(input.quantity) &&
        input.quantity > maxQuantity;
      const decision = blocked
        ? { approved: false, reason: `${input.action} is blocked in the in-memory adapter.` }
        : quantityExceeded
          ? {
              approved: false,
              reason: `Quantity ${input.quantity} exceeds the in-memory risk limit ${maxQuantity}.`
            }
          : { approved: true };

      decisions.push({
        action: input.action,
        approved: decision.approved,
        pairId: input.pair.pairId,
        ...(decision.reason !== undefined ? { reason: decision.reason } : {})
      });

      return decision;
    },
    decisions: () => clone(decisions)
  };
};

export const createInMemorySettlementPort = (
  defaultStatus: SettlementStatus = "affirmed"
): InMemorySettlementPort => {
  const submissions: Execution[] = [];

  return {
    async submit(execution) {
      submissions.push(clone(execution));

      return defaultStatus;
    },
    submissions: () => clone(submissions)
  };
};

export const createInMemoryAuditLogPort = (): InMemoryAuditLogPort => {
  const entries: AuditEntry[] = [];

  return {
    async record(entry) {
      entries.push(clone(entry));
    },
    entries: () => clone(entries)
  };
};

export const createInMemoryNotificationPort = (): InMemoryNotificationPort => {
  const messages: NotificationMessage[] = [];

  return {
    async send(message) {
      messages.push(clone(message));
    },
    messages: () => clone(messages)
  };
};

export const createInMemoryReferencePricePort = (
  initialPrices: Record<string, number> = {},
  fallbackPrice = 100
): InMemoryReferencePricePort => {
  const prices = new Map<string, number>(Object.entries(initialPrices));

  return {
    async get(pairId, instrumentId) {
      return prices.get(keyForInstrument(pairId, instrumentId)) ?? fallbackPrice;
    },
    set(pairId, instrumentId, price) {
      prices.set(keyForInstrument(pairId, instrumentId), price);
    }
  };
};

export const createMemoryVenueEnvironment = (
  options: {
    referencePrices?: Record<string, number>;
    riskBlockedActions?: readonly RiskAction[];
    seed?: number;
    settlementStatus?: SettlementStatus;
    startAt?: Date | string;
  } = {}
): MemoryVenueEnvironment => {
  const clock = createDeterministicClock(options.startAt);
  const idGenerator = createSeededIdGenerator(options.seed ?? 424242);
  const ledger = createInMemoryLedgerPort();
  const projections = createInMemoryProjectionStore();
  const riskControl = createInMemoryRiskControlPort({
    ...(options.riskBlockedActions !== undefined
      ? { blockedActions: options.riskBlockedActions }
      : {})
  });
  const settlement = createInMemorySettlementPort(options.settlementStatus);
  const auditLog = createInMemoryAuditLogPort();
  const notifications = createInMemoryNotificationPort();
  const referencePrices = createInMemoryReferencePricePort(options.referencePrices);

  return {
    clock,
    idGenerator,
    ledger,
    projections,
    riskControl,
    settlement,
    auditLog,
    notifications,
    referencePrices,
    application: createVenueApplication({
      clock,
      idGenerator,
      ledger,
      projections,
      riskControl,
      settlement,
      auditLog,
      notifications,
      referencePrices
    })
  };
};
