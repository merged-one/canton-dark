import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  name: "venue-api",
  coverageInclude: ["src/app.ts"],
  thresholds: {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95
  }
});
