import { describe, expect, it } from "vitest";

import { createCorrelationId, createInMemoryTelemetrySink, createStructuredLogger } from "./index";

describe("telemetry helpers", () => {
  it("creates deterministic correlation ids", () => {
    expect(createCorrelationId("pair", 12)).toBe("pair-000012");
    expect(createCorrelationId(" ", 1)).toBe("corr-000001");
  });

  it("records and drains structured logs through the in-memory sink", async () => {
    const sink = createInMemoryTelemetrySink();
    const logger = createStructuredLogger({
      clock: {
        now: () => new Date("2026-04-02T00:00:00.000Z")
      },
      sink,
      scope: "app",
      correlationId: "corr-000001"
    });
    const child = logger.child("adapter", "corr-000002");

    expect(await logger.log("info", "booted")).toEqual({
      level: "info",
      message: "booted",
      scope: "app",
      correlationId: "corr-000001",
      timestamp: "2026-04-02T00:00:00.000Z"
    });
    expect(await child.log("warn", "delayed", { attempts: 2, healthy: false })).toEqual({
      level: "warn",
      message: "delayed",
      scope: "adapter",
      correlationId: "corr-000002",
      timestamp: "2026-04-02T00:00:00.000Z",
      attributes: {
        attempts: 2,
        healthy: false
      }
    });
    expect(sink.entries()).toEqual([
      {
        level: "info",
        message: "booted",
        scope: "app",
        correlationId: "corr-000001",
        timestamp: "2026-04-02T00:00:00.000Z"
      },
      {
        level: "warn",
        message: "delayed",
        scope: "adapter",
        correlationId: "corr-000002",
        timestamp: "2026-04-02T00:00:00.000Z",
        attributes: {
          attempts: 2,
          healthy: false
        }
      }
    ]);
    expect(sink.drain()).toEqual([
      {
        level: "info",
        message: "booted",
        scope: "app",
        correlationId: "corr-000001",
        timestamp: "2026-04-02T00:00:00.000Z"
      },
      {
        level: "warn",
        message: "delayed",
        scope: "adapter",
        correlationId: "corr-000002",
        timestamp: "2026-04-02T00:00:00.000Z",
        attributes: {
          attempts: 2,
          healthy: false
        }
      }
    ]);
    expect(sink.entries()).toEqual([]);
  });
});
