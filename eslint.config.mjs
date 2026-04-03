import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";

const sharedTypeAwareConfig = {
  files: ["**/*.{ts,tsx,mts,cts}"],
  languageOptions: {
    parserOptions: {
      projectService: true,
      tsconfigRootDir: import.meta.dirname
    },
    globals: {
      ...globals.node,
      ...globals.browser
    }
  },
  rules: {
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "error",
      {
        prefer: "type-imports"
      }
    ],
    "@typescript-eslint/no-confusing-void-expression": [
      "error",
      {
        ignoreArrowShorthand: true
      }
    ],
    "@typescript-eslint/no-floating-promises": "error",
    "@typescript-eslint/no-import-type-side-effects": "error",
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: {
          attributes: false
        }
      }
    ],
    "@typescript-eslint/require-await": "off",
    "@typescript-eslint/restrict-template-expressions": [
      "error",
      {
        allowNumber: true
      }
    ]
  }
};

const makeRestriction = (files, patterns) => ({
  files,
  rules: {
    "no-restricted-imports": [
      "error",
      {
        patterns
      }
    ]
  }
});

export default tseslint.config(
  {
    ignores: [
      "**/*.mjs",
      "**/coverage/**",
      "**/dist/**",
      "**/node_modules/**",
      ".turbo/**",
      "playwright-report/**",
      "test-results/**"
    ],
    linterOptions: {
      reportUnusedDisableDirectives: "error"
    }
  },
  js.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  sharedTypeAwareConfig,
  makeRestriction(["packages/domain-core/src/**/*.{ts,tsx}"], ["@canton-dark/*"]),
  makeRestriction(
    ["packages/app-services/src/**/*.{ts,tsx}"],
    [
      "@canton-dark/adapters-*",
      "@canton-dark/ui-kit",
      "@canton-dark/ui-sdk",
      "@canton-dark/sim-harness"
    ]
  ),
  makeRestriction(
    ["packages/ui-sdk/src/**/*.{ts,tsx}", "packages/ui-kit/src/**/*.{ts,tsx}"],
    [
      "@canton-dark/adapters-*",
      "@canton-dark/app-services",
      "@canton-dark/domain-core",
      "@canton-dark/sim-harness"
    ]
  ),
  makeRestriction(
    [
      "apps/operator-console/src/**/*.{ts,tsx}",
      "apps/subscriber-terminal/src/**/*.{ts,tsx}",
      "apps/dealer-workbench/src/**/*.{ts,tsx}",
      "apps/demo-orchestrator/src/**/*.{ts,tsx}"
    ],
    [
      "@canton-dark/adapters-*",
      "@canton-dark/app-services",
      "@canton-dark/domain-core",
      "@canton-dark/sim-harness",
      "@canton-dark/testkit"
    ]
  ),
  makeRestriction(
    ["apps/venue-api/src/**/*.{ts,tsx}"],
    ["@canton-dark/ui-kit", "@canton-dark/ui-sdk"]
  )
);
