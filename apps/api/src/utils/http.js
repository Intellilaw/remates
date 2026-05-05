import fs from "node:fs/promises";
import path from "node:path";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

export function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

export function sendText(res, statusCode, payload, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Cache-Control": "no-store"
  });
  res.end(payload);
}

export async function readJsonBody(req, maxBytes = 1024 * 1024) {
  const chunks = [];
  let total = 0;

  for await (const chunk of req) {
    total += chunk.length;
    if (total > maxBytes) {
      throw new Error("Payload too large");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

export async function serveFile(res, filePath) {
  const buffer = await fs.readFile(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const isAsset = [".css", ".js"].includes(ext);

  res.writeHead(200, {
    "Content-Type": contentType,
    "Cache-Control": ext === ".html" || isAsset ? "no-store" : "public, max-age=3600"
  });
  res.end(buffer);
}

export function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
}

export function notFound(res, message = "Not found") {
  sendJson(res, 404, { error: message });
}

export function methodNotAllowed(res) {
  sendJson(res, 405, { error: "Method not allowed" });
}

export function unauthorized(res, message = "Unauthorized") {
  sendJson(res, 401, { error: message });
}

export function forbidden(res, message = "Forbidden") {
  sendJson(res, 403, { error: message });
}

export function badRequest(res, message = "Bad request") {
  sendJson(res, 400, { error: message });
}
