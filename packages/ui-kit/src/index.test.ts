import { describe, expect, it } from "vitest";

import { joinList, statusToneClass } from "./index";

describe("ui-kit helpers", () => {
  it("formats empty and populated lists", () => {
    expect(joinList([])).toBe("none");
    expect(joinList(["dealer-a", "dealer-b"])).toBe("dealer-a, dealer-b");
  });

  it("maps venue status to a tone class", () => {
    expect(statusToneClass("healthy")).toBe("tone-ok");
    expect(statusToneClass("paused")).toBe("tone-warn");
    expect(statusToneClass("rejected")).toBe("tone-alert");
  });
});
