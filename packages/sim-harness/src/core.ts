import {
  createMemoryVenueEnvironment,
  type InMemoryLedgerPort,
  type MemoryVenueEnvironment
} from "@canton-dark/adapters-memory";
import type {
  Entitlement,
  InviteRevisionPolicy,
  OperatorOversightRole,
  PairMode,
  ParticipantRole,
  RFQSide,
  SettlementStatus
} from "@canton-dark/domain-core";
import { createReplayMetadata } from "@canton-dark/testkit";
import {
  createCorrelationId,
  createInMemoryTelemetrySink,
  createStructuredLogger,
  type StructuredLog
} from "@canton-dark/telemetry";

export type SeededRandom = {
  next: () => number;
  nextInt: (maxExclusive: number) => number;
  pick: <T>(items: readonly T[]) => T;
};

export type Persona = {
  displayName: string;
  participantId: string;
  role: ParticipantRole;
};

export type CreatePairScenarioCommand = {
  alias: string;
  dealerId?: string;
  dealerIds?: readonly string[];
  inviteRevisionPolicy?: InviteRevisionPolicy;
  jurisdiction: string;
  kind: "createPair" | "create_pair";
  mode?: PairMode;
  operatorId: string;
  operatorOversightRole?: OperatorOversightRole;
  pairId?: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessScenarioCommand = {
  entitlements?: readonly Entitlement[];
  kind: "grantAccess" | "grant_access";
  note?: string;
  pairAlias: string;
  role: ParticipantRole;
  subjectId: string;
};

export type PausePairScenarioCommand = {
  kind: "pausePair" | "pause_pair";
  pairAlias: string;
  reason: string;
};

export type UnpausePairScenarioCommand = {
  kind: "unpausePair" | "unpause_pair";
  pairAlias: string;
};

export type OpenRfqScenarioCommand = {
  alias: string;
  instrumentId: string;
  invitedDealerIds?: readonly string[];
  kind: "openRFQ" | "open_rfq";
  pairAlias: string;
  quantity: number;
  responseWindowClosesAt?: string;
  side: RFQSide;
};

export type SubmitQuoteScenarioCommand = {
  alias: string;
  expiresAt: string;
  kind: "submitQuote" | "submit_quote";
  pairAlias: string;
  price: number;
  quantity: number;
  rfqAlias: string;
};

export type ReviseQuoteScenarioCommand = {
  alias: string;
  expiresAt: string;
  kind: "reviseQuote" | "revise_quote";
  pairAlias: string;
  price: number;
  quantity: number;
  quoteAlias: string;
};

export type WithdrawQuoteScenarioCommand = {
  kind: "withdrawQuote" | "withdraw_quote";
  pairAlias: string;
  quoteAlias: string;
  reason?: string;
};

export type AcceptQuoteScenarioCommand = {
  executionAlias: string;
  kind: "acceptQuote" | "accept_quote";
  pairAlias: string;
  quoteAlias: string;
  rfqAlias?: string;
  settlementAlias: string;
};

export type RejectQuotesScenarioCommand = {
  kind: "rejectQuotes" | "reject_quotes";
  pairAlias: string;
  reason?: string;
  rfqAlias: string;
};

export type MarkSettlementProgressionScenarioCommand = {
  kind: "markSettlementProgression" | "mark_settlement_progression";
  pairAlias: string;
  settlementAlias: string;
  status: SettlementStatus;
};

export type SubmitDarkOrderScenarioCommand = {
  alias: string;
  clientOrderId: string;
  expiresAt?: string;
  instrumentId: string;
  kind: "submitDarkOrder" | "submit_dark_order";
  limitPrice: number;
  pairAlias: string;
  quantity: number;
  side: RFQSide;
};

export type CancelDarkOrderScenarioCommand = {
  kind: "cancelDarkOrder" | "cancel_dark_order";
  orderAlias: string;
  pairAlias: string;
};

export type GenerateMatchProposalScenarioCommand = {
  buyLockAlias: string;
  buyOrderAlias?: string;
  expiresAt?: string;
  kind: "generateMatchProposal" | "generate_match_proposal";
  pairAlias: string;
  proposalAlias: string;
  sellLockAlias: string;
  sellOrderAlias?: string;
};

export type AcceptMatchScenarioCommand = {
  kind: "acceptMatch" | "accept_match";
  pairAlias: string;
  proposalAlias: string;
};

export type RejectMatchScenarioCommand = {
  kind: "rejectMatch" | "reject_match";
  pairAlias: string;
  proposalAlias: string;
  reason?: string;
};

export type ExpireLocksScenarioCommand = {
  kind: "expireLocks" | "expire_locks";
  pairAlias: string;
  proposalAlias: string;
};

export type ExecuteMatchScenarioCommand = {
  executionAlias: string;
  kind: "executeMatch" | "execute_match";
  pairAlias: string;
  proposalAlias: string;
  settlementAlias: string;
};

export type ScenarioCommand =
  | AcceptMatchScenarioCommand
  | AcceptQuoteScenarioCommand
  | CancelDarkOrderScenarioCommand
  | CreatePairScenarioCommand
  | ExecuteMatchScenarioCommand
  | ExpireLocksScenarioCommand
  | GenerateMatchProposalScenarioCommand
  | GrantAccessScenarioCommand
  | MarkSettlementProgressionScenarioCommand
  | OpenRfqScenarioCommand
  | PausePairScenarioCommand
  | RejectMatchScenarioCommand
  | RejectQuotesScenarioCommand
  | ReviseQuoteScenarioCommand
  | SubmitDarkOrderScenarioCommand
  | SubmitQuoteScenarioCommand
  | UnpausePairScenarioCommand
  | WithdrawQuoteScenarioCommand;

export type ScenarioStep = {
  actor: Persona;
  atMs: number;
  command: ScenarioCommand;
  expectErrorCode?: string;
  note?: string;
};

export type ScenarioOutputType =
  | "execution"
  | "lock"
  | "order"
  | "pair"
  | "proposal"
  | "quote"
  | "rfq"
  | "settlement";

export type ScenarioOutput = {
  alias: string;
  id: string;
  type: ScenarioOutputType;
};

export type ScenarioReplayFile = {
  format: "canton-dark-sim.v2";
  outputs: readonly ScenarioOutput[];
  seed: number;
  startedAt: string;
  steps: readonly ScenarioStep[];
};

export type ScenarioEvent = {
  actorId: string;
  at: string;
  commandKind: string;
  correlationId: string;
  errorCode?: string;
  errorMessage?: string;
  note?: string;
  outputs: readonly ScenarioOutput[];
  status: "expected_error" | "success";
};

export type ScenarioSnapshot = ReturnType<InMemoryLedgerPort["snapshot"]>;

export type ScenarioResult = {
  audits: Awaited<ReturnType<MemoryVenueEnvironment["auditLog"]["list"]>>;
  events: readonly ScenarioEvent[];
  logs: readonly StructuredLog[];
  replay: ScenarioReplayFile;
  replayCommand: string;
  snapshot: ScenarioSnapshot;
};

export type ScenarioRun = {
  environment: MemoryVenueEnvironment;
  result: ScenarioResult;
};

export type DeterministicScheduler = {
  runAll: () => Promise<readonly string[]>;
  schedule: (delayMs: number, label: string, task: () => Promise<void> | void) => void;
};

const mulberry32 = (seed: number): SeededRandom["next"] => {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);

    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
};

export const createSeededRandom = (seed: number): SeededRandom => {
  const next = mulberry32(seed);

  return {
    next,
    nextInt(maxExclusive) {
      return Math.floor(next() * maxExclusive);
    },
    pick(items) {
      return items[this.nextInt(items.length)] as (typeof items)[number];
    }
  };
};

export const createDeterministicScheduler = (
  clock: Pick<MemoryVenueEnvironment["clock"], "advanceBy" | "now">
): DeterministicScheduler => {
  const tasks: { atMs: number; label: string; order: number; task: () => Promise<void> | void }[] =
    [];

  return {
    schedule(delayMs, label, task) {
      tasks.push({
        atMs: delayMs,
        label,
        task,
        order: tasks.length
      });
    },
    async runAll() {
      const labels: string[] = [];
      let elapsed = 0;

      for (const scheduled of [...tasks].sort((left, right) =>
        left.atMs === right.atMs ? left.order - right.order : left.atMs - right.atMs
      )) {
        clock.advanceBy(scheduled.atMs - elapsed);
        elapsed = scheduled.atMs;
        await scheduled.task();
        labels.push(`${scheduled.label}@${clock.now().toISOString()}`);
      }

      return labels;
    }
  };
};

const createPersona = (
  role: ParticipantRole,
  participantId: string,
  displayName?: string
): Persona => ({
  role,
  participantId,
  displayName: displayName ?? participantId
});

export const persona = {
  operator: (participantId: string, displayName?: string) =>
    createPersona("operator", participantId, displayName),
  subscriber: (participantId: string, displayName?: string) =>
    createPersona("subscriber", participantId, displayName),
  dealer: (participantId: string, displayName?: string) =>
    createPersona("dealer", participantId, displayName),
  settlementDelegate: (participantId: string, displayName?: string) =>
    createPersona("settlement_delegate", participantId, displayName),
  auditor: (participantId: string, displayName?: string) =>
    createPersona("auditor", participantId, displayName)
};

export const createScenarioRecorder = (seed: number, startedAt: string) => {
  const steps: ScenarioStep[] = [];
  const outputs: ScenarioOutput[] = [];

  return {
    recordStep(step: ScenarioStep) {
      steps.push(structuredClone(step));
    },
    recordOutput(output: ScenarioOutput) {
      outputs.push(structuredClone(output));
    },
    toReplayFile(): ScenarioReplayFile {
      return {
        format: "canton-dark-sim.v2",
        seed,
        startedAt,
        steps: structuredClone(steps),
        outputs: structuredClone(outputs)
      };
    }
  };
};

export const serializeReplayFile = (replay: ScenarioReplayFile): string =>
  JSON.stringify(replay, null, 2);

export const parseReplayFile = (value: string): ScenarioReplayFile =>
  JSON.parse(value) as ScenarioReplayFile;

const resolveAlias = (aliases: Map<string, string>, aliasOrId: string): string =>
  aliases.get(aliasOrId) ?? aliasOrId;

const isErrorWithCode = (error: unknown): error is { code: string } =>
  error !== null &&
  typeof error === "object" &&
  "code" in error &&
  typeof (error as { code?: unknown }).code === "string";

const recordOutputs = (
  aliases: Map<string, string>,
  recorder: ReturnType<typeof createScenarioRecorder>,
  outputs: readonly ScenarioOutput[]
): readonly ScenarioOutput[] => {
  for (const output of outputs) {
    aliases.set(output.alias, output.id);
    recorder.recordOutput(output);
  }

  return outputs;
};

const getQuoteId = async (
  environment: MemoryVenueEnvironment,
  aliases: Map<string, string>,
  aliasOrId: string
): Promise<{ quoteId: string; rfqId: string }> => {
  const quoteId = resolveAlias(aliases, aliasOrId);
  const quote = await environment.ledger.getQuote(quoteId);

  if (quote === null) {
    throw new Error(`Quote ${quoteId} was not found.`);
  }

  return {
    quoteId,
    rfqId: quote.rfqId
  };
};

const executeScenarioCommand = async (
  environment: MemoryVenueEnvironment,
  aliases: Map<string, string>,
  step: ScenarioStep
): Promise<readonly ScenarioOutput[]> => {
  switch (step.command.kind) {
    case "createPair":
    case "create_pair": {
      const pair = await environment.application.createPair({
        actorId: step.actor.participantId,
        operatorId: step.command.operatorId,
        jurisdiction: step.command.jurisdiction,
        ...(step.command.mode !== undefined ? { mode: step.command.mode } : {}),
        ...(step.command.dealerId !== undefined ? { dealerId: step.command.dealerId } : {}),
        ...(step.command.dealerIds !== undefined ? { dealerIds: step.command.dealerIds } : {}),
        ...(step.command.operatorOversightRole !== undefined
          ? { operatorOversightRole: step.command.operatorOversightRole }
          : {}),
        ...(step.command.inviteRevisionPolicy !== undefined
          ? { inviteRevisionPolicy: step.command.inviteRevisionPolicy }
          : {}),
        ...(step.command.pairId !== undefined ? { pairId: step.command.pairId } : {}),
        rulebookVersion: step.command.rulebookVersion,
        rulebookSummary: step.command.rulebookSummary
      });

      return [
        {
          alias: step.command.alias,
          type: "pair",
          id: pair.pairId
        }
      ];
    }
    case "grantAccess":
    case "grant_access": {
      await environment.application.grantAccess({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        subjectId: step.command.subjectId,
        role: step.command.role,
        ...(step.command.entitlements !== undefined
          ? { entitlements: step.command.entitlements }
          : {}),
        ...(step.command.note !== undefined ? { note: step.command.note } : {})
      });

      return [];
    }
    case "pausePair":
    case "pause_pair": {
      await environment.application.pausePair({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        state: "paused",
        reason: step.command.reason
      });

      return [];
    }
    case "unpausePair":
    case "unpause_pair": {
      await environment.application.pausePair({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        state: "active"
      });

      return [];
    }
    case "openRFQ":
    case "open_rfq": {
      const pairId = resolveAlias(aliases, step.command.pairAlias);
      const rfq = await environment.application.openRfq({
        actorId: step.actor.participantId,
        pairId,
        instrumentId: step.command.instrumentId,
        side: step.command.side,
        quantity: step.command.quantity,
        ...(step.command.responseWindowClosesAt !== undefined
          ? { responseWindowClosesAt: step.command.responseWindowClosesAt }
          : {})
      });

      if (step.command.invitedDealerIds !== undefined && step.command.invitedDealerIds.length > 0) {
        await environment.application.inviteDealers({
          actorId: step.actor.participantId,
          pairId,
          rfqId: rfq.rfqId,
          dealerIds: step.command.invitedDealerIds
        });
      }

      return [
        {
          alias: step.command.alias,
          type: "rfq",
          id: rfq.rfqId
        }
      ];
    }
    case "submitQuote":
    case "submit_quote": {
      const quote = await environment.application.submitQuote({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        rfqId: resolveAlias(aliases, step.command.rfqAlias),
        price: step.command.price,
        quantity: step.command.quantity,
        expiresAt: step.command.expiresAt
      });

      return [
        {
          alias: step.command.alias,
          type: "quote",
          id: quote.quote.quoteId
        }
      ];
    }
    case "reviseQuote":
    case "revise_quote": {
      const quote = await getQuoteId(environment, aliases, step.command.quoteAlias);
      const revised = await environment.application.reviseQuote({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        rfqId: quote.rfqId,
        quoteId: quote.quoteId,
        price: step.command.price,
        quantity: step.command.quantity,
        expiresAt: step.command.expiresAt
      });

      return [
        {
          alias: step.command.alias,
          type: "quote",
          id: revised.nextQuote.quoteId
        }
      ];
    }
    case "withdrawQuote":
    case "withdraw_quote": {
      const quote = await getQuoteId(environment, aliases, step.command.quoteAlias);

      await environment.application.withdrawQuote({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        rfqId: quote.rfqId,
        quoteId: quote.quoteId,
        ...(step.command.reason !== undefined ? { reason: step.command.reason } : {})
      });

      return [];
    }
    case "acceptQuote":
    case "accept_quote": {
      const quote = await getQuoteId(environment, aliases, step.command.quoteAlias);
      const accepted = await environment.application.acceptQuote({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        rfqId: quote.rfqId,
        quoteId: quote.quoteId
      });

      return [
        {
          alias: step.command.executionAlias,
          type: "execution",
          id: accepted.executionTicket.executionId
        },
        {
          alias: step.command.settlementAlias,
          type: "settlement",
          id: accepted.settlementInstruction.instructionId
        }
      ];
    }
    case "rejectQuotes":
    case "reject_quotes": {
      await environment.application.rejectAllQuotes({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        rfqId: resolveAlias(aliases, step.command.rfqAlias),
        ...(step.command.reason !== undefined ? { reason: step.command.reason } : {})
      });

      return [];
    }
    case "markSettlementProgression":
    case "mark_settlement_progression": {
      await environment.application.markSettlementProgression({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        instructionId: resolveAlias(aliases, step.command.settlementAlias),
        status: step.command.status
      });

      return [];
    }
    case "submitDarkOrder":
    case "submit_dark_order": {
      const order = await environment.application.submitDarkOrder({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        clientOrderId: step.command.clientOrderId,
        instrumentId: step.command.instrumentId,
        side: step.command.side,
        quantity: step.command.quantity,
        limitPrice: step.command.limitPrice,
        ...(step.command.expiresAt !== undefined ? { expiresAt: step.command.expiresAt } : {})
      });

      return [
        {
          alias: step.command.alias,
          type: "order",
          id: order.orderId
        }
      ];
    }
    case "cancelDarkOrder":
    case "cancel_dark_order": {
      await environment.application.cancelDarkOrder({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        orderId: resolveAlias(aliases, step.command.orderAlias)
      });

      return [];
    }
    case "generateMatchProposal":
    case "generate_match_proposal": {
      const proposal = await environment.application.generateMatchProposal({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        ...(step.command.buyOrderAlias !== undefined
          ? { buyOrderId: resolveAlias(aliases, step.command.buyOrderAlias) }
          : {}),
        ...(step.command.sellOrderAlias !== undefined
          ? { sellOrderId: resolveAlias(aliases, step.command.sellOrderAlias) }
          : {}),
        ...(step.command.expiresAt !== undefined ? { expiresAt: step.command.expiresAt } : {})
      });

      return [
        {
          alias: step.command.proposalAlias,
          type: "proposal",
          id: proposal.proposal.proposalId
        },
        {
          alias: step.command.buyLockAlias,
          type: "lock",
          id: proposal.buyLock.lockId
        },
        {
          alias: step.command.sellLockAlias,
          type: "lock",
          id: proposal.sellLock.lockId
        }
      ];
    }
    case "acceptMatch":
    case "accept_match": {
      await environment.application.acceptMatch({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        proposalId: resolveAlias(aliases, step.command.proposalAlias)
      });

      return [];
    }
    case "rejectMatch":
    case "reject_match": {
      await environment.application.rejectMatch({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        proposalId: resolveAlias(aliases, step.command.proposalAlias),
        ...(step.command.reason !== undefined ? { reason: step.command.reason } : {})
      });

      return [];
    }
    case "expireLocks":
    case "expire_locks": {
      await environment.application.releaseExpiredLock({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        proposalId: resolveAlias(aliases, step.command.proposalAlias)
      });

      return [];
    }
    case "executeMatch":
    case "execute_match": {
      const executed = await environment.application.executeSettlement({
        actorId: step.actor.participantId,
        pairId: resolveAlias(aliases, step.command.pairAlias),
        proposalId: resolveAlias(aliases, step.command.proposalAlias)
      });

      return [
        {
          alias: step.command.executionAlias,
          type: "execution",
          id: executed.executionTicket.executionId
        },
        {
          alias: step.command.settlementAlias,
          type: "settlement",
          id: executed.settlementInstruction.instructionId
        }
      ];
    }
  }
};

const executeScenario = async (
  environment: MemoryVenueEnvironment,
  input: {
    seed: number;
    steps: readonly ScenarioStep[];
  }
): Promise<ScenarioResult> => {
  const scheduler = createDeterministicScheduler(environment.clock);
  const recorder = createScenarioRecorder(input.seed, environment.clock.now().toISOString());
  const aliases = new Map<string, string>();
  const events: ScenarioEvent[] = [];
  const logSink = createInMemoryTelemetrySink();

  for (const [index, step] of input.steps.entries()) {
    scheduler.schedule(step.atMs, step.command.kind, async () => {
      const correlationId = createCorrelationId("sim", index + 1);
      const logger = createStructuredLogger({
        clock: environment.clock,
        correlationId,
        scope: "simulation",
        sink: logSink
      });
      const startedAt = environment.clock.now().toISOString();

      recorder.recordStep(step);
      await logger.log("info", "scenario.step.started", {
        actorId: step.actor.participantId,
        atMs: step.atMs,
        commandKind: step.command.kind
      });

      try {
        const outputs = recordOutputs(
          aliases,
          recorder,
          await executeScenarioCommand(environment, aliases, step)
        );

        if (step.expectErrorCode !== undefined) {
          throw new Error(
            `Expected ${step.expectErrorCode} from ${step.command.kind} but the step succeeded.`
          );
        }

        events.push({
          actorId: step.actor.participantId,
          at: startedAt,
          commandKind: step.command.kind,
          correlationId,
          outputs,
          status: "success",
          ...(step.note !== undefined ? { note: step.note } : {})
        });
        await logger.log("info", "scenario.step.succeeded", {
          actorId: step.actor.participantId,
          commandKind: step.command.kind,
          outputCount: outputs.length
        });
      } catch (error) {
        const errorCode = isErrorWithCode(error) ? error.code : undefined;

        if (step.expectErrorCode !== undefined && errorCode === step.expectErrorCode) {
          events.push({
            actorId: step.actor.participantId,
            at: startedAt,
            commandKind: step.command.kind,
            correlationId,
            errorCode,
            errorMessage: error instanceof Error ? error.message : String(error),
            outputs: [],
            status: "expected_error",
            ...(step.note !== undefined ? { note: step.note } : {})
          });
          await logger.log("warn", "scenario.step.expected_error", {
            actorId: step.actor.participantId,
            commandKind: step.command.kind,
            errorCode
          });
          return;
        }

        await logger.log("error", "scenario.step.failed", {
          actorId: step.actor.participantId,
          commandKind: step.command.kind,
          errorCode: errorCode ?? "UNEXPECTED"
        });
        throw error;
      }
    });
  }

  await scheduler.runAll();

  return {
    replay: recorder.toReplayFile(),
    replayCommand: createReplayMetadata(input.seed).command,
    snapshot: environment.ledger.snapshot(),
    audits: await environment.auditLog.list(),
    events,
    logs: logSink.entries()
  };
};

export const runScenarioWithEnvironment = async (input: {
  environment?: MemoryVenueEnvironment;
  seed: number;
  startAt?: Date | string;
  steps: readonly ScenarioStep[];
}): Promise<ScenarioRun> => {
  const environment =
    input.environment ??
    createMemoryVenueEnvironment({
      seed: input.seed,
      ...(input.startAt !== undefined ? { startAt: input.startAt } : {})
    });

  return {
    environment,
    result: await executeScenario(environment, {
      seed: input.seed,
      steps: input.steps
    })
  };
};

export const runScenario = async (input: {
  seed: number;
  startAt?: Date | string;
  steps: readonly ScenarioStep[];
}): Promise<ScenarioResult> =>
  (
    await runScenarioWithEnvironment({
      seed: input.seed,
      ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
      steps: input.steps
    })
  ).result;

export const replayScenario = async (replay: ScenarioReplayFile): Promise<ScenarioResult> =>
  runScenario({
    seed: replay.seed,
    startAt: replay.startedAt,
    steps: replay.steps
  });
