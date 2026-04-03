import { describe, expect, it, vi } from "vitest";

import { bootDealerWorkbench } from "./app";

vi.mock("@canton-dark/ui-sdk", () => ({
  mountDealerWorkbench: vi.fn(async () => undefined)
}));

describe("bootDealerWorkbench", () => {
  it("delegates to the shared UI SDK controller", async () => {
    const { mountDealerWorkbench } = await import("@canton-dark/ui-sdk");
    const root = document.createElement("div");

    await bootDealerWorkbench({ root });

    expect(mountDealerWorkbench).toHaveBeenCalledWith({ root });
  });
});
