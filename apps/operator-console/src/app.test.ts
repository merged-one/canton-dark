import { describe, expect, it, vi } from "vitest";

import type { HealthResponse } from "@canton-dark/api-contracts";

import { bootOperatorConsole, loadHealthResponse } from "./app";

const responsePayload: HealthResponse = {
  service: "venue-api",
  generatedAt: "2026-04-02T00:00:00.000Z",
  venue: {
    title: "SingleDealerPair bootstrap",
    status: "healthy",
    detail: "Operator operator-1 has 1 directed dealer configured.",
    summary: {
      mode: "SingleDealerPair",
      operatorId: "operator-1",
      dealers: ["dealer-alpha"],
      ledgerFacts: ["Shared RFQ state"],
      offLedgerFacts: ["Operator analytics"]
    },
    violations: []
  }
};

describe("bootOperatorConsole", () => {
  it("uses the default API base URL when one is not provided", async () => {
    const fetchImpl = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => responsePayload
      } as Response;
    });

    await expect(loadHealthResponse(fetchImpl)).resolves.toEqual(responsePayload);
    expect(fetchImpl).toHaveBeenCalledWith("http://127.0.0.1:4301/health");
  });

  it("renders health details after the API responds", async () => {
    const root = document.createElement("div");
    const fetchImpl = vi.fn(async () => {
      return {
        ok: true,
        status: 200,
        json: async () => responsePayload
      } as Response;
    });

    await bootOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl,
      root
    });

    expect(fetchImpl).toHaveBeenCalledWith("http://unit.test/health");
    expect(root.textContent).toContain("Operator Console");
    expect(root.textContent).toContain("SingleDealerPair bootstrap");
    expect(root.textContent).toContain("No policy violations.");
  });

  it("renders a failure state when the API call fails", async () => {
    const root = document.createElement("div");
    const fetchImpl = vi.fn(async () => {
      return {
        ok: false,
        status: 503,
        json: async () => ({})
      } as Response;
    });

    await bootOperatorConsole({
      apiBaseUrl: "http://unit.test",
      fetchImpl,
      root
    });

    expect(root.textContent).toContain("Unable to load venue health.");
  });

  it("throws when the shell cannot provide a health panel mount point", async () => {
    const root = {
      innerHTML: "",
      querySelector: () => null
    } as unknown as HTMLElement;

    await expect(
      bootOperatorConsole({
        apiBaseUrl: "http://unit.test",
        fetchImpl: vi.fn() as typeof fetch,
        root
      })
    ).rejects.toThrow("Venue health panel is missing from the operator console shell.");
  });
});
