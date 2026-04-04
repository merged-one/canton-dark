import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const rootDir = process.cwd();
const packageRoots = [path.join(rootDir, "apps"), path.join(rootDir, "packages")];
const allowlistPath = path.join(rootDir, "coverage.allowlist.json");
const threshold = 98;

const allowlist = JSON.parse(readFileSync(allowlistPath, "utf8"));
const excludedFiles = new Set(
  (allowlist.aggregateExclusions ?? []).map((relativePath) =>
    path.normalize(path.join(rootDir, relativePath))
  )
);

const shouldExclude = (filePath) => excludedFiles.has(path.normalize(filePath));

const formatMetric = (covered, total) => Number(((covered / total) * 100).toFixed(2));

const findCoverageSummaries = (dirPath) => {
  if (!statSync(dirPath, { throwIfNoEntry: false })?.isDirectory()) {
    return [];
  }

  const results = [];

  for (const entry of readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      results.push(...findCoverageSummaries(fullPath));
      continue;
    }

    if (
      entry.isFile() &&
      entry.name === "coverage-summary.json" &&
      fullPath.includes("/coverage/unit/")
    ) {
      results.push(fullPath);
    }
  }

  return results;
};

const summaries = packageRoots.flatMap(findCoverageSummaries);

if (summaries.length === 0) {
  throw new Error("No unit coverage summaries were found. Run `pnpm test:unit` first.");
}

const aggregate = {
  lines: { covered: 0, total: 0 },
  functions: { covered: 0, total: 0 },
  statements: { covered: 0, total: 0 },
  branches: { covered: 0, total: 0 }
};
const packageMetrics = [];
const seenFiles = new Set();

for (const summaryPath of summaries) {
  const summary = JSON.parse(readFileSync(summaryPath, "utf8"));
  const packageRoot = path.dirname(path.dirname(path.dirname(summaryPath)));
  const packageName = path.relative(rootDir, packageRoot);

  if (summary.total !== undefined) {
    packageMetrics.push({
      name: packageName,
      branches: formatMetric(summary.total.branches.covered, summary.total.branches.total),
      functions: formatMetric(summary.total.functions.covered, summary.total.functions.total),
      lines: formatMetric(summary.total.lines.covered, summary.total.lines.total),
      statements: formatMetric(summary.total.statements.covered, summary.total.statements.total)
    });
  }

  for (const [filePath, metrics] of Object.entries(summary)) {
    if (filePath === "total" || seenFiles.has(filePath) || shouldExclude(filePath)) {
      continue;
    }

    seenFiles.add(filePath);

    for (const key of Object.keys(aggregate)) {
      aggregate[key].covered += metrics[key].covered;
      aggregate[key].total += metrics[key].total;
    }
  }
}

const results = Object.fromEntries(
  Object.entries(aggregate).map(([key, metric]) => [
    key,
    formatMetric(metric.covered, metric.total)
  ])
);

for (const [metric, percentage] of Object.entries(results)) {
  if (percentage < threshold) {
    throw new Error(
      `Repo-wide ${metric} coverage ${percentage}% is below the ${threshold}% target.`
    );
  }
}

console.log("Package unit coverage");
for (const metrics of packageMetrics.sort((left, right) => left.name.localeCompare(right.name))) {
  console.log(
    `- ${metrics.name}: lines ${metrics.lines}% | branches ${metrics.branches}% | functions ${metrics.functions}% | statements ${metrics.statements}%`
  );
}

if (excludedFiles.size > 0) {
  console.log("Aggregate exclusions");
  for (const excludedFile of [...excludedFiles].sort()) {
    console.log(`- ${path.relative(rootDir, excludedFile)}`);
  }
}

console.log("Repo-wide unit coverage");
for (const [metric, percentage] of Object.entries(results)) {
  console.log(`- ${metric}: ${percentage}%`);
}
