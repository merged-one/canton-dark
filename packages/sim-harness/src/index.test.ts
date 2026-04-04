import { describe, expect, it } from "vitest";
import { createMemoryVenueEnvironment } from "@canton-dark/adapters-memory";

import {
  buildSimulationCampaignSteps,
  createDeterministicScheduler,
  createPhase1DemoSteps,
  createPhase2DemoSteps,
  createPhase3DemoSteps,
  createScenarioRecorder,
  evaluateSimulationRun,
  findDemoOutputId,
  createSeededRandom,
  parseReplayFile,
  persona,
  phase1DemoDefaults,
  phase2DemoDefaults,
  phase3DemoDefaults,
  replayScenario,
  runPhase1DemoScenario,
  runPhase3DemoScenario,
  runScenario,
  runScenarioWithEnvironment,
  runSimulationCampaign,
  runSimulationSweep,
  seedPhase1DemoEnvironment,
  seedPhase2DemoEnvironment,
  seedPhase3DemoEnvironment,
  serializeReplayFile
} from "./index";

describe("sim-harness", () => {
  it("provides deterministic random numbers, scheduler ordering, and persona helpers", async () => {
    const random = createSeededRandom(77);
    const times: string[] = [];
    const clock = {
      current: new Date("2026-04-02T00:00:00.000Z"),
      now() {
        return new Date(this.current);
      },
      advanceBy(milliseconds: number) {
        this.current = new Date(this.current.getTime() + milliseconds);
      }
    };
    const scheduler = createDeterministicScheduler(clock);

    scheduler.schedule(2_000, "second", () => {
      times.push(`second:${clock.now().toISOString()}`);
    });
    scheduler.schedule(1_000, "first", () => {
      times.push(`first:${clock.now().toISOString()}`);
    });
    scheduler.schedule(2_000, "third", () => {
      times.push(`third:${clock.now().toISOString()}`);
    });

    expect(random.next()).toBe(0.4256013557314873);
    expect(random.nextInt(10)).toBe(0);
    expect(random.pick(["alpha", "beta", "gamma"])).toBe("gamma");
    expect(await scheduler.runAll()).toEqual([
      "first@2026-04-02T00:00:01.000Z",
      "second@2026-04-02T00:00:02.000Z",
      "third@2026-04-02T00:00:02.000Z"
    ]);
    expect(times).toEqual([
      "first:2026-04-02T00:00:01.000Z",
      "second:2026-04-02T00:00:02.000Z",
      "third:2026-04-02T00:00:02.000Z"
    ]);
    expect(persona.settlementDelegate("settler-1", "Settler")).toEqual({
      role: "settlement_delegate",
      participantId: "settler-1",
      displayName: "Settler"
    });
    expect(persona.auditor("auditor-1")).toEqual({
      role: "auditor",
      participantId: "auditor-1",
      displayName: "auditor-1"
    });
  });

  it("records, serializes, and replays deterministic scenarios", async () => {
    const recorder = createScenarioRecorder(9, "2026-04-02T00:00:00.000Z");

    recorder.recordStep({
      atMs: 0,
      actor: persona.operator("operator-1"),
      command: {
        kind: "createPair",
        alias: "pair",
        operatorId: "operator-1",
        dealerId: "dealer-alpha",
        jurisdiction: "US",
        rulebookVersion: "v1",
        rulebookSummary: "initial"
      }
    });
    recorder.recordOutput({
      alias: "pair",
      type: "pair",
      id: "pair-1"
    });

    const replay = recorder.toReplayFile();
    const replayed = await replayScenario(replay);

    expect(parseReplayFile(serializeReplayFile(replay))).toEqual(replay);
    expect(replayed.replayCommand).toBe("pnpm test:property:replay --seed 9");
    expect(replayed.replay.outputs).toContainEqual({
      alias: "pair",
      type: "pair",
      id: "pair-000009-000001"
    });
    expect(replayed.snapshot.pairs).toHaveLength(1);
    expect(replayed.events).toHaveLength(1);
    expect(replayed.logs.map((entry) => entry.message)).toEqual([
      "scenario.step.started",
      "scenario.step.succeeded"
    ]);
  });

  it("runs the phase 1 demo scenario through the memory-backed application", async () => {
    const result = await runPhase1DemoScenario(424242);
    const replayed = await runScenario({ seed: 424242, steps: result.replay.steps });

    expect(result.replayCommand).toBe("pnpm test:property:replay --seed 424242");
    expect(result.replay.format).toBe("canton-dark-sim.v2");
    expect(result.replay.outputs.map((output) => output.type)).toEqual([
      "pair",
      "rfq",
      "quote",
      "execution",
      "settlement"
    ]);
    expect(result.snapshot.executions).toHaveLength(1);
    expect(result.snapshot.settlements[0]?.status).toBe("affirmed");
    expect(result.events).toHaveLength(6);
    expect(replayed.snapshot).toEqual(result.snapshot);
  });

  it("supports replay steps that use concrete ids instead of aliases", async () => {
    const result = await runScenario({
      seed: 9,
      steps: [
        {
          atMs: 0,
          actor: persona.operator("operator-1"),
          command: {
            kind: "create_pair",
            alias: "pair",
            operatorId: "operator-1",
            dealerId: "dealer-alpha",
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
            pairAlias: "pair-000009-000001",
            role: "subscriber",
            subjectId: "subscriber-1"
          }
        },
        {
          atMs: 2_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "open_rfq",
            alias: "rfq",
            pairAlias: "pair-000009-000001",
            instrumentId: "CUSIP-1",
            side: "buy",
            quantity: 5
          }
        },
        {
          atMs: 3_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "submit_quote",
            alias: "quote",
            pairAlias: "pair-000009-000001",
            rfqAlias: "rfq-000009-000001",
            price: 99,
            quantity: 5,
            expiresAt: "2026-04-02T00:20:00.000Z"
          }
        },
        {
          atMs: 4_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "accept_quote",
            pairAlias: "pair-000009-000001",
            rfqAlias: "rfq-000009-000001",
            quoteAlias: "quote-000009-000001",
            executionAlias: "execution",
            settlementAlias: "settlement"
          }
        },
        {
          atMs: 5_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "markSettlementProgression",
            pairAlias: "pair-000009-000001",
            settlementAlias: "settlement-000009-000001",
            status: "affirmed"
          }
        }
      ]
    });

    expect(result.replay.outputs.map((output) => output.type)).toEqual([
      "pair",
      "rfq",
      "quote",
      "execution",
      "settlement"
    ]);
    expect(result.snapshot.settlements[0]?.status).toBe("affirmed");
  });

  it("builds deterministic phase 1, phase 2, and phase 3 demo metadata", async () => {
    const environment = createMemoryVenueEnvironment();

    expect(createPhase1DemoSteps("empty")).toEqual([]);
    expect(createPhase2DemoSteps()).toHaveLength(2);
    expect(createPhase3DemoSteps()).toHaveLength(6);

    const phase1 = await seedPhase1DemoEnvironment(environment, {
      mode: "phase1-ready",
      seed: 12
    });

    expect(phase1.mode).toBe("phase1-ready");
    expect(phase1.pairId).toBe(phase1DemoDefaults.pairId);
    expect(phase1.operatorId).toBe(phase1DemoDefaults.operatorId);
    expect(phase1.dealerId).toBe(phase1DemoDefaults.dealerId);
    expect(phase1.dealerIds).toEqual(phase1DemoDefaults.dealerIds);
    expect(phase1.subscriberId).toBe(phase1DemoDefaults.subscriberId);
    expect(phase1.replay.outputs).toContainEqual({
      alias: "pair",
      id: phase1DemoDefaults.pairId,
      type: "pair"
    });

    const phase2Environment = createMemoryVenueEnvironment();
    const phase2 = await seedPhase2DemoEnvironment(phase2Environment, {
      mode: "phase2-ready",
      seed: 34
    });

    expect(phase2.mode).toBe("phase2-ready");
    expect(phase2.pairId).toBe(phase2DemoDefaults.pairId);
    expect(phase2.operatorId).toBe(phase2DemoDefaults.operatorId);
    expect(phase2.dealerId).toBe(phase2DemoDefaults.dealerId);
    expect(phase2.dealerIds).toEqual(phase2DemoDefaults.dealerIds);
    expect(phase2.subscriberId).toBe(phase2DemoDefaults.subscriberId);

    const phase3Environment = createMemoryVenueEnvironment();
    const phase3 = await seedPhase3DemoEnvironment(phase3Environment, {
      mode: "phase3-ready",
      seed: 55
    });

    expect(phase3.mode).toBe("phase3-ready");
    expect(phase3.pairId).toBe(phase3DemoDefaults.pairId);
    expect(phase3.secondarySubscriberId).toBe(phase3DemoDefaults.secondarySubscriberId);
    expect(phase3.buyOrderId).toContain("dark-order-");
    expect(phase3.sellOrderId).toContain("dark-order-");
    expect(phase3.proposalId).toContain("match-proposal-");
  });

  it("runs the phase 3 demo scenario and exposes pending proposal state", async () => {
    const result = await runPhase3DemoScenario(77);

    expect(result.replay.outputs.map((output) => output.type)).toEqual([
      "pair",
      "order",
      "order",
      "proposal",
      "lock",
      "lock"
    ]);
    expect(result.snapshot.matchProposals[0]?.status).toBe("pending");
    expect(result.snapshot.orderLocks.every((lock) => lock.status === "active")).toBe(true);
  });

  it("runs every simulation campaign and sweep with deterministic results", async () => {
    const privacy = await runSimulationCampaign({
      campaign: "unauthorized_visibility",
      seed: 101
    });
    const noDouble = await runSimulationCampaign({
      campaign: "no_double_execution",
      seed: 202
    });
    const late = await runSimulationCampaign({
      campaign: "no_late_accept_after_expiry",
      seed: 303
    });
    const paused = await runSimulationCampaign({
      campaign: "no_match_on_paused_pair",
      seed: 404
    });
    const replay = await runSimulationCampaign({
      campaign: "deterministic_replay_from_seed",
      seed: 505
    });
    const rejectedLocks = await runSimulationCampaign({
      campaign: "lock_release_correctness",
      seed: 600
    });
    const expiredLocks = await runSimulationCampaign({
      campaign: "lock_release_correctness",
      seed: 601
    });
    const executedLocks = await runSimulationCampaign({
      campaign: "lock_release_correctness",
      seed: 602
    });
    const retries = await runSimulationCampaign({
      campaign: "idempotent_retries",
      seed: 707
    });
    const sweep = await runSimulationSweep({
      campaigns: [
        "unauthorized_visibility",
        "deterministic_replay_from_seed",
        "idempotent_retries"
      ],
      seedEnd: 2
    });

    expect(privacy.invariants[0]?.passed).toBe(true);
    expect(noDouble.invariants[0]?.passed).toBe(true);
    expect(late.invariants[0]?.passed).toBe(true);
    expect(paused.invariants[0]?.passed).toBe(true);
    expect(replay.invariants[0]?.passed).toBe(true);
    expect(rejectedLocks.invariants[0]?.passed).toBe(true);
    expect(expiredLocks.invariants[0]?.passed).toBe(true);
    expect(executedLocks.invariants[0]?.passed).toBe(true);
    expect(retries.invariants[0]?.passed).toBe(true);
    expect(sweep.failures).toEqual([]);
    expect(sweep.passed).toBe(sweep.total);
  });

  it("covers remaining command variants and expected-error handling branches", async () => {
    const result = await runScenario({
      seed: 88,
      steps: [
        {
          atMs: 0,
          actor: persona.operator("operator-ats"),
          note: "seed pair",
          command: {
            kind: "createPair",
            alias: "pair",
            pairId: "pair-ats-88",
            operatorId: "operator-ats",
            mode: "ATSPair",
            dealerIds: ["dealer-alpha", "dealer-beta"],
            operatorOversightRole: "blinded",
            inviteRevisionPolicy: "before_first_response",
            jurisdiction: "US",
            rulebookVersion: "v2",
            rulebookSummary: "coverage"
          }
        },
        {
          atMs: 1_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "grantAccess",
            pairAlias: "pair",
            role: "subscriber",
            subjectId: "subscriber-1"
          }
        },
        {
          atMs: 2_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "grantAccess",
            pairAlias: "pair",
            role: "subscriber",
            subjectId: "subscriber-2"
          }
        },
        {
          atMs: 3_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "pausePair",
            pairAlias: "pair",
            reason: "halt"
          }
        },
        {
          atMs: 4_000,
          actor: persona.subscriber("subscriber-1"),
          note: "paused error",
          command: {
            kind: "openRFQ",
            alias: "blocked-rfq",
            pairAlias: "pair",
            instrumentId: "CUSIP-BLOCKED",
            responseWindowClosesAt: "2026-04-02T00:10:00.000Z",
            side: "buy",
            quantity: 5
          },
          expectErrorCode: "PAIR_IS_PAUSED"
        },
        {
          atMs: 5_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "unpausePair",
            pairAlias: "pair"
          }
        },
        {
          atMs: 6_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "grantAccess",
            pairAlias: "pair",
            role: "dealer",
            subjectId: "dealer-alpha"
          }
        },
        {
          atMs: 7_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "grantAccess",
            pairAlias: "pair",
            role: "dealer",
            subjectId: "dealer-beta"
          }
        },
        {
          atMs: 8_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "openRFQ",
            alias: "rfq",
            pairAlias: "pair",
            instrumentId: "CUSIP-88",
            invitedDealerIds: ["dealer-alpha", "dealer-beta"],
            responseWindowClosesAt: "2026-04-02T00:20:00.000Z",
            side: "buy",
            quantity: 25
          }
        },
        {
          atMs: 16_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "submitQuote",
            alias: "quote",
            pairAlias: "pair",
            rfqAlias: "rfq",
            price: 99.5,
            quantity: 25,
            expiresAt: "2026-04-02T00:20:00.000Z"
          }
        },
        {
          atMs: 17_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "reviseQuote",
            alias: "quote-revised",
            pairAlias: "pair",
            quoteAlias: "quote",
            price: 99.25,
            quantity: 25,
            expiresAt: "2026-04-02T00:25:00.000Z"
          }
        },
        {
          atMs: 18_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "withdrawQuote",
            pairAlias: "pair",
            quoteAlias: "quote-revised",
            reason: "manual pullback"
          }
        },
        {
          atMs: 19_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "rejectQuotes",
            pairAlias: "pair",
            rfqAlias: "rfq",
            reason: "no fill"
          }
        },
        {
          atMs: 20_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "submitDarkOrder",
            alias: "buy-order",
            pairAlias: "pair",
            clientOrderId: "buy-88",
            instrumentId: "CUSIP-DARK-88",
            side: "buy",
            quantity: 12,
            limitPrice: 101,
            expiresAt: "2026-04-02T00:30:00.000Z"
          }
        },
        {
          atMs: 21_000,
          actor: persona.subscriber("subscriber-2"),
          command: {
            kind: "submitDarkOrder",
            alias: "sell-order",
            pairAlias: "pair",
            clientOrderId: "sell-88",
            instrumentId: "CUSIP-DARK-88",
            side: "sell",
            quantity: 12,
            limitPrice: 100,
            expiresAt: "2026-04-02T00:30:00.000Z"
          }
        },
        {
          atMs: 22_000,
          actor: persona.operator("operator-ats"),
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
        },
        {
          atMs: 23_000,
          actor: persona.subscriber("subscriber-2"),
          command: {
            kind: "rejectMatch",
            pairAlias: "pair",
            proposalAlias: "proposal",
            reason: "cross rejected"
          }
        },
        {
          atMs: 24_000,
          actor: persona.operator("operator-ats"),
          command: {
            kind: "expireLocks",
            pairAlias: "pair",
            proposalAlias: "proposal"
          }
        },
        {
          atMs: 25_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "submitDarkOrder",
            alias: "cancel-order",
            pairAlias: "pair",
            clientOrderId: "cancel-88",
            instrumentId: "CUSIP-DARK-88",
            side: "buy",
            quantity: 5,
            limitPrice: 98
          }
        },
        {
          atMs: 26_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "cancelDarkOrder",
            pairAlias: "pair",
            orderAlias: "cancel-order"
          }
        }
      ]
    });

    expect(result.events.filter((event) => event.status === "expected_error")).toHaveLength(1);
    expect(result.snapshot.rfqs[0]?.status).toBe("rejected");
    expect(result.snapshot.matchProposals[0]?.status).toBe("rejected");
    expect(result.snapshot.orderLocks.every((lock) => lock.releaseReason === "rejected")).toBe(
      true
    );
    expect(
      result.snapshot.darkOrders.find((order) => order.clientOrderId === "cancel-88")?.status
    ).toBe("cancelled");
  });

  it("covers simulation failure diagnostics and replay lookup errors", async () => {
    await expect(
      runScenario({
        seed: 99,
        steps: [
          {
            atMs: 0,
            actor: persona.operator("operator-1"),
            command: {
              kind: "createPair",
              alias: "pair",
              operatorId: "operator-1",
              dealerId: "dealer-alpha",
              jurisdiction: "US",
              rulebookVersion: "v1",
              rulebookSummary: "missing quote"
            }
          },
          {
            atMs: 1_000,
            actor: persona.operator("operator-1"),
            command: {
              kind: "grantAccess",
              pairAlias: "pair",
              role: "subscriber",
              subjectId: "subscriber-1"
            }
          },
          {
            atMs: 2_000,
            actor: persona.subscriber("subscriber-1"),
            command: {
              kind: "acceptQuote",
              pairAlias: "pair",
              quoteAlias: "quote-missing",
              executionAlias: "execution",
              settlementAlias: "settlement"
            }
          }
        ]
      })
    ).rejects.toThrow("Quote quote-missing was not found.");

    await expect(
      runScenario({
        seed: 100,
        steps: [
          {
            atMs: 0,
            actor: persona.operator("operator-1"),
            command: {
              kind: "createPair",
              alias: "pair",
              operatorId: "operator-1",
              dealerId: "dealer-alpha",
              jurisdiction: "US",
              rulebookVersion: "v1",
              rulebookSummary: "unexpected success"
            },
            expectErrorCode: "PAIR_IS_PAUSED"
          }
        ]
      })
    ).rejects.toThrow("Expected PAIR_IS_PAUSED from createPair but the step succeeded.");

    const phase3 = await runPhase3DemoScenario(123);
    expect(() => findDemoOutputId(phase3.replay, "missing-output", "proposal")).toThrow(
      "Scenario output missing-output was not recorded."
    );
  });

  it("covers omitted optional command arguments and auto-selected proposal generation", async () => {
    const result = await runScenario({
      seed: 144,
      steps: [
        {
          atMs: 0,
          actor: persona.operator("operator-1"),
          command: {
            kind: "createPair",
            alias: "pair",
            operatorId: "operator-1",
            dealerId: "dealer-alpha",
            jurisdiction: "US",
            rulebookVersion: "v1",
            rulebookSummary: "optional branches"
          }
        },
        {
          atMs: 1_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "grantAccess",
            pairAlias: "pair",
            role: "subscriber",
            subjectId: "subscriber-1"
          }
        },
        {
          atMs: 2_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "openRFQ",
            alias: "rfq-one",
            pairAlias: "pair",
            instrumentId: "CUSIP-ONE",
            side: "buy",
            quantity: 10
          }
        },
        {
          atMs: 3_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "submitQuote",
            alias: "quote-one",
            pairAlias: "pair",
            rfqAlias: "rfq-one",
            price: 99,
            quantity: 10,
            expiresAt: "2026-04-02T00:20:00.000Z"
          }
        },
        {
          atMs: 4_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "withdrawQuote",
            pairAlias: "pair",
            quoteAlias: "quote-one"
          }
        },
        {
          atMs: 5_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "openRFQ",
            alias: "rfq-two",
            pairAlias: "pair",
            instrumentId: "CUSIP-TWO",
            side: "sell",
            quantity: 8
          }
        },
        {
          atMs: 6_000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "submitQuote",
            alias: "quote-two",
            pairAlias: "pair",
            rfqAlias: "rfq-two",
            price: 101,
            quantity: 8,
            expiresAt: "2026-04-02T00:25:00.000Z"
          }
        },
        {
          atMs: 7_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "rejectQuotes",
            pairAlias: "pair",
            rfqAlias: "rfq-two"
          }
        },
        {
          atMs: 8_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "createPair",
            alias: "dark-pair",
            pairId: "pair-dark-optional",
            operatorId: "operator-1",
            mode: "ATSPair",
            dealerIds: ["dealer-alpha", "dealer-beta"],
            operatorOversightRole: "blinded",
            inviteRevisionPolicy: "before_first_response",
            jurisdiction: "US",
            rulebookVersion: "v2",
            rulebookSummary: "dark optional branches"
          }
        },
        {
          atMs: 9_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "grantAccess",
            pairAlias: "dark-pair",
            role: "subscriber",
            subjectId: "subscriber-1"
          }
        },
        {
          atMs: 10_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "grantAccess",
            pairAlias: "dark-pair",
            role: "subscriber",
            subjectId: "subscriber-2"
          }
        },
        {
          atMs: 11_000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "submitDarkOrder",
            alias: "buy-order",
            pairAlias: "dark-pair",
            clientOrderId: "auto-buy",
            instrumentId: "CUSIP-DARK-AUTO",
            side: "buy",
            quantity: 5,
            limitPrice: 101
          }
        },
        {
          atMs: 12_000,
          actor: persona.subscriber("subscriber-2"),
          command: {
            kind: "submitDarkOrder",
            alias: "sell-order",
            pairAlias: "dark-pair",
            clientOrderId: "auto-sell",
            instrumentId: "CUSIP-DARK-AUTO",
            side: "sell",
            quantity: 5,
            limitPrice: 100
          }
        },
        {
          atMs: 13_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "generateMatchProposal",
            pairAlias: "dark-pair",
            proposalAlias: "proposal",
            buyLockAlias: "buy-lock",
            sellLockAlias: "sell-lock"
          }
        },
        {
          atMs: 14_000,
          actor: persona.subscriber("subscriber-2"),
          command: {
            kind: "rejectMatch",
            pairAlias: "dark-pair",
            proposalAlias: "proposal"
          }
        }
      ]
    });

    expect(result.snapshot.matchProposals[0]?.status).toBe("rejected");
    expect(result.snapshot.orderLocks.every((lock) => lock.releaseReason === "rejected")).toBe(
      true
    );
  });

  it("covers grant-access metadata and non-Error expected failures", async () => {
    const environment = createMemoryVenueEnvironment();
    const originalPausePair = environment.application.pausePair;
    environment.application.pausePair = async (...args) => {
      if (args[0].state === "paused") {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercises non-Error rejection diagnostics.
        return Promise.reject({
          code: "PAIR_IS_PAUSED"
        });
      }

      return originalPausePair(...args);
    };

    const run = await runScenarioWithEnvironment({
      environment,
      seed: 155,
      steps: [
        {
          atMs: 0,
          actor: persona.operator("operator-1"),
          command: {
            kind: "createPair",
            alias: "pair",
            operatorId: "operator-1",
            dealerId: "dealer-alpha",
            jurisdiction: "US",
            rulebookVersion: "v1",
            rulebookSummary: "metadata"
          }
        },
        {
          atMs: 1_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "grantAccess",
            pairAlias: "pair",
            role: "subscriber",
            subjectId: "subscriber-1",
            entitlements: ["view_audit"],
            note: "manually scoped"
          }
        },
        {
          atMs: 2_000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "pausePair",
            pairAlias: "pair",
            reason: "synthetic pause"
          },
          expectErrorCode: "PAIR_IS_PAUSED"
        }
      ]
    });

    expect(run.result.events.find((event) => event.status === "expected_error")?.errorMessage).toBe(
      "[object Object]"
    );
    expect(run.result.snapshot.accessGrants[0]?.entitlements).toContain("view_audit");
  });

  it("exposes failure diagnostics for invariant evaluators and sweep runners", async () => {
    const lockRun = await runScenarioWithEnvironment({
      seed: 600,
      steps: buildSimulationCampaignSteps("lock_release_correctness", 600)
    });
    lockRun.result.snapshot.orderLocks = lockRun.result.snapshot.orderLocks.map((lock) => ({
      ...lock,
      releaseReason: "executed"
    }));
    const failedLockInvariant = await evaluateSimulationRun(
      "lock_release_correctness",
      600,
      lockRun
    );

    expect(failedLockInvariant.passed).toBe(false);

    const retryRun = await runScenarioWithEnvironment({
      seed: 707,
      steps: buildSimulationCampaignSteps("idempotent_retries", 707)
    });
    const duplicatedOrder = retryRun.result.snapshot.darkOrders[0];

    expect(duplicatedOrder).toBeDefined();
    if (duplicatedOrder === undefined) {
      throw new Error("Expected a dark order to duplicate.");
    }
    retryRun.result.snapshot.darkOrders = [
      ...retryRun.result.snapshot.darkOrders,
      {
        ...duplicatedOrder,
        orderId: "dark-order-duplicate-2"
      }
    ];
    const failedRetryInvariant = await evaluateSimulationRun("idempotent_retries", 707, retryRun);

    expect(failedRetryInvariant.passed).toBe(false);

    const doubleRun = await runScenarioWithEnvironment({
      seed: 202,
      steps: buildSimulationCampaignSteps("no_double_execution", 202)
    });
    const duplicatedExecution = doubleRun.result.snapshot.executions[0];

    expect(duplicatedExecution).toBeDefined();
    if (duplicatedExecution === undefined) {
      throw new Error("Expected an execution to duplicate.");
    }
    doubleRun.result.snapshot.executions = [
      ...doubleRun.result.snapshot.executions,
      {
        ...duplicatedExecution,
        executionId: "execution-duplicate"
      }
    ];
    expect((await evaluateSimulationRun("no_double_execution", 202, doubleRun)).passed).toBe(false);

    const lateRun = await runScenarioWithEnvironment({
      seed: 303,
      steps: buildSimulationCampaignSteps("no_late_accept_after_expiry", 303)
    });
    lateRun.result.snapshot.executions = [
      ...lateRun.result.snapshot.executions,
      {
        acceptedAt: "2026-04-02T00:00:00.000Z",
        executionId: "late-execution",
        instrumentId: "CUSIP-LATE",
        pairId: "pair-late-dark",
        price: 100,
        quantity: 1
      }
    ];
    lateRun.result.snapshot.matchProposals = lateRun.result.snapshot.matchProposals.map(
      (proposal) =>
        proposal.proposalId === findDemoOutputId(lateRun.result.replay, "proposal", "proposal")
          ? { ...proposal, status: "accepted" }
          : proposal
    );
    expect((await evaluateSimulationRun("no_late_accept_after_expiry", 303, lateRun)).passed).toBe(
      false
    );

    const pausedRun = await runScenarioWithEnvironment({
      seed: 404,
      steps: buildSimulationCampaignSteps("no_match_on_paused_pair", 404)
    });
    pausedRun.result.snapshot.matchProposals = [
      {
        buyLockId: "lock-buy-failure",
        buyOrderId: "dark-buy-failure",
        buyResponse: "pending",
        buySubscriberId: "subscriber-alpha",
        createdAt: "2026-04-02T00:00:00.000Z",
        createdBy: "operator-paused",
        expiresAt: "2026-04-02T00:05:00.000Z",
        instrumentId: "CUSIP-DARK-FAIL",
        pairId: "pair-paused-dark",
        price: 100,
        proposalId: "proposal-failure",
        quantity: 5,
        sellLockId: "lock-sell-failure",
        sellOrderId: "dark-sell-failure",
        sellResponse: "pending",
        sellSubscriberId: "subscriber-beta",
        status: "pending",
        updatedAt: "2026-04-02T00:00:00.000Z"
      }
    ];
    expect((await evaluateSimulationRun("no_match_on_paused_pair", 404, pausedRun)).passed).toBe(
      false
    );

    const replayRun = await runScenarioWithEnvironment({
      seed: 505,
      steps: buildSimulationCampaignSteps("deterministic_replay_from_seed", 505)
    });
    replayRun.result.replay.outputs = [
      ...replayRun.result.replay.outputs,
      {
        alias: "corrupted",
        id: "corrupted-output",
        type: "pair"
      }
    ];
    expect(
      (await evaluateSimulationRun("deterministic_replay_from_seed", 505, replayRun)).passed
    ).toBe(false);

    const unauthorizedRun = await runScenarioWithEnvironment({
      seed: 101,
      steps: buildSimulationCampaignSteps("unauthorized_visibility", 101)
    });
    unauthorizedRun.environment.application.getDarkSubscriberState = async () =>
      ({
        executions: [],
        locks: [],
        orders: [],
        proposals: [],
        settlements: [],
        subscriberId: "subscriber-alpha"
      }) as Awaited<
        ReturnType<typeof unauthorizedRun.environment.application.getDarkSubscriberState>
      >;
    expect(
      (await evaluateSimulationRun("unauthorized_visibility", 101, unauthorizedRun)).passed
    ).toBe(false);

    const unknownUnauthorizedRun = await runScenarioWithEnvironment({
      seed: 102,
      steps: buildSimulationCampaignSteps("unauthorized_visibility", 102)
    });
    const originalDarkSubscriberState =
      unknownUnauthorizedRun.environment.application.getDarkSubscriberState;
    unknownUnauthorizedRun.environment.application.getDarkSubscriberState = async (
      pairId,
      subscriberId,
      actorId
    ) => {
      if (actorId === "subscriber-beta") {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercises non-Error invariant handling.
        return Promise.reject("unexpected");
      }

      return originalDarkSubscriberState(pairId, subscriberId, actorId);
    };
    expect(
      (await evaluateSimulationRun("unauthorized_visibility", 102, unknownUnauthorizedRun)).passed
    ).toBe(false);

    const missingOutputRun = await runScenarioWithEnvironment({
      seed: 202,
      steps: buildSimulationCampaignSteps("no_double_execution", 202)
    });
    missingOutputRun.result.replay.outputs = [];
    await expect(
      evaluateSimulationRun("no_double_execution", 202, missingOutputRun)
    ).rejects.toThrow("Scenario output dark-execution was not recorded.");

    const startedAtCampaign = await runSimulationCampaign({
      campaign: "deterministic_replay_from_seed",
      seed: 505,
      startAt: "2026-04-02T00:00:00.000Z"
    });
    expect(startedAtCampaign.invariants[0]?.passed).toBe(true);

    const defaultSweep = await runSimulationSweep({
      seedEnd: 1
    });
    expect(defaultSweep.total).toBeGreaterThan(1);

    const forcedFailureSweep = await runSimulationSweep({
      campaigns: ["idempotent_retries"],
      seedEnd: 1,
      runner: async ({ campaign, seed }) => {
        const base = await runSimulationCampaign({
          campaign,
          seed
        });

        return {
          ...base,
          invariants: [
            {
              detail: "forced invariant failure",
              name: campaign,
              passed: false
            }
          ]
        };
      }
    });

    expect(forcedFailureSweep.failures[0]?.campaign).toBe("idempotent_retries");
    expect(forcedFailureSweep.failures[0]?.detail).toBe("forced invariant failure");
    expect(forcedFailureSweep.failures[0]?.replayText).toEqual(
      expect.stringContaining("canton-dark-sim.v2")
    );
    expect(forcedFailureSweep.failures[0]?.seed).toBe(1);

    const thrownSweep = await runSimulationSweep({
      campaigns: ["unauthorized_visibility"],
      seedEnd: 1,
      runner: async () => {
        throw new Error("forced sweep exception");
      }
    });

    expect(thrownSweep.failures).toEqual([
      {
        campaign: "unauthorized_visibility",
        detail: "forced sweep exception",
        seed: 1
      }
    ]);

    const nonErrorSweep = await runSimulationSweep({
      campaigns: ["unauthorized_visibility"],
      seedEnd: 1,
      runner: async () => {
        // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- exercises non-Error sweep failure handling.
        return Promise.reject("forced string exception");
      }
    });

    expect(nonErrorSweep.failures).toEqual([
      {
        campaign: "unauthorized_visibility",
        detail: "Unknown simulation failure",
        seed: 1
      }
    ]);
  });
});
