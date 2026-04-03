import { createServer } from "node:http";

import { handleRequest } from "./app";

const host = process.env.HOST ?? "127.0.0.1";
const port = Number(process.env.PORT ?? 4301);

createServer((request, response) => {
  response.setHeader("access-control-allow-origin", "*");
  response.setHeader("access-control-allow-methods", "GET, OPTIONS");
  response.setHeader("access-control-allow-headers", "content-type");

  if (request.method === "OPTIONS") {
    response.statusCode = 204;
    response.end();
    return;
  }

  const reply = handleRequest(request.url ?? "/");

  response.statusCode = reply.status;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(reply.body));
}).listen(port, host, () => {
  console.log(`venue-api listening on http://${host}:${port}`);
});
