import { bootDealerWorkbench } from "./app";

const root = document.querySelector<HTMLElement>("#app");

if (!root) {
  throw new Error("Dealer workbench root element was not found.");
}

void bootDealerWorkbench({
  location: window.location,
  root,
  storage: window.localStorage
});
