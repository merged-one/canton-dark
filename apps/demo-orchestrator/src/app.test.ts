import { describe, expect, it, vi } from "vitest";

import { bootDemoOrchestrator } from "./app";

vi.mock("@canton-dark/ui-sdk", () => ({
  mountDemoOrchestrator: vi.fn(async () => undefined)
}));

describe("bootDemoOrchestrator", () => {
  it("delegates to the shared UI SDK controller", async () => {
    const { mountDemoOrchestrator } = await import("@canton-dark/ui-sdk");
    const root = document.createElement("div");

    await bootDemoOrchestrator({ root });

    expect(mountDemoOrchestrator).toHaveBeenCalledWith({ root });
  });
});
