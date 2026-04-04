import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  name: "sim-harness",
  coverageInclude: ["src/core.ts", "src/demo.ts", "src/campaigns.ts"],
  thresholds: {
    lines: 100,
    branches: 100,
    functions: 100,
    statements: 100
  }
});
