import { runDemoStack, type DemoPhase } from "./lib/demo";

const phase = process.argv[2];

if (phase !== "phase1" && phase !== "phase2" && phase !== "phase3") {
  throw new Error("Usage: tsx scripts/run-demo-stack.ts <phase1|phase2|phase3>");
}

await runDemoStack(phase as DemoPhase);
