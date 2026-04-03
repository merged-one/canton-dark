import { describe, expect, it, vi } from "vitest";

import { bootSubscriberTerminal } from "./app";

vi.mock("@canton-dark/ui-sdk", () => ({
  mountSubscriberTerminal: vi.fn(async () => undefined)
}));

describe("bootSubscriberTerminal", () => {
  it("delegates to the shared UI SDK controller", async () => {
    const { mountSubscriberTerminal } = await import("@canton-dark/ui-sdk");
    const root = document.createElement("div");

    await bootSubscriberTerminal({ root });

    expect(mountSubscriberTerminal).toHaveBeenCalledWith({ root });
  });
});
