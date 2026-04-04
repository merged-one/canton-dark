import { existsSync, mkdirSync, readFileSync } from "node:fs";
import net from "node:net";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  createPhase2DemoSteps,
  phase1DemoDefaults,
  phase2DemoDefaults,
  phase3DemoDefaults,
  runPhase1DemoScenario,
  runPhase3DemoScenario,
  runScenario
} from "@canton-dark/sim-harness";

import { demoOrigins, demoPorts } from "./lib/demo";

const rootDir = process.cwd();
const authFixtures = [
  "tests/e2e/.auth/dealer-alpha.json",
  "tests/e2e/.auth/dealer-beta.json",
  "tests/e2e/.auth/dealer-gamma.json",
  "tests/e2e/.auth/dealer-outsider.json",
  "tests/e2e/.auth/operator.json",
  "tests/e2e/.auth/subscriber.json"
] as const;

const pass = (message: string): void => {
  console.log(`PASS ${message}`);
};

const fail = (message: string): never => {
  throw new Error(message);
};

const assertPortAvailable = async (port: number): Promise<void> =>
  new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", (error) => {
      reject(new Error(`Port ${port} is unavailable: ${error.message}`));
    });
    server.once("listening", () => {
      server.close((closeError) => {
        if (closeError !== undefined) {
          reject(closeError);
          return;
        }

        resolve();
      });
    });
    server.listen(port, "127.0.0.1");
  });

const repoDoctor = spawnSync("pnpm", ["doctor:repo"], {
  cwd: rootDir,
  stdio: "inherit"
});

if (repoDoctor.status !== 0) {
  process.exit(repoDoctor.status ?? 1);
}

mkdirSync(path.join(rootDir, "artifacts", "demo"), { recursive: true });
pass(`Demo artifact directory ready at ${path.join(rootDir, "artifacts", "demo")}`);

for (const port of Object.values(demoPorts)) {
  await assertPortAvailable(port);
  pass(`Port ${port} is free`);
}

for (const relativePath of authFixtures) {
  const absolutePath = path.join(rootDir, relativePath);

  if (!existsSync(absolutePath)) {
    fail(`Missing auth fixture ${relativePath}`);
  }

  JSON.parse(readFileSync(absolutePath, "utf8"));
  pass(`Auth fixture parsed ${relativePath}`);
}

const phase1 = await runPhase1DemoScenario(424242);
if (
  phase1.snapshot.executions.length !== 1 ||
  phase1.snapshot.pairs[0]?.pairId !== phase1DemoDefaults.pairId
) {
  fail("Phase 1 demo seed is not deterministic.");
}
pass(`Phase 1 seed verified for ${phase1DemoDefaults.pairId}`);

const phase2 = await runScenario({
  seed: 424242,
  steps: createPhase2DemoSteps()
});
if (
  phase2.snapshot.pairs[0]?.pairId !== phase2DemoDefaults.pairId ||
  !phase2.snapshot.accessGrants.some(
    (grant) =>
      grant.pairId === phase2DemoDefaults.pairId &&
      grant.subjectId === phase2DemoDefaults.subscriberId
  )
) {
  fail("Phase 2 demo seed is not deterministic.");
}
pass(`Phase 2 seed verified for ${phase2DemoDefaults.pairId}`);

const phase3 = await runPhase3DemoScenario(424242);
if (
  phase3.snapshot.pairs[0]?.pairId !== phase3DemoDefaults.pairId ||
  phase3.snapshot.matchProposals.length !== 1 ||
  phase3.snapshot.darkOrders.length !== 2
) {
  fail("Phase 3 demo seed is not deterministic.");
}
pass(`Phase 3 seed verified for ${phase3DemoDefaults.pairId}`);

pass(`API origin ${demoOrigins.api}`);
pass(`Operator origin ${demoOrigins.operator}`);
pass(`Subscriber origin ${demoOrigins.subscriber}`);
pass(`Dealer origin ${demoOrigins.dealer}`);
