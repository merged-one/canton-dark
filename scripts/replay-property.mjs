import { spawnSync } from "node:child_process";

const args = process.argv.slice(2);
const options = new Map();

for (let index = 0; index < args.length; index += 1) {
  const current = args[index];
  const next = args[index + 1];

  if (!current?.startsWith("--") || next === undefined) {
    continue;
  }

  options.set(current.slice(2), next);
  index += 1;
}

const env = {
  ...process.env,
  FC_SEED: options.get("seed") ?? process.env.FC_SEED ?? "424242"
};

const pathValue = options.get("path") ?? process.env.FC_PATH;

if (pathValue) {
  env.FC_PATH = pathValue;
}

const numRunsValue = options.get("num-runs") ?? process.env.FC_NUM_RUNS;

if (numRunsValue) {
  env.FC_NUM_RUNS = numRunsValue;
}

const result = spawnSync("pnpm", ["test:property"], {
  stdio: "inherit",
  env,
  shell: process.platform === "win32"
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}
