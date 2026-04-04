import { spawnSync } from "node:child_process";
import path from "node:path";

import { ensureSdkVersionsInstalled, resolveDamlToolchain } from "./lib/daml-toolchain";

const buildRoots = [
  "daml/core",
  "daml/phase1-singledealer",
  "daml/phase2-ats-rfq",
  "daml/phase3-dark-cross"
] as const;
const testRoots = [
  "daml/phase1-singledealer-tests",
  "daml/phase2-ats-rfq-tests",
  "daml/phase3-dark-cross-tests"
] as const;

const requireDaml = process.argv.includes("--require") || process.env.REQUIRE_DAML === "true";
const toolchainResult = resolveDamlToolchain();

if (!toolchainResult.ok) {
  if (requireDaml) {
    console.error(toolchainResult.reason);
    process.exit(1);
  }

  console.log(`Skipping Daml tests because ${toolchainResult.reason}`);
  process.exit(0);
}

const { toolchain } = toolchainResult;

ensureSdkVersionsInstalled(
  toolchain,
  [...buildRoots, ...testRoots].map((projectRoot) => path.join(process.cwd(), projectRoot))
);

console.log(`dpm ${toolchain.dpmVersion}`);
console.log(toolchain.javaVersion);

for (const projectRoot of buildRoots) {
  console.log(`Running dpm build for ${projectRoot}`);
  const result = spawnSync(toolchain.dpmPath, ["build"], {
    cwd: path.join(process.cwd(), projectRoot),
    env: toolchain.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

for (const projectRoot of testRoots) {
  console.log(`Running dpm test for ${projectRoot}`);
  const result = spawnSync(toolchain.dpmPath, ["test"], {
    cwd: path.join(process.cwd(), projectRoot),
    env: toolchain.env,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
