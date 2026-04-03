import { bootOperatorConsole } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Operator console root element was not found.");
}

void bootOperatorConsole({
  location: window.location,
  root,
  storage: window.localStorage
});
