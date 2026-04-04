import { spawn, type ChildProcess } from "node:child_process";
import { createWriteStream, mkdirSync, type WriteStream } from "node:fs";
import path from "node:path";
import type { Readable } from "node:stream";

import {
  parseDemoStatusResponse,
  type DemoMode,
  type DemoStatusResponse
} from "@canton-dark/api-contracts";

export const demoPorts = {
  api: 4301,
  dealer: 4175,
  demo: 4172,
  operator: 4173,
  subscriber: 4174
} as const;

export const demoOrigins = {
  api: process.env.CANTON_DARK_API_ORIGIN ?? `http://127.0.0.1:${demoPorts.api}`,
  dealer: process.env.CANTON_DARK_DEALER_ORIGIN ?? `http://127.0.0.1:${demoPorts.dealer}`,
  demo: process.env.CANTON_DARK_DEMO_ORIGIN ?? `http://127.0.0.1:${demoPorts.demo}`,
  operator: process.env.CANTON_DARK_OPERATOR_ORIGIN ?? `http://127.0.0.1:${demoPorts.operator}`,
  subscriber:
    process.env.CANTON_DARK_SUBSCRIBER_ORIGIN ?? `http://127.0.0.1:${demoPorts.subscriber}`
} as const;

export type DemoPhase = "phase1" | "phase2" | "phase3";

export const phaseModes: Record<DemoPhase, DemoMode> = {
  phase1: "phase1-ready",
  phase2: "phase2-ready",
  phase3: "phase3-ready"
};

type DemoCommand = {
  env?: Record<string, string>;
  name: string;
  url: string;
  waitFor: string;
};

const serviceCommands = (): readonly DemoCommand[] => [
  {
    name: "venue-api",
    url: "pnpm --filter @canton-dark/venue-api dev",
    env: {
      VENUE_API_BOOTSTRAP_MODE: "empty"
    },
    waitFor: `${demoOrigins.api}/demo/status`
  },
  {
    name: "demo-orchestrator",
    url: `pnpm --filter @canton-dark/demo-orchestrator dev -- --host 127.0.0.1 --port ${demoPorts.demo}`,
    env: {
      VITE_VENUE_API_BASE_URL: demoOrigins.api
    },
    waitFor: demoOrigins.demo
  },
  {
    name: "operator-console",
    url: `pnpm --filter @canton-dark/operator-console dev -- --host 127.0.0.1 --port ${demoPorts.operator}`,
    env: {
      VITE_VENUE_API_BASE_URL: demoOrigins.api
    },
    waitFor: demoOrigins.operator
  },
  {
    name: "subscriber-terminal",
    url: `pnpm --filter @canton-dark/subscriber-terminal dev -- --host 127.0.0.1 --port ${demoPorts.subscriber}`,
    env: {
      VITE_VENUE_API_BASE_URL: demoOrigins.api
    },
    waitFor: demoOrigins.subscriber
  },
  {
    name: "dealer-workbench",
    url: `pnpm --filter @canton-dark/dealer-workbench dev -- --host 127.0.0.1 --port ${demoPorts.dealer}`,
    env: {
      VITE_VENUE_API_BASE_URL: demoOrigins.api
    },
    waitFor: demoOrigins.dealer
  }
];

const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const attachStream = (
  name: string,
  channel: "stderr" | "stdout",
  stream: Readable | null,
  writer: WriteStream
): void => {
  if (stream === null) {
    return;
  }

  stream.setEncoding("utf8");

  let buffer = "";
  stream.on("data", (chunk: string) => {
    writer.write(chunk);
    buffer += chunk;

    while (buffer.includes("\n")) {
      const newlineIndex = buffer.indexOf("\n");
      const line = buffer.slice(0, newlineIndex).replace(/\r$/, "");

      buffer = buffer.slice(newlineIndex + 1);
      console.log(`[${name}:${channel}] ${line}`);
    }
  });

  stream.on("end", () => {
    if (buffer.length > 0) {
      console.log(`[${name}:${channel}] ${buffer.replace(/\r$/, "")}`);
    }
  });
};

const querySuffix = (status: DemoStatusResponse, actorId: string): string =>
  `?actorId=${encodeURIComponent(actorId)}&pairId=${encodeURIComponent(status.pairId)}`;

const logDemoStatus = (status: DemoStatusResponse): void => {
  console.log(`Mode: ${status.mode}`);
  console.log(`Pair: ${status.pairId}`);
  console.log(`API clock: ${status.currentTime}`);
  console.log(`Demo orchestrator: ${demoOrigins.demo}`);
  console.log(`Operator: ${demoOrigins.operator}/${querySuffix(status, status.operatorId)}`);
  console.log(`Subscriber: ${demoOrigins.subscriber}/${querySuffix(status, status.subscriberId)}`);

  for (const dealerId of status.dealerIds) {
    console.log(`Dealer ${dealerId}: ${demoOrigins.dealer}/${querySuffix(status, dealerId)}`);
  }

  if (status.secondarySubscriberId !== undefined) {
    console.log(
      `Subscriber ${status.secondarySubscriberId}: ${demoOrigins.subscriber}/${querySuffix(status, status.secondarySubscriberId)}`
    );
  }

  if (status.buyOrderId !== undefined) {
    console.log(`Buy order: ${status.buyOrderId}`);
  }

  if (status.sellOrderId !== undefined) {
    console.log(`Sell order: ${status.sellOrderId}`);
  }

  if (status.proposalId !== undefined) {
    console.log(`Proposal: ${status.proposalId}`);
  }
};

export const seedDemoMode = async (mode: DemoMode): Promise<DemoStatusResponse> => {
  const response = await fetch(`${demoOrigins.api}/demo/reset`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({ mode })
  });

  if (!response.ok) {
    throw new Error(`Failed to seed ${mode} from ${demoOrigins.api}: ${await response.text()}`);
  }

  const status = parseDemoStatusResponse(await response.json());

  console.log(`Demo state ready for ${mode}`);
  logDemoStatus(status);

  return status;
};

export const waitForUrl = async (url: string): Promise<void> => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Retry until the service is ready.
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for ${url}`);
};

export const runDemoStack = async (phase: DemoPhase): Promise<void> => {
  const logDir = path.join(process.cwd(), "artifacts", "demo", phase);
  const commands = serviceCommands();
  const children: ChildProcess[] = [];
  const writers: WriteStream[] = [];
  let shuttingDown = false;

  const shutdown = (exitCode?: number): void => {
    if (shuttingDown) {
      return;
    }

    shuttingDown = true;

    for (const child of children) {
      if (child.exitCode === null && !child.killed) {
        child.kill("SIGTERM");
      }
    }

    for (const writer of writers) {
      writer.end();
    }

    if (exitCode !== undefined) {
      process.exit(exitCode);
    }
  };

  mkdirSync(logDir, { recursive: true });

  process.on("SIGINT", () => {
    shutdown(0);
  });
  process.on("SIGTERM", () => {
    shutdown(0);
  });

  for (const command of commands) {
    const child = spawn(command.url, {
      cwd: process.cwd(),
      env: {
        ...process.env,
        ...command.env
      },
      shell: true,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const writer = createWriteStream(path.join(logDir, `${command.name}.log`), { flags: "w" });

    writers.push(writer);
    attachStream(command.name, "stdout", child.stdout, writer);
    attachStream(command.name, "stderr", child.stderr, writer);
    child.on("exit", (code) => {
      if (!shuttingDown && code !== 0) {
        console.error(`${command.name} exited with code ${code ?? 1}.`);
        shutdown(code ?? 1);
      }
    });
    children.push(child);
  }

  for (const command of commands) {
    await waitForUrl(command.waitFor);
  }

  console.log(`Local demo logs: ${logDir}`);
  await seedDemoMode(phaseModes[phase]);
  console.log("Demo stack is running. Press Ctrl+C to stop.");

  await new Promise<never>(() => undefined);
};
