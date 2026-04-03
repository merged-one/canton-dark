import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  coverageInclude: [
    "src/api-client.ts",
    "src/auth.ts",
    "src/dealer-workbench.ts",
    "src/demo-orchestrator.ts",
    "src/operator-console.ts",
    "src/render-helpers.ts",
    "src/shared.ts",
    "src/subscriber-terminal.ts"
  ],
  name: "ui-sdk",
  environment: "jsdom",
  thresholds: {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95
  }
});
