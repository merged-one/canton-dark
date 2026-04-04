import { createServer } from "node:http";

import {
  createCorrelationId,
  createStructuredLogger,
  type StructuredLog,
  type TelemetrySink
} from "@canton-dark/telemetry";

import { createVenueApiApp } from "./app";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4301);
const logLevelOrder = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
} as const;
const minimumLogLevel = process.env.VENUE_API_LOG_LEVEL ?? "info";
let correlationSequence = 0;

const telemetrySink: TelemetrySink = {
  record(entry: StructuredLog) {
    if (logLevelOrder[entry.level] < logLevelOrder[minimumLogLevel as keyof typeof logLevelOrder]) {
      return;
    }

    const serialized = JSON.stringify(entry);

    if (entry.level === "error" || entry.level === "warn") {
      console.error(serialized);
      return;
    }

    console.log(serialized);
  }
};
const logger = createStructuredLogger({
  clock: {
    now: () => new Date()
  },
  correlationId: "venue-api-startup",
  scope: "app",
  sink: telemetrySink
});
const api = await createVenueApiApp({
  ...((process.env.VENUE_API_BOOTSTRAP_MODE === "empty" ||
    process.env.VENUE_API_BOOTSTRAP_MODE === "phase1-complete" ||
    process.env.VENUE_API_BOOTSTRAP_MODE === "phase1-ready" ||
    process.env.VENUE_API_BOOTSTRAP_MODE === "phase2-ready" ||
    process.env.VENUE_API_BOOTSTRAP_MODE === "phase3-ready") && {
    bootstrapMode: process.env.VENUE_API_BOOTSTRAP_MODE
  }),
  ...(process.env.VENUE_API_SEED === undefined
    ? {}
    : {
        seed: Number(process.env.VENUE_API_SEED)
      }),
  ...(process.env.VENUE_API_START_AT === undefined
    ? {}
    : {
        startAt: process.env.VENUE_API_START_AT
      })
});

await logger.log("info", "venue-api.starting", {
  bootstrapMode: process.env.VENUE_API_BOOTSTRAP_MODE ?? "phase1-ready",
  host,
  port,
  seed: process.env.VENUE_API_SEED ?? "424242",
  startAt: process.env.VENUE_API_START_AT ?? "default"
});

createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type, x-actor-id, x-correlation-id");

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  let body = "";

  request.on("data", (chunk) => {
    body += String(chunk);
  });
  request.on("end", () => {
    void (async () => {
      const correlationId =
        typeof request.headers["x-correlation-id"] === "string" &&
        request.headers["x-correlation-id"].trim() !== ""
          ? request.headers["x-correlation-id"]
          : createCorrelationId("venue-api", ++correlationSequence);
      const requestLogger = logger.child("app", correlationId);
      const startedAt = Date.now();
      let parsedBody: unknown;

      if (body !== "") {
        try {
          parsedBody = JSON.parse(body) as unknown;
        } catch (error) {
          await requestLogger.log("warn", "http.request.invalid_json", {
            method: request.method ?? "GET",
            path: request.url ?? "/",
            durationMs: Date.now() - startedAt,
            error: error instanceof Error ? error.message : "Unknown JSON parse error"
          });
          response.statusCode = 400;
          response.setHeader("x-correlation-id", correlationId);
          response.setHeader("content-type", "application/json; charset=utf-8");
          response.end(
            JSON.stringify({
              message: "Request body must be valid JSON."
            })
          );
          return;
        }
      }

      await requestLogger.log("info", "http.request.started", {
        actorId:
          typeof request.headers["x-actor-id"] === "string" ? request.headers["x-actor-id"] : null,
        method: request.method ?? "GET",
        path: request.url ?? "/"
      });

      const reply = await api.handleRequest({
        method: request.method ?? "GET",
        url: request.url ?? "/",
        headers: {
          "x-actor-id":
            typeof request.headers["x-actor-id"] === "string"
              ? request.headers["x-actor-id"]
              : undefined,
          "x-correlation-id":
            typeof request.headers["x-correlation-id"] === "string"
              ? request.headers["x-correlation-id"]
              : correlationId
        },
        body: parsedBody
      });

      response.statusCode = reply.status;
      response.setHeader("x-correlation-id", correlationId);
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(reply.body));
      await requestLogger.log("info", "http.request.completed", {
        durationMs: Date.now() - startedAt,
        method: request.method ?? "GET",
        path: request.url ?? "/",
        status: reply.status
      });
    })().catch((error: unknown) => {
      const correlationId = createCorrelationId("venue-api", ++correlationSequence);
      response.statusCode = 500;
      response.setHeader("x-correlation-id", correlationId);
      response.setHeader("content-type", "application/json; charset=utf-8");
      void logger.child("app", correlationId).log("error", "http.request.failed", {
        error: error instanceof Error ? error.message : "Unknown error",
        method: request.method ?? "GET",
        path: request.url ?? "/"
      });
      response.end(
        JSON.stringify({
          message: error instanceof Error ? error.message : "Unknown error"
        })
      );
    });
  });
}).listen(port, host, () => {
  console.log(
    JSON.stringify({
      level: "info",
      message: "venue-api.listening",
      scope: "app",
      correlationId: "venue-api-startup",
      timestamp: new Date().toISOString(),
      attributes: {
        host,
        port,
        url: `http://${host}:${port}`
      }
    })
  );
});
