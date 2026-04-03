import { defineConfig } from "@playwright/test";

const apiOrigin = "http://127.0.0.1:4301";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  expect: {
    toHaveScreenshot: {
      pathTemplate: "{testDir}/{testFilePath}-snapshots/{arg}{ext}"
    }
  },
  use: {
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/
    },
    {
      name: "chromium",
      dependencies: ["setup"],
      testIgnore: /auth\.setup\.ts/
    }
  ],
  webServer: [
    {
      command: "VENUE_API_BOOTSTRAP_MODE=empty pnpm --filter @canton-dark/venue-api dev",
      port: 4301,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `VITE_VENUE_API_BASE_URL=${apiOrigin} pnpm --filter @canton-dark/demo-orchestrator dev -- --host 127.0.0.1 --port 4172`,
      port: 4172,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `VITE_VENUE_API_BASE_URL=${apiOrigin} pnpm --filter @canton-dark/operator-console dev -- --host 127.0.0.1 --port 4173`,
      port: 4173,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `VITE_VENUE_API_BASE_URL=${apiOrigin} pnpm --filter @canton-dark/subscriber-terminal dev -- --host 127.0.0.1 --port 4174`,
      port: 4174,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command: `VITE_VENUE_API_BASE_URL=${apiOrigin} pnpm --filter @canton-dark/dealer-workbench dev -- --host 127.0.0.1 --port 4175`,
      port: 4175,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
