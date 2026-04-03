import {
  createMemoryVenueEnvironment,
  type DeterministicClock,
  type MemoryVenueEnvironment
} from "@canton-dark/adapters-memory";
import type { ParticipantRole, RFQSide, SettlementStatus } from "@canton-dark/domain-core";
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

export type CreatePairScenarioCommand = {
  alias: string;
  dealerId: string;
  jurisdiction: string;
  kind: "create_pair";
  operatorId: string;
  pairId?: string;
  rulebookSummary: string;
  rulebookVersion: string;
};

export type GrantAccessScenarioCommand = {
  kind: "grant_access";
  pairAlias: string;
  role: ParticipantRole;
  subjectId: string;
};

export type OpenRfqScenarioCommand = {
  alias: string;
  instrumentId: string;
  kind: "open_rfq";
  pairAlias: string;
  quantity: number;
  side: RFQSide;
};

export type SubmitQuoteScenarioCommand = {
  alias: string;
  expiresAt: string;
  kind: "submit_quote";
  pairAlias: string;
  price: number;
  quantity: number;
  rfqAlias: string;
};

export type AcceptQuoteScenarioCommand = {
  executionAlias: string;
  kind: "accept_quote";
  pairAlias: string;
  quoteAlias: string;
  rfqAlias: string;
  settlementAlias: string;
};

export type MarkSettlementProgressionScenarioCommand = {
  kind: "mark_settlement_progression";
  pairAlias: string;
  settlementAlias: string;
  status: SettlementStatus;
};

export type ScenarioCommand =
  | AcceptQuoteScenarioCommand
  | CreatePairScenarioCommand
  | GrantAccessScenarioCommand
  | MarkSettlementProgressionScenarioCommand
  | OpenRfqScenarioCommand
  | SubmitQuoteScenarioCommand;

export type ScenarioStep = {
  actor: Persona;
  atMs: number;
  command: ScenarioCommand;
};

export type ScenarioOutput = {
  alias: string;
  id: string;
  type: "execution" | "pair" | "quote" | "rfq" | "settlement";
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

export type Phase1DemoMode = "empty" | "phase1-complete" | "phase1-ready";

export type Phase1DemoSeedResult = ScenarioResult & {
  dealerId: string;
  mode: Phase1DemoMode;
  operatorId: string;
  pairId: string;
  subscriberId: string;
};

export const phase1DemoDefaults = {
  dealerId: "dealer-alpha",
  operatorId: "operator-demo",
  pairId: "pair-phase1-demo",
  subscriberId: "subscriber-1"
} as const;

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

  for (const step of input.steps) {
    scheduler.schedule(step.atMs, step.command.kind, async () => {
      recorder.recordStep(step);

      switch (step.command.kind) {
        case "create_pair": {
          const pair = await environment.application.createPair({
            actorId: step.actor.participantId,
            operatorId: step.command.operatorId,
            dealerId: step.command.dealerId,
            jurisdiction: step.command.jurisdiction,
            ...(step.command.pairId !== undefined ? { pairId: step.command.pairId } : {}),
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
        case "open_rfq": {
          const rfq = await environment.application.openRfq({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            instrumentId: step.command.instrumentId,
            side: step.command.side,
            quantity: step.command.quantity
          });
          aliases.set(step.command.alias, rfq.rfqId);
          recorder.recordOutput({
            alias: step.command.alias,
            type: "rfq",
            id: rfq.rfqId
          });
          return;
        }
        case "submit_quote": {
          const quote = await environment.application.submitQuote({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            rfqId: aliases.get(step.command.rfqAlias) ?? step.command.rfqAlias,
            price: step.command.price,
            quantity: step.command.quantity,
            expiresAt: step.command.expiresAt
          });
          aliases.set(step.command.alias, quote.quote.quoteId);
          recorder.recordOutput({
            alias: step.command.alias,
            type: "quote",
            id: quote.quote.quoteId
          });
          return;
        }
        case "accept_quote": {
          const accepted = await environment.application.acceptQuote({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            rfqId: aliases.get(step.command.rfqAlias) ?? step.command.rfqAlias,
            quoteId: aliases.get(step.command.quoteAlias) ?? step.command.quoteAlias
          });
          aliases.set(step.command.executionAlias, accepted.executionTicket.executionId);
          aliases.set(step.command.settlementAlias, accepted.settlementInstruction.instructionId);
          recorder.recordOutput({
            alias: step.command.executionAlias,
            type: "execution",
            id: accepted.executionTicket.executionId
          });
          recorder.recordOutput({
            alias: step.command.settlementAlias,
            type: "settlement",
            id: accepted.settlementInstruction.instructionId
          });
          return;
        }
        case "mark_settlement_progression": {
          await environment.application.markSettlementProgression({
            actorId: step.actor.participantId,
            pairId: aliases.get(step.command.pairAlias) ?? step.command.pairAlias,
            instructionId:
              aliases.get(step.command.settlementAlias) ?? step.command.settlementAlias,
            status: step.command.status
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

export const createPhase1DemoSteps = (mode: Phase1DemoMode): readonly ScenarioStep[] => {
  if (mode === "empty") {
    return [];
  }

  const steps: ScenarioStep[] = [
    {
      atMs: 0,
      actor: persona.operator(phase1DemoDefaults.operatorId, "Operator"),
      command: {
        kind: "create_pair",
        alias: "pair",
        pairId: phase1DemoDefaults.pairId,
        operatorId: phase1DemoDefaults.operatorId,
        dealerId: phase1DemoDefaults.dealerId,
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      }
    },
    {
      atMs: 1_000,
      actor: persona.operator(phase1DemoDefaults.operatorId),
      command: {
        kind: "grant_access",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: phase1DemoDefaults.subscriberId
      }
    }
  ];

  if (mode === "phase1-complete") {
    steps.push(
      {
        atMs: 2_000,
        actor: persona.subscriber(phase1DemoDefaults.subscriberId),
        command: {
          kind: "open_rfq",
          alias: "rfq",
          pairAlias: "pair",
          instrumentId: "CUSIP-1",
          side: "buy",
          quantity: 50
        }
      },
      {
        atMs: 3_000,
        actor: persona.dealer(phase1DemoDefaults.dealerId),
        command: {
          kind: "submit_quote",
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
        actor: persona.subscriber(phase1DemoDefaults.subscriberId),
        command: {
          kind: "accept_quote",
          pairAlias: "pair",
          rfqAlias: "rfq",
          quoteAlias: "quote",
          executionAlias: "execution",
          settlementAlias: "settlement"
        }
      },
      {
        atMs: 5_000,
        actor: persona.operator(phase1DemoDefaults.operatorId),
        command: {
          kind: "mark_settlement_progression",
          pairAlias: "pair",
          settlementAlias: "settlement",
          status: "affirmed"
        }
      }
    );
  }

  return steps;
};

export const seedPhase1DemoEnvironment = async (
  environment: MemoryVenueEnvironment,
  input: {
    mode: Phase1DemoMode;
    seed: number;
  }
): Promise<Phase1DemoSeedResult> => {
  const result = await executeScenario(environment, {
    seed: input.seed,
    steps: createPhase1DemoSteps(input.mode)
  });

  return {
    ...result,
    mode: input.mode,
    pairId: phase1DemoDefaults.pairId,
    operatorId: phase1DemoDefaults.operatorId,
    dealerId: phase1DemoDefaults.dealerId,
    subscriberId: phase1DemoDefaults.subscriberId
  };
};

export const runScenario = async (input: {
  seed: number;
  startAt?: Date | string;
  steps: readonly ScenarioStep[];
}): Promise<ScenarioResult> => {
  const environment = createMemoryVenueEnvironment({
    seed: input.seed,
    ...(input.startAt !== undefined ? { startAt: input.startAt } : {})
  });
  return executeScenario(environment, {
    seed: input.seed,
    steps: input.steps
  });
};

export const replayScenario = async (replay: ScenarioReplayFile): Promise<ScenarioResult> =>
  runScenario({
    seed: replay.seed,
    startAt: replay.startedAt,
    steps: replay.steps
  });

export const runPhase1DemoScenario = async (seed: number): Promise<ScenarioResult> =>
  runScenario({
    seed,
    steps: createPhase1DemoSteps("phase1-complete")
  });
