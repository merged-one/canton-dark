import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  name: "telemetry",
  thresholds: {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95
  }
});
