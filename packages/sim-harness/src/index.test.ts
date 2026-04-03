import { describe, expect, it } from "vitest";

import {
  createDeterministicScheduler,
  createScenarioRecorder,
  createSeededRandom,
  parseReplayFile,
  persona,
  replayScenario,
  runScenario,
  runTrivialScenario,
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
        kind: "register_pair",
        alias: "pair",
        mode: "SingleDealerPair",
        operatorId: "operator-1",
        dealers: ["dealer-alpha"],
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

    expect(parseReplayFile(serializeReplayFile(replay))).toEqual(replay);
    expect(await replayScenario(replay)).toEqual({
      replayCommand: "pnpm test:property:replay --seed 9",
      replay: {
        format: "canton-dark-sim.v1",
        seed: 9,
        startedAt: "2026-04-02T00:00:00.000Z",
        steps: replay.steps,
        outputs: [
          {
            alias: "pair",
            type: "pair",
            id: "pair-000009-000001"
          }
        ]
      }
    });
  });

  it("runs the trivial scenario through the memory-backed application", async () => {
    const result = await runTrivialScenario(424242);

    expect(result.replayCommand).toBe("pnpm test:property:replay --seed 424242");
    expect(result.replay).toEqual({
      format: "canton-dark-sim.v1",
      seed: 424242,
      startedAt: "2026-04-02T00:00:00.000Z",
      steps: [
        {
          atMs: 0,
          actor: {
            role: "operator",
            participantId: "operator-1",
            displayName: "Operator"
          },
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
          atMs: 1000,
          actor: {
            role: "operator",
            participantId: "operator-1",
            displayName: "operator-1"
          },
          command: {
            kind: "grant_access",
            pairAlias: "pair",
            role: "subscriber",
            subjectId: "subscriber-1"
          }
        },
        {
          atMs: 2000,
          actor: {
            role: "subscriber",
            participantId: "subscriber-1",
            displayName: "subscriber-1"
          },
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
          atMs: 3000,
          actor: {
            role: "dealer",
            participantId: "dealer-alpha",
            displayName: "dealer-alpha"
          },
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
          atMs: 4000,
          actor: {
            role: "operator",
            participantId: "operator-1",
            displayName: "operator-1"
          },
          command: {
            kind: "execute_quote",
            alias: "execution",
            pairAlias: "pair",
            rfqAlias: "rfq",
            quoteAlias: "quote"
          }
        }
      ],
      outputs: [
        {
          alias: "pair",
          type: "pair",
          id: "pair-0093ci-000001"
        },
        {
          alias: "rfq",
          type: "rfq",
          id: "rfq-0093ci-000001"
        },
        {
          alias: "quote",
          type: "quote",
          id: "quote-0093ci-000001"
        },
        {
          alias: "execution",
          type: "execution",
          id: "execution-0093ci-000001"
        }
      ]
    });
    expect(await runScenario({ seed: 424242, steps: result.replay.steps })).toEqual(result);
  });

  it("supports replay steps that use concrete ids instead of aliases", async () => {
    const result = await runScenario({
      seed: 9,
      steps: [
        {
          atMs: 0,
          actor: persona.operator("operator-1"),
          command: {
            kind: "register_pair",
            alias: "pair",
            mode: "SingleDealerPair",
            operatorId: "operator-1",
            dealers: ["dealer-alpha"],
            jurisdiction: "US",
            rulebookVersion: "v1",
            rulebookSummary: "initial"
          }
        },
        {
          atMs: 1000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "grant_access",
            pairAlias: "pair-000009-000001",
            role: "subscriber",
            subjectId: "subscriber-1"
          }
        },
        {
          atMs: 2000,
          actor: persona.subscriber("subscriber-1"),
          command: {
            kind: "submit_rfq",
            alias: "rfq",
            pairAlias: "pair-000009-000001",
            directedDealerIds: ["dealer-alpha"],
            instrumentId: "CUSIP-1",
            side: "buy",
            quantity: 10,
            expiresAt: "2026-04-02T00:10:00.000Z"
          }
        },
        {
          atMs: 3000,
          actor: persona.dealer("dealer-alpha"),
          command: {
            kind: "record_quote",
            alias: "quote",
            pairAlias: "pair-000009-000001",
            rfqAlias: "rfq-000009-000001",
            price: 100.5,
            quantity: 10,
            expiresAt: "2026-04-02T00:09:00.000Z"
          }
        },
        {
          atMs: 4000,
          actor: persona.operator("operator-1"),
          command: {
            kind: "execute_quote",
            alias: "execution",
            pairAlias: "pair-000009-000001",
            rfqAlias: "rfq-000009-000001",
            quoteAlias: "quote-000009-000001"
          }
        }
      ]
    });

    expect(result.replay.outputs).toEqual([
      {
        alias: "pair",
        type: "pair",
        id: "pair-000009-000001"
      },
      {
        alias: "rfq",
        type: "rfq",
        id: "rfq-000009-000001"
      },
      {
        alias: "quote",
        type: "quote",
        id: "quote-000009-000001"
      },
      {
        alias: "execution",
        type: "execution",
        id: "execution-000009-000001"
      }
    ]);
  });
});
