import { bootDemoOrchestrator } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Demo orchestrator root element was not found.");
}

void bootDemoOrchestrator({
  location: window.location,
  root,
  storage: window.localStorage
});
