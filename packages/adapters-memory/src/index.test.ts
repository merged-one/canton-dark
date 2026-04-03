import { describe, expect, it } from "vitest";

import { createInMemoryVenueRegistry } from "./index";

describe("createInMemoryVenueRegistry", () => {
  it("returns cloned drafts instead of shared references", () => {
    const registry = createInMemoryVenueRegistry({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });

    const draft = registry.get();
    draft.dealers.push("dealer-beta");

    expect(registry.get().dealers).toEqual(["dealer-alpha"]);
  });

  it("replaces the stored draft", () => {
    const registry = createInMemoryVenueRegistry({
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      marketingLabel: "Canton Dark Pair"
    });

    registry.replace({
      mode: "ATSPair",
      operatorId: "operator-2",
      dealers: ["dealer-alpha", "dealer-beta"],
      marketingLabel: "Canton Dark ATS"
    });

    expect(registry.get()).toEqual({
      mode: "ATSPair",
      operatorId: "operator-2",
      dealers: ["dealer-alpha", "dealer-beta"],
      marketingLabel: "Canton Dark ATS"
    });
  });
});
