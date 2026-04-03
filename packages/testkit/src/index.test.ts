import { afterEach, describe, expect, it } from "vitest";

import {
  createDeterministicPropertyConfig,
  createReplayMetadata,
  describeReplayCommand
} from "./index";

const originalEnv = {
  FC_NUM_RUNS: process.env.FC_NUM_RUNS,
  FC_PATH: process.env.FC_PATH,
  FC_SEED: process.env.FC_SEED
};

afterEach(() => {
  process.env.FC_NUM_RUNS = originalEnv.FC_NUM_RUNS;
  process.env.FC_PATH = originalEnv.FC_PATH;
  process.env.FC_SEED = originalEnv.FC_SEED;
});

describe("createDeterministicPropertyConfig", () => {
  it("uses deterministic defaults", () => {
    delete process.env.FC_SEED;
    delete process.env.FC_PATH;
    delete process.env.FC_NUM_RUNS;

    expect(createDeterministicPropertyConfig()).toEqual({
      seed: 424242,
      path: undefined,
      numRuns: 64,
      endOnFailure: true
    });
  });

  it("applies environment overrides", () => {
    process.env.FC_SEED = "99";
    process.env.FC_PATH = "7:2";
    process.env.FC_NUM_RUNS = "12";

    expect(createDeterministicPropertyConfig()).toEqual({
      seed: 99,
      path: "7:2",
      numRuns: 12,
      endOnFailure: true
    });
  });

  it("falls back to deterministic defaults when numeric env vars are invalid", () => {
    process.env.FC_SEED = "not-a-number";
    process.env.FC_NUM_RUNS = "still-not-a-number";
    delete process.env.FC_PATH;

    expect(createDeterministicPropertyConfig()).toEqual({
      seed: 424242,
      numRuns: 64,
      endOnFailure: true
    });
  });
});

describe("describeReplayCommand", () => {
  it("formats replay commands with and without a path", () => {
    expect(describeReplayCommand(424242)).toBe("pnpm test:property:replay --seed 424242");
    expect(describeReplayCommand(424242, "17:3")).toBe(
      "pnpm test:property:replay --seed 424242 --path 17:3"
    );
  });
});

describe("createReplayMetadata", () => {
  it("packages replay metadata for logs and failure messages", () => {
    expect(createReplayMetadata(424242)).toEqual({
      seed: 424242,
      command: "pnpm test:property:replay --seed 424242"
    });
    expect(createReplayMetadata(424242, "17:3")).toEqual({
      seed: 424242,
      path: "17:3",
      command: "pnpm test:property:replay --seed 424242 --path 17:3"
    });
  });
});
