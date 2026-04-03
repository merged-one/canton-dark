import { describe, expect, it } from "vitest";

import { VenueApiClientError } from "./api-client";
import { readValue, resolveApiBaseUrl, toErrorMessage } from "./shared";

describe("shared helpers", () => {
  it("resolves the API base URL from input or falls back to the local default", () => {
    expect(resolveApiBaseUrl("http://custom.test")).toBe("http://custom.test");
    expect(resolveApiBaseUrl()).toBe("http://127.0.0.1:4301");
  });

  it("normalizes error messages", () => {
    expect(
      toErrorMessage(
        new VenueApiClientError(403, {
          message: "Denied."
        })
      )
    ).toBe("Denied.");
    expect(toErrorMessage(new Error("Boom."))).toBe("Boom.");
    expect(toErrorMessage("nope")).toBe("Unexpected error");
  });

  it("reads field values and throws for missing inputs", () => {
    const root = document.createElement("div");

    root.innerHTML = '<input id="field" value="value-1" />';

    expect(readValue(root, "#field")).toBe("value-1");
    expect(() => readValue(root, "#missing")).toThrow("Expected field #missing to exist.");
  });
});
