import { bootSubscriberTerminal } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Subscriber terminal root element was not found.");
}

void bootSubscriberTerminal({
  location: window.location,
  root,
  storage: window.localStorage
});
