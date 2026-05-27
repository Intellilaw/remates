import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import { ensureDb } from "./data/store.js";
import { handleApi } from "./routes/api/index.js";
import { handleStatic } from "./routes/static-routes.js";
import { proxyApiRequest } from "./utils/api-proxy.js";
import { sendJson, sendText, setCorsHeaders } from "./utils/http.js";

export async function requestHandler(req, res) {
  try {
    setCorsHeaders(res);

    if (req.method === "OPTIONS") {
      return sendText(res, 204, "");
    }

    const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
    const pathname = url.pathname;

    if (pathname === "/api/health" && config.localApiProxyUrl) {
      return sendJson(res, 200, {
        ok: true,
        env: config.appEnv,
        apiMode: "proxy",
        upstream: config.localApiProxyUrl
      });
    }

    if (pathname.startsWith("/api/") && config.localApiProxyUrl) {
      return proxyApiRequest(req, res, config.localApiProxyUrl);
    }

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

if (!config.localApiProxyUrl) {
  await ensureDb();
}

export const server = http.createServer(requestHandler);

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(config.port, () => {
    process.stdout.write(`Remates platform running at http://localhost:${config.port}
`);
  });
}
