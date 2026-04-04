import {
  createSeededRandom,
  persona,
  replayScenario,
  runScenarioWithEnvironment,
  serializeReplayFile,
  type ScenarioReplayFile,
  type ScenarioResult,
  type ScenarioRun,
  type ScenarioStep
} from "./core";

export type SimulationCampaignName =
  | "unauthorized_visibility"
  | "no_double_execution"
  | "no_late_accept_after_expiry"
  | "no_match_on_paused_pair"
  | "deterministic_replay_from_seed"
  | "lock_release_correctness"
  | "idempotent_retries";

export type SimulationInvariantResult = {
  detail: string;
  name: SimulationCampaignName;
  passed: boolean;
};

export type SimulationCampaignResult = {
  campaign: SimulationCampaignName;
  invariants: readonly SimulationInvariantResult[];
  result: ScenarioResult;
};

export type SimulationSweepFailure = {
  campaign: SimulationCampaignName;
  detail: string;
  replay?: ScenarioReplayFile;
  replayText?: string;
  seed: number;
};

export type SimulationSweepResult = {
  failures: readonly SimulationSweepFailure[];
  passed: number;
  total: number;
};

export const simulationCampaignNames = [
  "unauthorized_visibility",
  "no_double_execution",
  "no_late_accept_after_expiry",
  "no_match_on_paused_pair",
  "deterministic_replay_from_seed",
  "lock_release_correctness",
  "idempotent_retries"
] as const satisfies readonly SimulationCampaignName[];

const resolveOutputId = (
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

const toErrorCode = (error: unknown): string | undefined =>
  error instanceof Error && typeof (error as { code?: unknown }).code === "string"
    ? (error as unknown as { code: string }).code
    : undefined;

const rejectedWithCode = async (input: Promise<unknown>, code: string): Promise<boolean> => {
  try {
    await input;
    return false;
  } catch (error) {
    return toErrorCode(error) === code;
  }
};

const pass = (name: SimulationCampaignName, detail: string): SimulationInvariantResult => ({
  name,
  detail,
  passed: true
});

const fail = (name: SimulationCampaignName, detail: string): SimulationInvariantResult => ({
  name,
  detail,
  passed: false
});

const buildUnauthorizedVisibilitySteps = (seed: number): readonly ScenarioStep[] => {
  const random = createSeededRandom(seed);
  const pairId = `pair-privacy-${seed}`;
  const alphaPrice = 99 + random.nextInt(3);
  const betaPrice = alphaPrice + 1 + random.nextInt(2);

  return [
    {
      atMs: 0,
      actor: persona.operator("operator-privacy"),
      command: {
        kind: "createPair",
        alias: "pair",
        pairId,
        operatorId: "operator-privacy",
        mode: "ATSPair",
        dealerIds: ["dealer-alpha", "dealer-beta", "dealer-gamma"],
        operatorOversightRole: "blinded",
        inviteRevisionPolicy: "before_first_response",
        jurisdiction: "US",
        rulebookSummary: "privacy campaign",
        rulebookVersion: "v2"
      }
    },
    {
      atMs: 1_000,
      actor: persona.operator("operator-privacy"),
      command: {
        kind: "grantAccess",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: "subscriber-alpha"
      }
    },
    {
      atMs: 2_000,
      actor: persona.operator("operator-privacy"),
      command: {
        kind: "grantAccess",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: "subscriber-beta"
      }
    },
    {
      atMs: 3_000,
      actor: persona.subscriber("subscriber-alpha"),
      command: {
        kind: "openRFQ",
        alias: "rfq",
        pairAlias: "pair",
        instrumentId: `CUSIP-PRIV-${seed % 10}`,
        side: "buy",
        quantity: 25,
        responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
        invitedDealerIds: ["dealer-alpha", "dealer-beta"]
      }
    },
    {
      atMs: 4_000,
      actor: persona.dealer("dealer-alpha"),
      command: {
        kind: "submitQuote",
        alias: "quote-alpha",
        pairAlias: "pair",
        rfqAlias: "rfq",
        price: alphaPrice,
        quantity: 25,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    },
    {
      atMs: 5_000,
      actor: persona.dealer("dealer-beta"),
      command: {
        kind: "submitQuote",
        alias: "quote-beta",
        pairAlias: "pair",
        rfqAlias: "rfq",
        price: betaPrice,
        quantity: 25,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    },
    {
      atMs: 6_000,
      actor: persona.subscriber("subscriber-alpha"),
      command: {
        kind: "submitDarkOrder",
        alias: "buy-order",
        pairAlias: "pair",
        clientOrderId: "privacy-buy",
        instrumentId: "CUSIP-DARK-PRIV",
        side: "buy",
        quantity: 10,
        limitPrice: 102,
        expiresAt: "2026-04-02T00:30:00.000Z"
      }
    },
    {
      atMs: 7_000,
      actor: persona.subscriber("subscriber-beta"),
      command: {
        kind: "submitDarkOrder",
        alias: "sell-order",
        pairAlias: "pair",
        clientOrderId: "privacy-sell",
        instrumentId: "CUSIP-DARK-PRIV",
        side: "sell",
        quantity: 10,
        limitPrice: 100,
        expiresAt: "2026-04-02T00:30:00.000Z"
      }
    },
    {
      atMs: 8_000,
      actor: persona.operator("operator-privacy"),
      command: {
        kind: "generateMatchProposal",
        pairAlias: "pair",
        proposalAlias: "proposal",
        buyOrderAlias: "buy-order",
        sellOrderAlias: "sell-order",
        buyLockAlias: "buy-lock",
        sellLockAlias: "sell-lock",
        expiresAt: "2026-04-02T00:15:00.000Z"
      }
    }
  ];
};

const buildNoDoubleExecutionSteps = (): readonly ScenarioStep[] => [
  {
    atMs: 0,
    actor: persona.operator("operator-double"),
    command: {
      kind: "createPair",
      alias: "rfq-pair",
      pairId: "pair-double-rfq",
      operatorId: "operator-double",
      dealerId: "dealer-double",
      mode: "SingleDealerPair",
      jurisdiction: "US",
      rulebookSummary: "double execution rfq",
      rulebookVersion: "v1"
    }
  },
  {
    atMs: 1_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "grantAccess",
      pairAlias: "rfq-pair",
      role: "subscriber",
      subjectId: "subscriber-double"
    }
  },
  {
    atMs: 2_000,
    actor: persona.subscriber("subscriber-double"),
    command: {
      kind: "openRFQ",
      alias: "rfq",
      pairAlias: "rfq-pair",
      instrumentId: "CUSIP-DOUBLE",
      side: "buy",
      quantity: 12
    }
  },
  {
    atMs: 3_000,
    actor: persona.dealer("dealer-double"),
    command: {
      kind: "submitQuote",
      alias: "quote",
      pairAlias: "rfq-pair",
      rfqAlias: "rfq",
      price: 100,
      quantity: 12,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 4_000,
    actor: persona.subscriber("subscriber-double"),
    command: {
      kind: "acceptQuote",
      pairAlias: "rfq-pair",
      quoteAlias: "quote",
      executionAlias: "rfq-execution",
      settlementAlias: "rfq-settlement"
    }
  },
  {
    atMs: 5_000,
    actor: persona.subscriber("subscriber-double"),
    expectErrorCode: "QUOTE_ALREADY_ACCEPTED",
    command: {
      kind: "acceptQuote",
      pairAlias: "rfq-pair",
      quoteAlias: "quote",
      executionAlias: "rfq-execution-repeat",
      settlementAlias: "rfq-settlement-repeat"
    }
  },
  {
    atMs: 6_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "createPair",
      alias: "dark-pair",
      pairId: "pair-double-dark",
      operatorId: "operator-double",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      jurisdiction: "US",
      rulebookSummary: "double execution dark",
      rulebookVersion: "v3"
    }
  },
  {
    atMs: 7_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "grantAccess",
      pairAlias: "dark-pair",
      role: "subscriber",
      subjectId: "subscriber-one"
    }
  },
  {
    atMs: 8_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "grantAccess",
      pairAlias: "dark-pair",
      role: "subscriber",
      subjectId: "subscriber-two"
    }
  },
  {
    atMs: 9_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "submitDarkOrder",
      alias: "buy-order",
      pairAlias: "dark-pair",
      clientOrderId: "double-buy",
      instrumentId: "CUSIP-DARK-DOUBLE",
      side: "buy",
      quantity: 10,
      limitPrice: 101,
      expiresAt: "2026-04-02T00:30:00.000Z"
    }
  },
  {
    atMs: 10_000,
    actor: persona.subscriber("subscriber-two"),
    command: {
      kind: "submitDarkOrder",
      alias: "sell-order",
      pairAlias: "dark-pair",
      clientOrderId: "double-sell",
      instrumentId: "CUSIP-DARK-DOUBLE",
      side: "sell",
      quantity: 10,
      limitPrice: 100,
      expiresAt: "2026-04-02T00:30:00.000Z"
    }
  },
  {
    atMs: 11_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "generateMatchProposal",
      pairAlias: "dark-pair",
      proposalAlias: "proposal",
      buyOrderAlias: "buy-order",
      sellOrderAlias: "sell-order",
      buyLockAlias: "buy-lock",
      sellLockAlias: "sell-lock",
      expiresAt: "2026-04-02T00:10:00.000Z"
    }
  },
  {
    atMs: 12_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "acceptMatch",
      pairAlias: "dark-pair",
      proposalAlias: "proposal"
    }
  },
  {
    atMs: 13_000,
    actor: persona.subscriber("subscriber-two"),
    command: {
      kind: "acceptMatch",
      pairAlias: "dark-pair",
      proposalAlias: "proposal"
    }
  },
  {
    atMs: 14_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "executeMatch",
      pairAlias: "dark-pair",
      proposalAlias: "proposal",
      executionAlias: "dark-execution",
      settlementAlias: "dark-settlement"
    }
  },
  {
    atMs: 15_000,
    actor: persona.operator("operator-double"),
    command: {
      kind: "executeMatch",
      pairAlias: "dark-pair",
      proposalAlias: "proposal",
      executionAlias: "dark-execution-repeat",
      settlementAlias: "dark-settlement-repeat"
    }
  }
];

const buildLateAcceptSteps = (): readonly ScenarioStep[] => [
  {
    atMs: 0,
    actor: persona.operator("operator-late"),
    command: {
      kind: "createPair",
      alias: "rfq-pair",
      pairId: "pair-late-rfq",
      operatorId: "operator-late",
      dealerId: "dealer-late",
      mode: "SingleDealerPair",
      jurisdiction: "US",
      rulebookSummary: "late accept rfq",
      rulebookVersion: "v1"
    }
  },
  {
    atMs: 1_000,
    actor: persona.operator("operator-late"),
    command: {
      kind: "grantAccess",
      pairAlias: "rfq-pair",
      role: "subscriber",
      subjectId: "subscriber-late"
    }
  },
  {
    atMs: 2_000,
    actor: persona.subscriber("subscriber-late"),
    command: {
      kind: "openRFQ",
      alias: "rfq",
      pairAlias: "rfq-pair",
      instrumentId: "CUSIP-LATE",
      side: "buy",
      quantity: 10
    }
  },
  {
    atMs: 3_000,
    actor: persona.dealer("dealer-late"),
    command: {
      kind: "submitQuote",
      alias: "quote",
      pairAlias: "rfq-pair",
      rfqAlias: "rfq",
      price: 100,
      quantity: 10,
      expiresAt: "2026-04-02T00:01:00.000Z"
    }
  },
  {
    atMs: 120_000,
    actor: persona.subscriber("subscriber-late"),
    expectErrorCode: "QUOTE_EXPIRED",
    command: {
      kind: "acceptQuote",
      pairAlias: "rfq-pair",
      quoteAlias: "quote",
      executionAlias: "late-execution",
      settlementAlias: "late-settlement"
    }
  },
  {
    atMs: 121_000,
    actor: persona.operator("operator-late"),
    command: {
      kind: "createPair",
      alias: "dark-pair",
      pairId: "pair-late-dark",
      operatorId: "operator-late",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      jurisdiction: "US",
      rulebookSummary: "late accept dark",
      rulebookVersion: "v3"
    }
  },
  {
    atMs: 122_000,
    actor: persona.operator("operator-late"),
    command: {
      kind: "grantAccess",
      pairAlias: "dark-pair",
      role: "subscriber",
      subjectId: "subscriber-one"
    }
  },
  {
    atMs: 123_000,
    actor: persona.operator("operator-late"),
    command: {
      kind: "grantAccess",
      pairAlias: "dark-pair",
      role: "subscriber",
      subjectId: "subscriber-two"
    }
  },
  {
    atMs: 124_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "submitDarkOrder",
      alias: "buy-order",
      pairAlias: "dark-pair",
      clientOrderId: "late-buy",
      instrumentId: "CUSIP-LATE-DARK",
      side: "buy",
      quantity: 5,
      limitPrice: 101,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 125_000,
    actor: persona.subscriber("subscriber-two"),
    command: {
      kind: "submitDarkOrder",
      alias: "sell-order",
      pairAlias: "dark-pair",
      clientOrderId: "late-sell",
      instrumentId: "CUSIP-LATE-DARK",
      side: "sell",
      quantity: 5,
      limitPrice: 100,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 126_000,
    actor: persona.operator("operator-late"),
    command: {
      kind: "generateMatchProposal",
      pairAlias: "dark-pair",
      proposalAlias: "proposal",
      buyOrderAlias: "buy-order",
      sellOrderAlias: "sell-order",
      buyLockAlias: "buy-lock",
      sellLockAlias: "sell-lock",
      expiresAt: "2026-04-02T00:02:30.000Z"
    }
  },
  {
    atMs: 240_000,
    actor: persona.subscriber("subscriber-one"),
    expectErrorCode: "MATCH_PROPOSAL_NOT_PENDING",
    command: {
      kind: "acceptMatch",
      pairAlias: "dark-pair",
      proposalAlias: "proposal"
    }
  },
  {
    atMs: 241_000,
    actor: persona.operator("operator-late"),
    command: {
      kind: "expireLocks",
      pairAlias: "dark-pair",
      proposalAlias: "proposal"
    }
  }
];

const buildPausedPairSteps = (): readonly ScenarioStep[] => [
  {
    atMs: 0,
    actor: persona.operator("operator-paused"),
    command: {
      kind: "createPair",
      alias: "pair",
      pairId: "pair-paused-dark",
      operatorId: "operator-paused",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      jurisdiction: "US",
      rulebookSummary: "paused pair dark",
      rulebookVersion: "v3"
    }
  },
  {
    atMs: 1_000,
    actor: persona.operator("operator-paused"),
    command: {
      kind: "grantAccess",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: "subscriber-one"
    }
  },
  {
    atMs: 2_000,
    actor: persona.operator("operator-paused"),
    command: {
      kind: "grantAccess",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: "subscriber-two"
    }
  },
  {
    atMs: 3_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "submitDarkOrder",
      alias: "buy-order",
      pairAlias: "pair",
      clientOrderId: "paused-buy",
      instrumentId: "CUSIP-PAUSED",
      side: "buy",
      quantity: 10,
      limitPrice: 101,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 4_000,
    actor: persona.subscriber("subscriber-two"),
    command: {
      kind: "submitDarkOrder",
      alias: "sell-order",
      pairAlias: "pair",
      clientOrderId: "paused-sell",
      instrumentId: "CUSIP-PAUSED",
      side: "sell",
      quantity: 10,
      limitPrice: 100,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 5_000,
    actor: persona.operator("operator-paused"),
    command: {
      kind: "pausePair",
      pairAlias: "pair",
      reason: "manual hold"
    }
  },
  {
    atMs: 6_000,
    actor: persona.operator("operator-paused"),
    expectErrorCode: "PAIR_IS_PAUSED",
    command: {
      kind: "generateMatchProposal",
      pairAlias: "pair",
      proposalAlias: "proposal",
      buyOrderAlias: "buy-order",
      sellOrderAlias: "sell-order",
      buyLockAlias: "buy-lock",
      sellLockAlias: "sell-lock",
      expiresAt: "2026-04-02T00:10:00.000Z"
    }
  }
];

const buildDeterministicReplaySteps = (seed: number): readonly ScenarioStep[] => {
  const random = createSeededRandom(seed);
  const alphaPrice = 98 + random.nextInt(3);
  const betaPrice = alphaPrice + 2;

  return [
    {
      atMs: 0,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "createPair",
        alias: "pair",
        pairId: `pair-replay-${seed}`,
        operatorId: "operator-replay",
        mode: "ATSPair",
        dealerIds: ["dealer-alpha", "dealer-beta"],
        operatorOversightRole: "full",
        inviteRevisionPolicy: "before_first_response",
        jurisdiction: "US",
        rulebookSummary: "deterministic replay",
        rulebookVersion: "v3"
      }
    },
    {
      atMs: 1_000,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "grantAccess",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: "subscriber-one"
      }
    },
    {
      atMs: 2_000,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "grantAccess",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: "subscriber-two"
      }
    },
    {
      atMs: 3_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "openRFQ",
        alias: "rfq",
        pairAlias: "pair",
        instrumentId: `CUSIP-REPLAY-${seed % 100}`,
        side: "buy",
        quantity: 20,
        responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
        invitedDealerIds: ["dealer-alpha", "dealer-beta"]
      }
    },
    {
      atMs: 4_000,
      actor: persona.dealer("dealer-alpha"),
      command: {
        kind: "submitQuote",
        alias: "quote-alpha",
        pairAlias: "pair",
        rfqAlias: "rfq",
        price: alphaPrice,
        quantity: 20,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    },
    {
      atMs: 5_000,
      actor: persona.dealer("dealer-alpha"),
      command: {
        kind: "reviseQuote",
        alias: "quote-alpha-revised",
        pairAlias: "pair",
        quoteAlias: "quote-alpha",
        price: alphaPrice - 1,
        quantity: 20,
        expiresAt: "2026-04-02T00:22:00.000Z"
      }
    },
    {
      atMs: 6_000,
      actor: persona.dealer("dealer-beta"),
      command: {
        kind: "submitQuote",
        alias: "quote-beta",
        pairAlias: "pair",
        rfqAlias: "rfq",
        price: betaPrice,
        quantity: 20,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    },
    {
      atMs: 7_000,
      actor: persona.dealer("dealer-beta"),
      command: {
        kind: "withdrawQuote",
        pairAlias: "pair",
        quoteAlias: "quote-beta",
        reason: "manual pullback"
      }
    },
    {
      atMs: 8_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "rejectQuotes",
        pairAlias: "pair",
        rfqAlias: "rfq",
        reason: "no fill"
      }
    },
    {
      atMs: 9_000,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "pausePair",
        pairAlias: "pair",
        reason: "supervisory review"
      }
    },
    {
      atMs: 10_000,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "unpausePair",
        pairAlias: "pair"
      }
    },
    {
      atMs: 11_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "submitDarkOrder",
        alias: "cancel-order",
        pairAlias: "pair",
        clientOrderId: "cancel-me",
        instrumentId: "CUSIP-DARK-REPLAY",
        side: "buy",
        quantity: 5,
        limitPrice: 99,
        expiresAt: "2026-04-02T00:30:00.000Z"
      }
    },
    {
      atMs: 12_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "cancelDarkOrder",
        pairAlias: "pair",
        orderAlias: "cancel-order"
      }
    },
    {
      atMs: 13_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "submitDarkOrder",
        alias: "buy-order",
        pairAlias: "pair",
        clientOrderId: "replay-buy",
        instrumentId: "CUSIP-DARK-REPLAY",
        side: "buy",
        quantity: 10,
        limitPrice: 101,
        expiresAt: "2026-04-02T00:30:00.000Z"
      }
    },
    {
      atMs: 14_000,
      actor: persona.subscriber("subscriber-two"),
      command: {
        kind: "submitDarkOrder",
        alias: "sell-order",
        pairAlias: "pair",
        clientOrderId: "replay-sell",
        instrumentId: "CUSIP-DARK-REPLAY",
        side: "sell",
        quantity: 10,
        limitPrice: 100,
        expiresAt: "2026-04-02T00:30:00.000Z"
      }
    },
    {
      atMs: 15_000,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "generateMatchProposal",
        pairAlias: "pair",
        proposalAlias: "proposal",
        buyOrderAlias: "buy-order",
        sellOrderAlias: "sell-order",
        buyLockAlias: "buy-lock",
        sellLockAlias: "sell-lock",
        expiresAt: "2026-04-02T00:10:00.000Z"
      }
    },
    {
      atMs: 16_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "acceptMatch",
        pairAlias: "pair",
        proposalAlias: "proposal"
      }
    },
    {
      atMs: 17_000,
      actor: persona.subscriber("subscriber-two"),
      command: {
        kind: "acceptMatch",
        pairAlias: "pair",
        proposalAlias: "proposal"
      }
    },
    {
      atMs: 18_000,
      actor: persona.operator("operator-replay"),
      command: {
        kind: "executeMatch",
        pairAlias: "pair",
        proposalAlias: "proposal",
        executionAlias: "execution",
        settlementAlias: "settlement"
      }
    }
  ];
};

const buildLockReleaseSteps = (seed: number): readonly ScenarioStep[] => {
  const branch = seed % 3;
  const base: ScenarioStep[] = [
    {
      atMs: 0,
      actor: persona.operator("operator-lock"),
      command: {
        kind: "createPair",
        alias: "pair",
        pairId: `pair-lock-${seed}`,
        operatorId: "operator-lock",
        mode: "ATSPair",
        dealerIds: ["dealer-alpha", "dealer-beta"],
        jurisdiction: "US",
        rulebookSummary: "lock release",
        rulebookVersion: "v3"
      }
    },
    {
      atMs: 1_000,
      actor: persona.operator("operator-lock"),
      command: {
        kind: "grantAccess",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: "subscriber-one"
      }
    },
    {
      atMs: 2_000,
      actor: persona.operator("operator-lock"),
      command: {
        kind: "grantAccess",
        pairAlias: "pair",
        role: "subscriber",
        subjectId: "subscriber-two"
      }
    },
    {
      atMs: 3_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "submitDarkOrder",
        alias: "buy-order",
        pairAlias: "pair",
        clientOrderId: "lock-buy",
        instrumentId: "CUSIP-LOCK",
        side: "buy",
        quantity: 10,
        limitPrice: 101,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    },
    {
      atMs: 4_000,
      actor: persona.subscriber("subscriber-two"),
      command: {
        kind: "submitDarkOrder",
        alias: "sell-order",
        pairAlias: "pair",
        clientOrderId: "lock-sell",
        instrumentId: "CUSIP-LOCK",
        side: "sell",
        quantity: 10,
        limitPrice: 100,
        expiresAt: "2026-04-02T00:20:00.000Z"
      }
    },
    {
      atMs: 5_000,
      actor: persona.operator("operator-lock"),
      command: {
        kind: "generateMatchProposal",
        pairAlias: "pair",
        proposalAlias: "proposal",
        buyOrderAlias: "buy-order",
        sellOrderAlias: "sell-order",
        buyLockAlias: "buy-lock",
        sellLockAlias: "sell-lock",
        expiresAt: "2026-04-02T00:01:00.000Z"
      }
    }
  ];

  if (branch === 0) {
    return [
      ...base,
      {
        atMs: 6_000,
        actor: persona.subscriber("subscriber-one"),
        command: {
          kind: "rejectMatch",
          pairAlias: "pair",
          proposalAlias: "proposal",
          reason: "manual reject"
        }
      }
    ];
  }

  if (branch === 1) {
    return [
      ...base,
      {
        atMs: 120_000,
        actor: persona.operator("operator-lock"),
        command: {
          kind: "expireLocks",
          pairAlias: "pair",
          proposalAlias: "proposal"
        }
      }
    ];
  }

  return [
    ...base,
    {
      atMs: 6_000,
      actor: persona.subscriber("subscriber-one"),
      command: {
        kind: "acceptMatch",
        pairAlias: "pair",
        proposalAlias: "proposal"
      }
    },
    {
      atMs: 7_000,
      actor: persona.subscriber("subscriber-two"),
      command: {
        kind: "acceptMatch",
        pairAlias: "pair",
        proposalAlias: "proposal"
      }
    },
    {
      atMs: 8_000,
      actor: persona.operator("operator-lock"),
      command: {
        kind: "executeMatch",
        pairAlias: "pair",
        proposalAlias: "proposal",
        executionAlias: "execution",
        settlementAlias: "settlement"
      }
    }
  ];
};

const buildIdempotentRetrySteps = (): readonly ScenarioStep[] => [
  {
    atMs: 0,
    actor: persona.operator("operator-retry"),
    command: {
      kind: "createPair",
      alias: "pair",
      pairId: "pair-retry",
      operatorId: "operator-retry",
      mode: "ATSPair",
      dealerIds: ["dealer-alpha", "dealer-beta"],
      jurisdiction: "US",
      rulebookSummary: "idempotent retries",
      rulebookVersion: "v3"
    }
  },
  {
    atMs: 1_000,
    actor: persona.operator("operator-retry"),
    command: {
      kind: "grantAccess",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: "subscriber-one"
    }
  },
  {
    atMs: 2_000,
    actor: persona.operator("operator-retry"),
    command: {
      kind: "grantAccess",
      pairAlias: "pair",
      role: "subscriber",
      subjectId: "subscriber-two"
    }
  },
  {
    atMs: 3_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "openRFQ",
      alias: "rfq",
      pairAlias: "pair",
      instrumentId: "CUSIP-RETRY",
      side: "sell",
      quantity: 8,
      responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
      invitedDealerIds: ["dealer-alpha"]
    }
  },
  {
    atMs: 4_000,
    actor: persona.dealer("dealer-alpha"),
    command: {
      kind: "submitQuote",
      alias: "quote",
      pairAlias: "pair",
      rfqAlias: "rfq",
      price: 100,
      quantity: 8,
      expiresAt: "2026-04-02T00:20:00.000Z"
    }
  },
  {
    atMs: 5_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "rejectQuotes",
      pairAlias: "pair",
      rfqAlias: "rfq",
      reason: "retry"
    }
  },
  {
    atMs: 6_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "rejectQuotes",
      pairAlias: "pair",
      rfqAlias: "rfq",
      reason: "retry"
    }
  },
  {
    atMs: 7_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "submitDarkOrder",
      alias: "duplicate-one",
      pairAlias: "pair",
      clientOrderId: "duplicate-dark-order",
      instrumentId: "CUSIP-DARK-RETRY",
      side: "buy",
      quantity: 10,
      limitPrice: 101,
      expiresAt: "2026-04-02T00:30:00.000Z"
    }
  },
  {
    atMs: 8_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "submitDarkOrder",
      alias: "duplicate-two",
      pairAlias: "pair",
      clientOrderId: "duplicate-dark-order",
      instrumentId: "CUSIP-DARK-RETRY",
      side: "buy",
      quantity: 10,
      limitPrice: 101,
      expiresAt: "2026-04-02T00:30:00.000Z"
    }
  },
  {
    atMs: 9_000,
    actor: persona.subscriber("subscriber-two"),
    command: {
      kind: "submitDarkOrder",
      alias: "sell-order",
      pairAlias: "pair",
      clientOrderId: "retry-sell",
      instrumentId: "CUSIP-DARK-RETRY",
      side: "sell",
      quantity: 10,
      limitPrice: 100,
      expiresAt: "2026-04-02T00:30:00.000Z"
    }
  },
  {
    atMs: 10_000,
    actor: persona.operator("operator-retry"),
    command: {
      kind: "generateMatchProposal",
      pairAlias: "pair",
      proposalAlias: "proposal",
      buyOrderAlias: "duplicate-one",
      sellOrderAlias: "sell-order",
      buyLockAlias: "buy-lock",
      sellLockAlias: "sell-lock",
      expiresAt: "2026-04-02T00:10:00.000Z"
    }
  },
  {
    atMs: 11_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "acceptMatch",
      pairAlias: "pair",
      proposalAlias: "proposal"
    }
  },
  {
    atMs: 12_000,
    actor: persona.subscriber("subscriber-one"),
    command: {
      kind: "acceptMatch",
      pairAlias: "pair",
      proposalAlias: "proposal"
    }
  },
  {
    atMs: 13_000,
    actor: persona.subscriber("subscriber-two"),
    command: {
      kind: "acceptMatch",
      pairAlias: "pair",
      proposalAlias: "proposal"
    }
  },
  {
    atMs: 14_000,
    actor: persona.operator("operator-retry"),
    command: {
      kind: "executeMatch",
      pairAlias: "pair",
      proposalAlias: "proposal",
      executionAlias: "execution",
      settlementAlias: "settlement"
    }
  },
  {
    atMs: 15_000,
    actor: persona.operator("operator-retry"),
    command: {
      kind: "executeMatch",
      pairAlias: "pair",
      proposalAlias: "proposal",
      executionAlias: "execution-repeat",
      settlementAlias: "settlement-repeat"
    }
  }
];

const evaluateUnauthorizedVisibility = async (
  run: ScenarioRun
): Promise<SimulationInvariantResult> => {
  const pairId = resolveOutputId(run.result.replay, "pair", "pair");
  const alphaHistory = await run.environment.application.getDealerInvitationHistory(
    pairId,
    "dealer-alpha",
    "dealer-alpha"
  );
  const oversight = await run.environment.application.getOperatorOversightView(
    pairId,
    "operator-privacy"
  );
  const darkSubscriberState = await run.environment.application.getDarkSubscriberState(
    pairId,
    "subscriber-alpha",
    "subscriber-alpha"
  );
  const dealerLeakBlocked = await rejectedWithCode(
    run.environment.application.getDealerInvitationHistory(pairId, "dealer-alpha", "dealer-beta"),
    "MISSING_ENTITLEMENT"
  );
  const darkLeakBlocked = await rejectedWithCode(
    run.environment.application.getDarkSubscriberState(
      pairId,
      "subscriber-alpha",
      "subscriber-beta"
    ),
    "MISSING_ENTITLEMENT"
  );

  if (
    alphaHistory === null ||
    oversight === null ||
    darkSubscriberState === null ||
    !alphaHistory.quotes.every((quote) => quote.dealerId === "dealer-alpha") ||
    oversight.quoteLadders.length !== 0 ||
    !oversight.quotes.every((quote) => quote.status === "accepted" || quote.price === null) ||
    !darkSubscriberState.orders.every((order) => order.subscriberId === "subscriber-alpha") ||
    !dealerLeakBlocked ||
    !darkLeakBlocked
  ) {
    return fail(
      "unauthorized_visibility",
      "Dealer and subscriber scoped views must redact unrelated quote and dark-order state."
    );
  }

  return pass(
    "unauthorized_visibility",
    "Dealer, subscriber, blinded-operator, and dark subscriber views stayed scoped."
  );
};

const evaluateNoDoubleExecution = async (run: ScenarioRun): Promise<SimulationInvariantResult> => {
  const executionIds = run.result.snapshot.executions.map((execution) => execution.executionId);
  const uniqueExecutionIds = new Set(executionIds);
  const darkExecutionId = resolveOutputId(run.result.replay, "dark-execution", "execution");
  const repeatedExecutionId = resolveOutputId(
    run.result.replay,
    "dark-execution-repeat",
    "execution"
  );
  const rfqExecutions = run.result.snapshot.executions.filter(
    (execution) => execution.quoteId !== undefined
  );
  const darkExecutions = run.result.snapshot.executions.filter(
    (execution) => execution.matchProposalId !== undefined
  );

  if (
    executionIds.length !== uniqueExecutionIds.size ||
    rfqExecutions.length !== 1 ||
    darkExecutions.length !== 1 ||
    darkExecutionId !== repeatedExecutionId
  ) {
    return fail(
      "no_double_execution",
      "RFQ acceptance and dark execution should yield one durable execution each."
    );
  }

  return pass(
    "no_double_execution",
    "Repeated accept and execute attempts did not create duplicate executions."
  );
};

const evaluateNoLateAccept = async (run: ScenarioRun): Promise<SimulationInvariantResult> => {
  const quote = run.result.snapshot.quotes.find(
    (candidate) => candidate.quoteId === resolveOutputId(run.result.replay, "quote", "quote")
  );
  const proposal = run.result.snapshot.matchProposals.find(
    (candidate) =>
      candidate.proposalId === resolveOutputId(run.result.replay, "proposal", "proposal")
  );
  const executionIds = new Set(
    run.result.snapshot.executions.map((execution) => execution.executionId)
  );

  if (
    quote?.status !== "expired" ||
    proposal?.status !== "expired" ||
    executionIds.has("late-execution") ||
    executionIds.has("late-settlement")
  ) {
    return fail(
      "no_late_accept_after_expiry",
      "Expired quotes and expired proposals must not move into acceptance or execution."
    );
  }

  return pass(
    "no_late_accept_after_expiry",
    "Acceptance attempts after expiry left quote and proposal state terminal and non-executed."
  );
};

const evaluateNoPausedMatch = async (run: ScenarioRun): Promise<SimulationInvariantResult> => {
  const pair = run.result.snapshot.pairs.find(
    (candidate) => candidate.pairId === resolveOutputId(run.result.replay, "pair", "pair")
  );

  if (pair?.pauseState.state !== "paused" || run.result.snapshot.matchProposals.length !== 0) {
    return fail(
      "no_match_on_paused_pair",
      "Paused pairs must block proposal creation and keep dark orders unmatched."
    );
  }

  return pass(
    "no_match_on_paused_pair",
    "Paused ATSPair state blocked dark-cross proposal generation."
  );
};

const evaluateDeterministicReplay = async (
  run: ScenarioRun
): Promise<SimulationInvariantResult> => {
  const replayed = await replayScenario(run.result.replay);

  if (
    JSON.stringify(replayed.snapshot) !== JSON.stringify(run.result.snapshot) ||
    JSON.stringify(replayed.audits) !== JSON.stringify(run.result.audits) ||
    JSON.stringify(replayed.replay.outputs) !== JSON.stringify(run.result.replay.outputs)
  ) {
    return fail(
      "deterministic_replay_from_seed",
      "Replaying the same seed did not reproduce the same outputs and ledger state."
    );
  }

  return pass(
    "deterministic_replay_from_seed",
    "Seed replay reproduced identical outputs, audits, and ledger state."
  );
};

const evaluateLockRelease = async (
  run: ScenarioRun,
  seed: number
): Promise<SimulationInvariantResult> => {
  const branch = seed % 3;
  const proposal = run.result.snapshot.matchProposals.find(
    (candidate) =>
      candidate.proposalId === resolveOutputId(run.result.replay, "proposal", "proposal")
  );
  const buyLockId = resolveOutputId(run.result.replay, "buy-lock", "lock");
  const sellLockId = resolveOutputId(run.result.replay, "sell-lock", "lock");
  const locks = run.result.snapshot.orderLocks.filter(
    (lock) => lock.lockId === buyLockId || lock.lockId === sellLockId
  );
  const expected =
    branch === 0
      ? {
          proposalStatus: "rejected",
          lockStatus: "released",
          reason: "rejected"
        }
      : branch === 1
        ? {
            proposalStatus: "expired",
            lockStatus: "expired",
            reason: "expired"
          }
        : {
            proposalStatus: "executed",
            lockStatus: "released",
            reason: "executed"
          };

  if (
    proposal?.status !== expected.proposalStatus ||
    !locks.every(
      (lock) => lock.status === expected.lockStatus && lock.releaseReason === expected.reason
    )
  ) {
    return fail(
      "lock_release_correctness",
      "Order locks must release with the correct terminal reason for reject, expiry, or execution."
    );
  }

  return pass(
    "lock_release_correctness",
    `Lock release reason ${expected.reason} matched the proposal terminal state ${expected.proposalStatus}.`
  );
};

const evaluateIdempotentRetries = async (run: ScenarioRun): Promise<SimulationInvariantResult> => {
  const firstOrderId = resolveOutputId(run.result.replay, "duplicate-one", "order");
  const secondOrderId = resolveOutputId(run.result.replay, "duplicate-two", "order");
  const firstExecutionId = resolveOutputId(run.result.replay, "execution", "execution");
  const repeatedExecutionId = resolveOutputId(run.result.replay, "execution-repeat", "execution");
  const duplicateOrders = run.result.snapshot.darkOrders.filter(
    (order) => order.clientOrderId === "duplicate-dark-order"
  );
  const rfq = run.result.snapshot.rfqs.find(
    (candidate) => candidate.rfqId === resolveOutputId(run.result.replay, "rfq", "rfq")
  );

  if (
    firstOrderId !== secondOrderId ||
    firstExecutionId !== repeatedExecutionId ||
    duplicateOrders.length !== 1 ||
    rfq?.status !== "rejected"
  ) {
    return fail(
      "idempotent_retries",
      "Duplicate submissions and repeat workflow commands must converge on one stable outcome."
    );
  }

  return pass(
    "idempotent_retries",
    "Duplicate dark orders and repeated reject or execute commands converged on stable ids."
  );
};

export const buildSimulationCampaignSteps = (
  campaign: SimulationCampaignName,
  seed: number
): readonly ScenarioStep[] => {
  switch (campaign) {
    case "unauthorized_visibility":
      return buildUnauthorizedVisibilitySteps(seed);
    case "no_double_execution":
      return buildNoDoubleExecutionSteps();
    case "no_late_accept_after_expiry":
      return buildLateAcceptSteps();
    case "no_match_on_paused_pair":
      return buildPausedPairSteps();
    case "deterministic_replay_from_seed":
      return buildDeterministicReplaySteps(seed);
    case "lock_release_correctness":
      return buildLockReleaseSteps(seed);
    case "idempotent_retries":
      return buildIdempotentRetrySteps();
  }
};

const evaluateCampaign = async (
  campaign: SimulationCampaignName,
  seed: number,
  run: ScenarioRun
): Promise<SimulationInvariantResult> => {
  switch (campaign) {
    case "unauthorized_visibility":
      return evaluateUnauthorizedVisibility(run);
    case "no_double_execution":
      return evaluateNoDoubleExecution(run);
    case "no_late_accept_after_expiry":
      return evaluateNoLateAccept(run);
    case "no_match_on_paused_pair":
      return evaluateNoPausedMatch(run);
    case "deterministic_replay_from_seed":
      return evaluateDeterministicReplay(run);
    case "lock_release_correctness":
      return evaluateLockRelease(run, seed);
    case "idempotent_retries":
      return evaluateIdempotentRetries(run);
  }
};

export const evaluateSimulationRun = async (
  campaign: SimulationCampaignName,
  seed: number,
  run: ScenarioRun
): Promise<SimulationInvariantResult> => evaluateCampaign(campaign, seed, run);

export const runSimulationCampaign = async (input: {
  campaign: SimulationCampaignName;
  seed: number;
  startAt?: Date | string;
}): Promise<SimulationCampaignResult> => {
  const run = await runScenarioWithEnvironment({
    seed: input.seed,
    ...(input.startAt !== undefined ? { startAt: input.startAt } : {}),
    steps: buildSimulationCampaignSteps(input.campaign, input.seed)
  });
  const invariant = await evaluateCampaign(input.campaign, input.seed, run);

  return {
    campaign: input.campaign,
    invariants: [invariant],
    result: run.result
  };
};

export const runSimulationSweep = async (input: {
  campaigns?: readonly SimulationCampaignName[];
  runner?: (input: {
    campaign: SimulationCampaignName;
    seed: number;
  }) => Promise<SimulationCampaignResult>;
  seedEnd: number;
  seedStart?: number;
}): Promise<SimulationSweepResult> => {
  const campaigns = input.campaigns ?? simulationCampaignNames;
  const runner = input.runner ?? runSimulationCampaign;
  const seedStart = input.seedStart ?? 1;
  const failures: SimulationSweepFailure[] = [];
  let passed = 0;
  let total = 0;

  for (const campaign of campaigns) {
    for (let seed = seedStart; seed <= input.seedEnd; seed += 1) {
      total += 1;

      try {
        const result = await runner({
          campaign,
          seed
        });
        const failure = result.invariants.find((invariant) => !invariant.passed);

        if (failure === undefined) {
          passed += 1;
          continue;
        }

        failures.push({
          campaign,
          seed,
          detail: failure.detail,
          replay: result.result.replay,
          replayText: serializeReplayFile(result.result.replay)
        });
      } catch (error) {
        failures.push({
          campaign,
          seed,
          detail: error instanceof Error ? error.message : "Unknown simulation failure"
        });
      }
    }
  }

  return {
    failures,
    passed,
    total
  };
};
