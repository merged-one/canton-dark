import { phaseModes, seedDemoMode } from "./lib/demo";

const argument = process.argv[2];

if (
  argument !== "phase1" &&
  argument !== "phase2" &&
  argument !== "phase3" &&
  argument !== "phase1-ready" &&
  argument !== "phase2-ready" &&
  argument !== "phase3-ready"
) {
  throw new Error(
    "Usage: tsx scripts/demo-seed.ts <phase1|phase2|phase3|phase1-ready|phase2-ready|phase3-ready>"
  );
}

const mode =
  argument === "phase1" || argument === "phase2" || argument === "phase3"
    ? phaseModes[argument]
    : argument;

await seedDemoMode(mode);
