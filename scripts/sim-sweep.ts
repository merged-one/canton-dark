import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

import {
  runSimulationSweep,
  simulationCampaignNames,
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
const seedStart = Number(options.get("seed-start") ?? "1");
const seedEnd = Number(options.get("seed-end") ?? "100");

if (
  !Number.isInteger(seedStart) ||
  !Number.isInteger(seedEnd) ||
  seedStart < 1 ||
  seedEnd < seedStart
) {
  throw new Error(`Invalid seed range ${seedStart}..${seedEnd}.`);
}

const campaignOption = options.get("campaigns");
const campaigns =
  typeof campaignOption === "string"
    ? (campaignOption
        .split(",")
        .map((campaign) => campaign.trim())
        .filter((campaign) => campaign.length > 0) as SimulationCampaignName[])
    : [...simulationCampaignNames];

const outputDir =
  typeof options.get("out") === "string"
    ? path.resolve(String(options.get("out")))
    : path.join(
        process.cwd(),
        "artifacts",
        "simulation",
        "sweeps",
        `seed-${seedStart}-to-${seedEnd}`
      );

mkdirSync(outputDir, { recursive: true });

const result = await runSimulationSweep({
  campaigns,
  seedEnd,
  seedStart
});

writeFileSync(path.join(outputDir, "summary.json"), JSON.stringify(result, null, 2), "utf8");

for (const failure of result.failures) {
  const failurePath = path.join(outputDir, `${failure.campaign}-seed-${failure.seed}.replay.json`);

  if (failure.replayText !== undefined) {
    writeFileSync(failurePath, failure.replayText, "utf8");
  }
}

console.log(`Campaigns: ${campaigns.join(", ")}`);
console.log(`Seeds: ${seedStart}..${seedEnd}`);
console.log(`Passed: ${result.passed}/${result.total}`);
console.log(`Artifacts: ${outputDir}`);

for (const failure of result.failures) {
  console.error(`FAIL ${failure.campaign} seed ${failure.seed}: ${failure.detail}`);
}

if (result.failures.length > 0) {
  process.exit(1);
}
