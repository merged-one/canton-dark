import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

import { resolveDamlToolchain } from "./lib/daml-toolchain";

const rootDir = process.cwd();
const requiredFiles = [
  "AGENTS.md",
  "README.md",
  "coverage.allowlist.json",
  ".github/workflows/ci.yml",
  ".github/workflows/nightly-simulation.yml",
  "docs/architecture/dependency-rules.md",
  "docs/architecture/overview.md",
  "docs/architecture/testing-strategy.md",
  "docs/adr/0006-testing-simulation-and-coverage-gates.md",
  "docs/demo/runbooks/phase1.md",
  "docs/demo/runbooks/phase2.md",
  "docs/demo/runbooks/phase3.md",
  "package.json",
  "pnpm-lock.yaml",
  "turbo.json"
] as const;

const parseMajorVersion = (version: string): number => {
  const match = /^v?(\d+)/.exec(version);

  if (match === null) {
    return 0;
  }

  return Number(match[1]);
};

const runVersionCommand = (
  command: string,
  args: readonly string[]
): { ok: boolean; output: string } => {
  const result = spawnSync(command, [...args], {
    cwd: rootDir,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    return {
      ok: false,
      output: (result.stderr || result.stdout || "").trim()
    };
  }

  return {
    ok: true,
    output: (result.stdout || result.stderr).trim()
  };
};

let failed = false;

const pass = (message: string): void => {
  console.log(`PASS ${message}`);
};

const warn = (message: string): void => {
  console.log(`WARN ${message}`);
};

const fail = (message: string): void => {
  failed = true;
  console.error(`FAIL ${message}`);
};

const nodeMajorVersion = parseMajorVersion(process.version);

if (nodeMajorVersion < 24) {
  fail(`Node ${process.version} is below the required major version 24.`);
} else {
  pass(`Node ${process.version}`);
}

const pnpmVersion = runVersionCommand("pnpm", ["--version"]);

if (!pnpmVersion.ok) {
  fail(`pnpm is unavailable: ${pnpmVersion.output || "missing executable"}`);
} else {
  pass(`pnpm ${pnpmVersion.output}`);
}

const gitVersion = runVersionCommand("git", ["--version"]);

if (!gitVersion.ok) {
  fail(`git is unavailable: ${gitVersion.output || "missing executable"}`);
} else {
  pass(gitVersion.output);
}

const playwrightVersion = runVersionCommand("pnpm", ["exec", "playwright", "--version"]);

if (!playwrightVersion.ok) {
  fail(`Playwright is unavailable through pnpm exec: ${playwrightVersion.output}`);
} else {
  pass(playwrightVersion.output);
}

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(rootDir, relativePath);

  if (!existsSync(absolutePath)) {
    fail(`Missing required file ${relativePath}`);
    continue;
  }

  pass(`Found ${relativePath}`);
}

const allowlist = JSON.parse(
  readFileSync(path.join(rootDir, "coverage.allowlist.json"), "utf8")
) as {
  aggregateExclusions?: unknown;
};

if (!Array.isArray(allowlist.aggregateExclusions) || allowlist.aggregateExclusions.length === 0) {
  fail("coverage.allowlist.json must define a non-empty aggregateExclusions array.");
} else {
  pass(`Coverage allowlist entries: ${allowlist.aggregateExclusions.length}`);
}

const damlToolchain = resolveDamlToolchain();

if (!damlToolchain.ok) {
  warn(damlToolchain.reason);
} else {
  pass(`dpm: ${damlToolchain.toolchain.dpmVersion}`);
  pass(`java: ${damlToolchain.toolchain.javaVersion}`);
}

const deprecatedDaml = runVersionCommand("daml", ["--version"]);

if (deprecatedDaml.ok) {
  warn(
    `daml CLI detected (${deprecatedDaml.output.split("\n")[0]}). Canton 3.4+ repos should use dpm instead.`
  );
}

for (const [command, args] of [
  ["docker", ["--version"]],
  ["gh", ["--version"]],
  ["canton", ["--version"]]
] as const) {
  const version = runVersionCommand(command, args);

  if (!version.ok) {
    warn(`${command} not found`);
    continue;
  }

  pass(`${command}: ${version.output.split("\n")[0]}`);
}

process.exitCode = Number(failed);
