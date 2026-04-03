import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "pnpm --filter @canton-dark/venue-api dev",
      port: 4301,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    },
    {
      command:
        "VITE_VENUE_API_BASE_URL=http://127.0.0.1:4301 pnpm --filter @canton-dark/operator-console dev -- --host 127.0.0.1 --port 4173",
      port: 4173,
      timeout: 120_000,
      reuseExistingServer: !process.env.CI
    }
  ]
});
