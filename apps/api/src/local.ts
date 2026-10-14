// Local dev server: wraps the same dispatch the Lambda handler uses.
import { createServer } from "node:http";
import { logger } from "./lib/logger";
import { dispatch } from "./router";

const DEFAULT_PORT = 3001;
const HOST = "127.0.0.1";
// Mirrors a sane API payload ceiling so a runaway client cannot exhaust memory.
const MAX_BODY_BYTES = 1024 * 1024;
const port = Number(process.env.PORT) || DEFAULT_PORT;

const server = createServer(async (req, res) => {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    size += (chunk as Buffer).length;
    if (size > MAX_BODY_BYTES) {
      res.writeHead(413, { "content-type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: { code: "VALIDATION_FAILED", message: "Body too large" } }));
      req.destroy();
      return;
    }
    chunks.push(chunk as Buffer);
  }
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);

  const response = await dispatch({
    method: req.method ?? "GET",
    path: url.pathname,
    query: Object.fromEntries(url.searchParams),
    headers: Object.fromEntries(
      Object.entries(req.headers).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.join(",") : value,
      ]),
    ),
    rawBody: chunks.length ? Buffer.concat(chunks).toString("utf8") : undefined,
  });

  res.writeHead(response.status, { "content-type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(response.body));
});

server.listen(port, HOST, () => logger.info(`API listening on http://${HOST}:${port}`));
