import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { ensureDb } from "./data/store.js";
import { handleApi } from "./routes/api/index.js";
import { handleStatic } from "./routes/static-routes.js";
import { sendJson, sendText, setCorsHeaders } from "./utils/http.js";

export async function requestHandler(req, res) {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      return sendText(res, 204, "");
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/")) {
      return await handleApi(req, res, pathname);
    }

    return await handleStatic(res, pathname);
  } catch (error) {
    return sendJson(res, 500, {
      error: "Internal server error",
      detail: config.appEnv === "development" ? error.message : undefined
    });
  }
}

await ensureDb();

export const server = http.createServer(requestHandler);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(config.port, () => {
    process.stdout.write(`Remates platform running at http://localhost:${config.port}
`);
  });
}
