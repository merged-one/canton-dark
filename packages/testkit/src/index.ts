export type DeterministicPropertyConfig = {
  endOnFailure: boolean;
  numRuns: number;
  path?: string;
  seed: number;
};

export const createDeterministicPropertyConfig = (
  overrides: Partial<DeterministicPropertyConfig> = {}
): DeterministicPropertyConfig => {
  const parsedSeed = Number(process.env.FC_SEED ?? "424242");
  const parsedNumRuns = Number(process.env.FC_NUM_RUNS ?? "64");
  const path = process.env.FC_PATH ?? undefined;

  return {
    seed: Number.isFinite(parsedSeed) ? parsedSeed : 424242,
    numRuns: Number.isFinite(parsedNumRuns) ? parsedNumRuns : 64,
    endOnFailure: true,
    ...(path ? { path } : {}),
    ...overrides
  };
};

export const describeReplayCommand = (seed: number, path?: string): string =>
  path
    ? `pnpm test:property:replay --seed ${seed} --path ${path}`
    : `pnpm test:property:replay --seed ${seed}`;
