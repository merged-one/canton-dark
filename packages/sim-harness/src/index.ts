import {
  createMemoryVenueEnvironment,
  type DeterministicClock
} from "@canton-dark/adapters-memory";
import type { PairMode, ParticipantRole, RFQ } from "@canton-dark/domain-core";
import { createReplayMetadata } from "@canton-dark/testkit";

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

export type RegisterPairScenarioCommand = {
  alias: string;
  dealers: readonly string[];
  jurisdiction: string;
  kind: "register_pair";
  mode: PairMode;
  operatorId: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessScenarioCommand = {
  kind: "grant_access";
  pairAlias: string;
  role: ParticipantRole;
  subjectId: string;
};

export type SubmitRfqScenarioCommand = {
  alias: string;
  directedDealerIds: readonly string[];
  expiresAt: string;
  instrumentId: string;
  kind: "submit_rfq";
  pairAlias: string;
  quantity: number;
  side: RFQ["side"];
};

export type RecordQuoteScenarioCommand = {
  alias: string;
  expiresAt: string;
  kind: "record_quote";
  pairAlias: string;
  price: number;
  quantity: number;
  rfqAlias: string;
};

export type ExecuteQuoteScenarioCommand = {
  alias: string;
  kind: "execute_quote";
  pairAlias: string;
  quoteAlias: string;
  rfqAlias: string;
};

export type ScenarioCommand =
  | ExecuteQuoteScenarioCommand
  | GrantAccessScenarioCommand
  | RecordQuoteScenarioCommand
  | RegisterPairScenarioCommand
  | SubmitRfqScenarioCommand;

export type ScenarioStep = {
  actor: Persona;
  atMs: number;
  command: ScenarioCommand;
};

export type ScenarioOutput = {
  alias: string;
  id: string;
  type: "execution" | "pair" | "quote" | "rfq";
};

export type ScenarioReplayFile = {
  format: "canton-dark-sim.v1";
  outputs: readonly ScenarioOutput[];
  seed: number;
  startedAt: string;
  steps: readonly ScenarioStep[];
};

export type ScenarioResult = {
  replay: ScenarioReplayFile;
  replayCommand: string;
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
  clock: Pick<DeterministicClock, "advanceBy" | "now">
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
        format: "canton-dark-sim.v1",
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

export const runScenario = async (input: {
  seed: number;
  startAt?: Date | string;
  steps: readonly ScenarioStep[];
}): Promise<ScenarioResult> => {
  const environment = createMemoryVenueEnvironment({
    seed: input.seed,
    ...(input.startAt !== undefined ? { startAt: input.startAt } : {})
  });
  const scheduler = createDeterministicScheduler(environment.clock);
  const recorder = createScenarioRecorder(input.seed, environment.clock.now().toISOString());
  const aliases = new Map<string, string>();

  for (const step of input.steps) {
    scheduler.schedule(step.atMs, step.command.kind, async () => {
      recorder.recordStep(step);

      switch (step.command.kind) {
        case "register_pair": {
          const pair = await environment.application.registerPair({
            actorId: step.actor.participantId,
            mode: step.command.mode,
            operatorId: step.command.operatorId,
            dealers: step.command.dealers,
            jurisdiction: step.command.jurisdiction,
            rulebookVersion: step.command.rulebookVersion,
            rulebookSummary: step.command.rulebookSummary
          });
          aliases.set(step.command.alias, pair.pairId);
          recorder.recordOutput({
            alias: step.command.alias,
            type: "pair",
            id: pair.pairId
          });
          return;
        }
        case "grant_access": {
          await environment.application.grantAccess({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            subjectId: step.command.subjectId,
            role: step.command.role
          });
          return;
        }
        case "submit_rfq": {
          const rfq = await environment.application.submitRfq({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            directedDealerIds: step.command.directedDealerIds,
            instrumentId: step.command.instrumentId,
            side: step.command.side,
            quantity: step.command.quantity,
            expiresAt: step.command.expiresAt
          });
          aliases.set(step.command.alias, rfq.rfqId);
          recorder.recordOutput({
            alias: step.command.alias,
            type: "rfq",
            id: rfq.rfqId
          });
          return;
        }
        case "record_quote": {
          const quote = await environment.application.recordQuote({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            rfqId: aliases.get(step.command.rfqAlias) ?? step.command.rfqAlias,
            price: step.command.price,
            quantity: step.command.quantity,
            expiresAt: step.command.expiresAt
          });
          aliases.set(step.command.alias, quote.quoteId);
          recorder.recordOutput({
            alias: step.command.alias,
            type: "quote",
            id: quote.quoteId
          });
          return;
        }
        case "execute_quote": {
          const execution = await environment.application.executeQuote({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            rfqId: aliases.get(step.command.rfqAlias) ?? step.command.rfqAlias,
            quoteId: aliases.get(step.command.quoteAlias) ?? step.command.quoteAlias
          });
          aliases.set(step.command.alias, execution.executionId);
          recorder.recordOutput({
            alias: step.command.alias,
            type: "execution",
            id: execution.executionId
          });
        }
      }
    });
  }

  await scheduler.runAll();

  return {
    replay: recorder.toReplayFile(),
    replayCommand: createReplayMetadata(input.seed).command
  };
};

export const replayScenario = async (replay: ScenarioReplayFile): Promise<ScenarioResult> =>
  runScenario({
    seed: replay.seed,
    startAt: replay.startedAt,
    steps: replay.steps
  });

export const runTrivialScenario = async (seed: number): Promise<ScenarioResult> =>
  runScenario({
    seed,
    steps: [
      {
        atMs: 0,
        actor: persona.operator("operator-1", "Operator"),
        command: {
          kind: "register_pair",
          alias: "pair",
          mode: "ATSPair",
          operatorId: "operator-1",
          dealers: ["dealer-alpha", "dealer-beta"],
          jurisdiction: "US",
          rulebookVersion: "v1",
          rulebookSummary: "initial"
        }
      },
      {
        atMs: 1_000,
        actor: persona.operator("operator-1"),
        command: {
          kind: "grant_access",
          pairAlias: "pair",
          role: "subscriber",
          subjectId: "subscriber-1"
        }
      },
      {
        atMs: 2_000,
        actor: persona.subscriber("subscriber-1"),
        command: {
          kind: "submit_rfq",
          alias: "rfq",
          pairAlias: "pair",
          directedDealerIds: ["dealer-alpha"],
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 50,
          expiresAt: "2026-04-02T00:30:00.000Z"
        }
      },
      {
        atMs: 3_000,
        actor: persona.dealer("dealer-alpha"),
        command: {
          kind: "record_quote",
          alias: "quote",
          pairAlias: "pair",
          rfqAlias: "rfq",
          price: 100.5,
          quantity: 50,
          expiresAt: "2026-04-02T00:20:00.000Z"
        }
      },
      {
        atMs: 4_000,
        actor: persona.operator("operator-1"),
        command: {
          kind: "execute_quote",
          alias: "execution",
          pairAlias: "pair",
          rfqAlias: "rfq",
          quoteAlias: "quote"
        }
      }
    ]
  });
