import { createServer } from "node:http";

import { createVenueApiApp } from "./app";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4301);
const api = await createVenueApiApp();

createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, POST, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type, x-actor-id");

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
      const reply = await api.handleRequest({
        method: request.method ?? "GET",
        url: request.url ?? "/",
        headers: {
          "x-actor-id":
            typeof request.headers["x-actor-id"] === "string"
              ? request.headers["x-actor-id"]
              : undefined
        },
        body: body === "" ? undefined : JSON.parse(body)
      });

      response.statusCode = reply.status;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(JSON.stringify(reply.body));
    })().catch((error: unknown) => {
      response.statusCode = 500;
      response.setHeader("content-type", "application/json; charset=utf-8");
      response.end(
        JSON.stringify({
          message: error instanceof Error ? error.message : "Unknown error"
        })
      );
    });
  });
}).listen(port, host, () => {
  console.log(`venue-api listening on http://${host}:${port}`);
});
