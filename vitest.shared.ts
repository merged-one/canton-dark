import { defineConfig } from "vitest/config";

type CoverageThresholds = {
  branches: number;
  functions: number;
  lines: number;
  statements: number;
};

type TestMode = "contract" | "property" | "unit";

type PackageConfigOptions = {
  coverageInclude?: string[];
  environment?: "jsdom" | "node";
  name: string;
  thresholds: CoverageThresholds;
};

const mode = (process.env.VITEST_MODE ?? "unit") as TestMode;

const includeByMode: Record<TestMode, string[]> = {
  unit: ["src/**/*.test.ts"],
  property: ["src/**/*.property.test.ts"],
  contract: ["src/**/*.contract.test.ts"]
};

const excludeByMode: Record<TestMode, string[]> = {
  unit: ["src/**/*.property.test.ts", "src/**/*.contract.test.ts"],
  property: [],
  contract: []
};

export const createPackageVitestConfig = ({
  coverageInclude = ["src/**/*.ts"],
  environment = "node",
  name,
  thresholds
}: PackageConfigOptions) =>
  defineConfig({
    test: {
      name,
      environment,
      include: includeByMode[mode],
      exclude: ["**/node_modules/**", "**/dist/**", ...excludeByMode[mode]],
      passWithNoTests: true,
      coverage: {
        provider: "v8",
        reporter: ["text", "json-summary", "lcov"],
        reportsDirectory: `coverage/${mode}`,
        include: coverageInclude,
        exclude: [
          "**/*.d.ts",
          "**/*.test.ts",
          "**/*.property.test.ts",
          "**/*.contract.test.ts",
          "**/*.config.ts",
          "**/*.wiring.ts",
          "**/generated/**",
          "**/types.ts",
          "**/type.ts"
        ],
        thresholds
      }
    }
  });
