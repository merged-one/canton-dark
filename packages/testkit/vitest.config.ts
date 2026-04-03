import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  name: "testkit",
  thresholds: {
    lines: 100,
    branches: 100,
    functions: 100,
    statements: 100
  }
});
