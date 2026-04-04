import { spawnSync } from "node:child_process";
import path from "node:path";

import { ensureSdkVersionsInstalled, resolveDamlToolchain } from "./lib/daml-toolchain";

const stackEnabled = process.env.CANTON_LEDGER_STACK_AVAILABLE === "true";

if (!stackEnabled) {
  console.log("Skipping Canton integration because CANTON_LEDGER_STACK_AVAILABLE is not true.");
  process.exit(0);
}

const toolchainResult = resolveDamlToolchain();

if (!toolchainResult.ok) {
  console.error(toolchainResult.reason);
  process.exit(1);
}

const { toolchain } = toolchainResult;
const projectRoots = [
  "daml/core",
  "daml/phase1-singledealer",
  "daml/phase2-ats-rfq",
  "daml/phase3-dark-cross",
  "daml/phase1-singledealer-tests",
  "daml/phase2-ats-rfq-tests",
  "daml/phase3-dark-cross-tests"
] as const;

console.log(`dpm ${toolchain.dpmVersion}`);
console.log(toolchain.javaVersion);

ensureSdkVersionsInstalled(
  toolchain,
  projectRoots.map((projectRoot) => path.join(process.cwd(), projectRoot))
);

for (const projectRoot of projectRoots.slice(0, 4)) {
  console.log(`Building ${projectRoot}`);
  const result = spawnSync(toolchain.dpmPath, ["build"], {
    cwd: path.join(process.cwd(), projectRoot),
    env: toolchain.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const testResult = spawnSync("pnpm", ["exec", "tsx", "scripts/run-daml-tests.ts", "--require"], {
  cwd: process.cwd(),
  env: toolchain.env,
  stdio: "inherit"
});

if (testResult.status !== 0) {
  process.exit(testResult.status ?? 1);
}
