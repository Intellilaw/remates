import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serveFile } from "../utils/http.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../../../web");
const adminRoot = path.resolve(__dirname, "../../../admin");

export async function handleStatic(res, pathname) {
  if (pathname === "/admin" || pathname === "/admin/") {
    return serveFile(res, path.join(adminRoot, "index.html"));
  }

  if (pathname.startsWith("/admin/assets/")) {
    return serveFile(res, path.join(adminRoot, pathname.replace("/admin/", "")));
  }

  if (pathname.startsWith("/assets/")) {
    return serveFile(res, path.join(webRoot, pathname));
  }

  if (pathname === "/dashboard" || pathname === "/dashboard/") {
    return serveFile(res, path.join(webRoot, "dashboard.html"));
  }

  if (pathname === "/" || pathname === "/index.html" || pathname.startsWith("/property/")) {
    return serveFile(res, path.join(webRoot, "index.html"));
  }

  const safePath = path.join(webRoot, pathname);
  try {
    await fs.access(safePath);
    return serveFile(res, safePath);
  } catch {
    return serveFile(res, path.join(webRoot, "index.html"));
  }
}
