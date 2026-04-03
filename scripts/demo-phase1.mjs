import { spawn } from "node:child_process";

const apiOrigin = "http://127.0.0.1:4301";
const commands = [
  {
    name: "venue-api",
    args: ["--filter", "@canton-dark/venue-api", "dev"],
    env: {
      VENUE_API_BOOTSTRAP_MODE: "empty"
    },
    waitFor: `${apiOrigin}/demo/status`
  },
  {
    name: "demo-orchestrator",
    args: [
      "--filter",
      "@canton-dark/demo-orchestrator",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "4172"
    ],
    env: {
      VITE_VENUE_API_BASE_URL: apiOrigin
    },
    waitFor: "http://127.0.0.1:4172"
  },
  {
    name: "operator-console",
    args: [
      "--filter",
      "@canton-dark/operator-console",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "4173"
    ],
    env: {
      VITE_VENUE_API_BASE_URL: apiOrigin
    },
    waitFor: "http://127.0.0.1:4173"
  },
  {
    name: "subscriber-terminal",
    args: [
      "--filter",
      "@canton-dark/subscriber-terminal",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "4174"
    ],
    env: {
      VITE_VENUE_API_BASE_URL: apiOrigin
    },
    waitFor: "http://127.0.0.1:4174"
  },
  {
    name: "dealer-workbench",
    args: [
      "--filter",
      "@canton-dark/dealer-workbench",
      "dev",
      "--",
      "--host",
      "127.0.0.1",
      "--port",
      "4175"
    ],
    env: {
      VITE_VENUE_API_BASE_URL: apiOrigin
    },
    waitFor: "http://127.0.0.1:4175"
  }
];

const children = [];

const shutdown = () => {
  for (const child of children) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

const waitForUrl = async (url) => {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      const response = await fetch(url);

      if (response.ok || response.status < 500) {
        return;
      }
    } catch {
      // Retry until ready.
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error(`Timed out waiting for ${url}`);
};

for (const command of commands) {
  const child = spawn("pnpm", command.args, {
    cwd: process.cwd(),
    env: {
      ...process.env,
      ...command.env
    },
    stdio: "inherit"
  });

  child.on("exit", (code) => {
    if (code !== 0) {
      shutdown();
      process.exit(code ?? 1);
    }
  });

  children.push(child);
}

for (const command of commands) {
  await waitForUrl(command.waitFor);
}

const seed = spawn("node", ["scripts/demo-phase1-seed.mjs"], {
  cwd: process.cwd(),
  stdio: "inherit"
});

await new Promise((resolve, reject) => {
  seed.on("exit", (code) => {
    if (code === 0) {
      resolve();
      return;
    }

    reject(new Error(`demo-phase1-seed exited with code ${code ?? 1}`));
  });
});

await new Promise(() => {
  // Keep the dev stack running until interrupted.
});
