import type { MemoryVenueEnvironment } from "@canton-dark/adapters-memory";

import {
  persona,
  runScenario,
  runScenarioWithEnvironment,
  type ScenarioResult,
  type ScenarioStep
} from "./core";

export const findDemoOutputId = (
  replay: ScenarioResult["replay"],
  alias: string,
  type?: ScenarioResult["replay"]["outputs"][number]["type"]
): string => {
  const output = replay.outputs.find(
    (candidate) => candidate.alias === alias && (type === undefined || candidate.type === type)
  );

  if (output === undefined) {
    throw new Error(`Scenario output ${alias} was not recorded.`);
  }

  return output.id;
};

export type Phase1DemoMode = "empty" | "phase1-complete" | "phase1-ready";
export type Phase2DemoMode = "phase2-ready";
export type Phase3DemoMode = "phase3-ready";

export type Phase1DemoSeedResult = ScenarioResult & {
  dealerId: string;
  dealerIds: readonly string[];
  mode: Phase1DemoMode;
  operatorId: string;
  pairId: string;
  subscriberId: string;
};

export type Phase2DemoSeedResult = ScenarioResult & {
  dealerId: string;
  dealerIds: readonly string[];
  mode: Phase2DemoMode;
  operatorId: string;
  pairId: string;
  subscriberId: string;
};

export type Phase3DemoSeedResult = ScenarioResult & {
  buyOrderId: string;
  dealerId: string;
  dealerIds: readonly string[];
  mode: Phase3DemoMode;
  operatorId: string;
  pairId: string;
  proposalId: string;
  secondarySubscriberId: string;
  sellOrderId: string;
  subscriberId: string;
};

export const phase1DemoDefaults = {
  dealerId: "dealer-alpha",
  dealerIds: ["dealer-alpha"],
  operatorId: "operator-demo",
  pairId: "pair-phase1-demo",
  subscriberId: "subscriber-1"
} as const;

export const phase2DemoDefaults = {
  dealerId: "dealer-alpha",
  dealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
  operatorId: "operator-demo",
  pairId: "pair-phase2-demo",
  subscriberId: "subscriber-1"
} as const;

export const phase3DemoDefaults = {
  dealerId: "dealer-alpha",
  dealerIds: ["dealer-alpha", "dealer-beta"],
  operatorId: "operator-demo",
  pairId: "pair-phase3-demo",
  secondarySubscriberId: "subscriber-2",
  subscriberId: "subscriber-1"
} as const;

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
        dealerIds: phase1DemoDefaults.dealerIds,
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

export const createPhase2DemoSteps = (): readonly ScenarioStep[] => [
  {
    atMs: 0,
    actor: persona.operator(phase2DemoDefaults.operatorId, "Operator"),
    command: {
      kind: "create_pair",
      alias: "pair",
      pairId: phase2DemoDefaults.pairId,
      operatorId: phase2DemoDefaults.operatorId,
      mode: "ATSPair",
      dealerIds: phase2DemoDefaults.dealerIds,
      operatorOversightRole: "blinded",
      inviteRevisionPolicy: "before_first_response",
      jurisdiction: "US",
      rulebookVersion: "v2",
      rulebookSummary: "phase 2 ats demo"
    }
  },
  {
    atMs: 1_000,
    actor: persona.operator(phase2DemoDefaults.operatorId),
    command: {
      kind: "grant_access",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: phase2DemoDefaults.subscriberId
    }
  }
];

export const createPhase3DemoSteps = (): readonly ScenarioStep[] => [
  {
    atMs: 0,
    actor: persona.operator(phase3DemoDefaults.operatorId, "Operator"),
    command: {
      kind: "createPair",
      alias: "pair",
      pairId: phase3DemoDefaults.pairId,
      operatorId: phase3DemoDefaults.operatorId,
      mode: "ATSPair",
      dealerIds: phase3DemoDefaults.dealerIds,
      operatorOversightRole: "blinded",
      inviteRevisionPolicy: "before_first_response",
      jurisdiction: "US",
      rulebookVersion: "v3",
      rulebookSummary: "phase 3 dark cross demo"
    }
  },
  {
    atMs: 1_000,
    actor: persona.operator(phase3DemoDefaults.operatorId),
    command: {
      kind: "grantAccess",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: phase3DemoDefaults.subscriberId
    }
  },
  {
    atMs: 2_000,
    actor: persona.operator(phase3DemoDefaults.operatorId),
    command: {
      kind: "grantAccess",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: phase3DemoDefaults.secondarySubscriberId
    }
  },
  {
    atMs: 3_000,
    actor: persona.subscriber(phase3DemoDefaults.subscriberId),
    command: {
      kind: "submitDarkOrder",
      alias: "buy-order",
      pairAlias: "pair",
      clientOrderId: "phase3-buy-order",
      instrumentId: "CUSIP-DARK-1",
      side: "buy",
      quantity: 25,
      limitPrice: 101,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 4_000,
    actor: persona.subscriber(phase3DemoDefaults.secondarySubscriberId),
    command: {
      kind: "submitDarkOrder",
      alias: "sell-order",
      pairAlias: "pair",
      clientOrderId: "phase3-sell-order",
      instrumentId: "CUSIP-DARK-1",
      side: "sell",
      quantity: 25,
      limitPrice: 100,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 5_000,
    actor: persona.operator(phase3DemoDefaults.operatorId),
    command: {
      kind: "generateMatchProposal",
      pairAlias: "pair",
      proposalAlias: "proposal",
      buyOrderAlias: "buy-order",
      sellOrderAlias: "sell-order",
      buyLockAlias: "buy-lock",
      sellLockAlias: "sell-lock",
      expiresAt: "2026-04-02T00:05:00.000Z"
    }
  }
];

export const seedPhase1DemoEnvironment = async (
  environment: MemoryVenueEnvironment,
  input: {
    mode: Phase1DemoMode;
    seed: number;
  }
): Promise<Phase1DemoSeedResult> => ({
  ...(
    await runScenarioWithEnvironment({
      environment,
      seed: input.seed,
      steps: createPhase1DemoSteps(input.mode)
    })
  ).result,
  mode: input.mode,
  pairId: phase1DemoDefaults.pairId,
  operatorId: phase1DemoDefaults.operatorId,
  dealerId: phase1DemoDefaults.dealerId,
  dealerIds: phase1DemoDefaults.dealerIds,
  subscriberId: phase1DemoDefaults.subscriberId
});

export const seedPhase2DemoEnvironment = async (
  environment: MemoryVenueEnvironment,
  input: {
    mode: Phase2DemoMode;
    seed: number;
  }
): Promise<Phase2DemoSeedResult> => ({
  ...(
    await runScenarioWithEnvironment({
      environment,
      seed: input.seed,
      steps: createPhase2DemoSteps()
    })
  ).result,
  mode: input.mode,
  pairId: phase2DemoDefaults.pairId,
  operatorId: phase2DemoDefaults.operatorId,
  dealerId: phase2DemoDefaults.dealerId,
  dealerIds: phase2DemoDefaults.dealerIds,
  subscriberId: phase2DemoDefaults.subscriberId
});

export const seedPhase3DemoEnvironment = async (
  environment: MemoryVenueEnvironment,
  input: {
    mode: Phase3DemoMode;
    seed: number;
  }
): Promise<Phase3DemoSeedResult> => {
  const result = (
    await runScenarioWithEnvironment({
      environment,
      seed: input.seed,
      steps: createPhase3DemoSteps()
    })
  ).result;

  return {
    ...result,
    mode: input.mode,
    pairId: phase3DemoDefaults.pairId,
    operatorId: phase3DemoDefaults.operatorId,
    dealerId: phase3DemoDefaults.dealerId,
    dealerIds: phase3DemoDefaults.dealerIds,
    subscriberId: phase3DemoDefaults.subscriberId,
    secondarySubscriberId: phase3DemoDefaults.secondarySubscriberId,
    buyOrderId: findDemoOutputId(result.replay, "buy-order", "order"),
    sellOrderId: findDemoOutputId(result.replay, "sell-order", "order"),
    proposalId: findDemoOutputId(result.replay, "proposal", "proposal")
  };
};

export const runPhase1DemoScenario = async (seed: number): Promise<ScenarioResult> =>
  runScenario({
    seed,
    steps: createPhase1DemoSteps("phase1-complete")
  });

export const runPhase3DemoScenario = async (seed: number): Promise<ScenarioResult> =>
  runScenario({
    seed,
    steps: createPhase3DemoSteps()
  });
