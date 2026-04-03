import { createPackageVitestConfig } from "../../vitest.shared";

export default createPackageVitestConfig({
  name: "ui-sdk",
  environment: "jsdom",
  thresholds: {
    lines: 95,
    branches: 95,
    functions: 95,
    statements: 95
  }
});
