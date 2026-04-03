import { describe, expect, it } from "vitest";

import { buildRoleUrl, resolvePairId, resolveSession, saveSession } from "./auth";

const createStorage = () => {
  const values = new Map<string, string>();

  return {
    getItem(key: string) {
      return values.get(key) ?? null;
    },
    setItem(key: string, value: string) {
      values.set(key, value);
    }
  };
};

describe("auth helpers", () => {
  it("resolves, persists, and overrides demo sessions", () => {
    const storage = createStorage();

    expect(resolveSession("operator", storage, undefined)).toEqual({
      actorId: "operator-demo",
      role: "operator"
    });

    saveSession(
      {
        actorId: "operator-custom",
        role: "operator"
      },
      storage
    );

    expect(resolveSession("operator", storage, undefined)).toEqual({
      actorId: "operator-custom",
      role: "operator"
    });
    expect(
      resolveSession("subscriber", storage, new URL("http://localhost/?actorId=subscriber-2"))
    ).toEqual({
      actorId: "subscriber-2",
      role: "subscriber"
    });
    expect(resolvePairId("pair-demo", new URL("http://localhost/?pairId=pair-2"))).toBe("pair-2");
  });

  it("builds stable launch URLs", () => {
    expect(
      buildRoleUrl({
        actorId: "dealer-alpha",
        pairId: "pair-demo",
        role: "dealer"
      })
    ).toBe("http://127.0.0.1:4175/?actorId=dealer-alpha&pairId=pair-demo");
  });

  it("falls back when stored session data is malformed or mismatched", () => {
    const storage = createStorage();

    storage.setItem("canton-dark.demo.session.operator", "{bad json");
    expect(resolveSession("operator", storage, undefined)).toEqual({
      actorId: "operator-demo",
      role: "operator"
    });

    storage.setItem(
      "canton-dark.demo.session.subscriber",
      JSON.stringify({
        actorId: "operator-demo",
        role: "operator"
      })
    );
    expect(resolveSession("subscriber", storage, undefined)).toEqual({
      actorId: "subscriber-1",
      role: "subscriber"
    });
    expect(resolvePairId("pair-fallback", undefined)).toBe("pair-fallback");
  });
});
