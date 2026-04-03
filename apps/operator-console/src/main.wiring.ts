import { bootOperatorConsole } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Operator console root element was not found.");
}

void bootOperatorConsole({ root });
