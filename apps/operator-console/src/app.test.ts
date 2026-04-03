import { describe, expect, it, vi } from "vitest";

import { bootOperatorConsole } from "./app";

vi.mock("@canton-dark/ui-sdk", () => ({
  mountOperatorConsole: vi.fn(async () => undefined)
}));

describe("bootOperatorConsole", () => {
  it("delegates to the shared UI SDK controller", async () => {
    const { mountOperatorConsole } = await import("@canton-dark/ui-sdk");
    const root = document.createElement("div");

    await bootOperatorConsole({ root });

    expect(mountOperatorConsole).toHaveBeenCalledWith({ root });
  });
});
