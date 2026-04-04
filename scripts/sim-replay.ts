import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  createPhase2DemoSteps,
  replayScenario,
  runPhase1DemoScenario,
  runPhase3DemoScenario,
  runScenario,
  runSimulationCampaign,
  serializeReplayFile,
  simulationCampaignNames,
  type ScenarioResult,
  type SimulationCampaignName
} from "@canton-dark/sim-harness";

const parseArgs = (argv: readonly string[]): Map<string, string | true> => {
  const options = new Map<string, string | true>();

  for (let index = 0; index < argv.length; index += 1) {
    const current = argv[index];

    if (!current?.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];

    if (next === undefined || next.startsWith("--")) {
      options.set(current.slice(2), true);
      continue;
    }

    options.set(current.slice(2), next);
    index += 1;
  }

  return options;
};

const options = parseArgs(process.argv.slice(2));
const seedOption = options.get("seed");

if (typeof seedOption !== "string") {
  throw new Error(
    "Usage: tsx scripts/sim-replay.ts --seed <seed> [--campaign <name>] [--phase <phase1|phase2|phase3>] [--out <dir>]"
  );
}

const seed = Number(seedOption);

if (!Number.isInteger(seed) || seed < 1) {
  throw new Error(`Seed must be a positive integer. Received ${seedOption}.`);
}

const campaignOption = options.get("campaign");
const phaseOption = options.get("phase");

if (campaignOption !== undefined && phaseOption !== undefined) {
  throw new Error("Use either --campaign or --phase, not both.");
}

const outputDir =
  typeof options.get("out") === "string"
    ? path.resolve(String(options.get("out")))
    : path.join(process.cwd(), "artifacts", "simulation", "replay", `seed-${seed}`);

mkdirSync(outputDir, { recursive: true });

const writeReplay = async (name: string, result: ScenarioResult): Promise<void> => {
  const replayPath = path.join(outputDir, `${name}.replay.json`);
  const verified = await replayScenario(result.replay);

  if (JSON.stringify(verified.snapshot) !== JSON.stringify(result.snapshot)) {
    throw new Error(`Replay verification failed for ${name}.`);
  }

  writeFileSync(replayPath, serializeReplayFile(result.replay), "utf8");
  console.log(`${name}: ${replayPath}`);
};

if (typeof phaseOption === "string") {
  const phaseResult =
    phaseOption === "phase1"
      ? await runPhase1DemoScenario(seed)
      : phaseOption === "phase2"
        ? await runScenario({
            seed,
            steps: createPhase2DemoSteps()
          })
        : phaseOption === "phase3"
          ? await runPhase3DemoScenario(seed)
          : undefined;

  if (phaseResult === undefined) {
    throw new Error(`Unknown phase ${phaseOption}. Expected phase1, phase2, or phase3.`);
  }

  await writeReplay(`${phaseOption}-demo`, phaseResult);
  console.log(
    `Snapshot counts: pairs=${phaseResult.snapshot.pairs.length} rfqs=${phaseResult.snapshot.rfqs.length} quotes=${phaseResult.snapshot.quotes.length} darkOrders=${phaseResult.snapshot.darkOrders.length} proposals=${phaseResult.snapshot.matchProposals.length} executions=${phaseResult.snapshot.executions.length}`
  );
  process.exit(0);
}

const campaigns: readonly SimulationCampaignName[] =
  typeof campaignOption === "string"
    ? [campaignOption as SimulationCampaignName]
    : simulationCampaignNames;

let failed = false;

for (const campaign of campaigns) {
  const result = await runSimulationCampaign({
    campaign,
    seed
  });
  const invariant = result.invariants[0];

  if (invariant === undefined) {
    throw new Error(`No invariant result was returned for ${campaign}.`);
  }

  await writeReplay(campaign, result.result);
  console.log(`${campaign}: ${invariant.passed ? "PASS" : "FAIL"} ${invariant.detail}`);
  failed ||= !invariant.passed;
}

if (failed) {
  process.exit(1);
}
