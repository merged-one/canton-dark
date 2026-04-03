import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  name: "demo-orchestrator",
  environment: "jsdom",
  coverageInclude: ["src/app.ts"],
  thresholds: {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95
  }
});
