import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

import { describe, expect, it } from "vitest";

const workspaceRoot = path.resolve(import.meta.dirname, "../../..");

const walkTsFiles = (root: string): string[] => {
  if (!statSync(root, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const results: string[] = [];

  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      results.push(...walkTsFiles(fullPath));
      continue;
    }

    if (entry.isFile() && fullPath.endsWith(".ts")) {
      results.push(fullPath);
    }
  }

  return results.sort((left, right) => left.localeCompare(right));
};

const extractImports = (filePath: string): string[] =>
  [...readFileSync(filePath, "utf8").matchAll(/from\s+["']([^"']+)["']/g)].map(
    (match) => match[1] ?? ""
  );

const assertNoMatches = (filePaths: readonly string[], forbidden: readonly RegExp[]): string[] =>
  filePaths.flatMap((filePath) =>
    extractImports(filePath)
      .filter((specifier) => forbidden.some((pattern) => pattern.test(specifier)))
      .map((specifier) => `${path.relative(workspaceRoot, filePath)} -> ${specifier}`)
  );

describe("workspace dependency boundaries", () => {
  it("keeps ui packages and ui apps from importing headless internals", () => {
    const uiFiles = [
      ...walkTsFiles(path.join(workspaceRoot, "packages/ui-kit/src")),
      ...walkTsFiles(path.join(workspaceRoot, "packages/ui-sdk/src")),
      ...walkTsFiles(path.join(workspaceRoot, "apps/operator-console/src")),
      ...walkTsFiles(path.join(workspaceRoot, "apps/subscriber-terminal/src")),
      ...walkTsFiles(path.join(workspaceRoot, "apps/dealer-workbench/src"))
    ];

    expect(
      assertNoMatches(uiFiles, [
        /^@canton-dark\/domain-core(?:\/|$)/,
        /^@canton-dark\/app-services(?:\/|$)/,
        /^@canton-dark\/adapters-/,
        /^@canton-dark\/sim-harness(?:\/|$)/,
        /^@canton-dark\/testkit(?:\/|$)/,
        /packages\/domain-core\//,
        /packages\/app-services\//
      ])
    ).toEqual([]);
  });

  it("keeps apps away from direct domain-core imports and package internals", () => {
    const appFiles = [
      ...walkTsFiles(path.join(workspaceRoot, "apps/venue-api/src")),
      ...walkTsFiles(path.join(workspaceRoot, "apps/demo-orchestrator/src"))
    ];

    expect(
      assertNoMatches(appFiles, [
        /^@canton-dark\/domain-core(?:\/|$)/,
        /packages\/domain-core\/src\//,
        /packages\/app-services\/src\//
      ])
    ).toEqual([]);
  });
});
