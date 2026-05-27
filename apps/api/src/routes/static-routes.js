import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { redirect, serveFile } from "../utils/http.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const webRoot = path.resolve(__dirname, "../../../web");
const adminRoot = path.resolve(__dirname, "../../../admin");
const mobileRoot = path.resolve(__dirname, "../../../mobile");
const sharedRoot = path.resolve(__dirname, "../../../shared");
const sharedAssetNames = new Set(["app-version.js", "court-options.js"]);

function sharedAssetPath(pathname, prefix) {
  const assetName = pathname.startsWith(prefix) ? pathname.slice(prefix.length) : "";
  return sharedAssetNames.has(assetName) ? path.join(sharedRoot, assetName) : "";
}

export async function handleStatic(res, pathname) {
  if (pathname === "/admin" || pathname === "/admin/") {
    return serveFile(res, path.join(adminRoot, "index.html"));
  }

  if (pathname === "/mobile") {
    return redirect(res, "/mobile/");
  }

  if (pathname === "/mobile/") {
    return serveFile(res, path.join(mobileRoot, "index.html"));
  }

  if (pathname.startsWith("/admin/assets/")) {
    const sharedAsset = sharedAssetPath(pathname, "/admin/assets/");
    if (sharedAsset) {
      return serveFile(res, sharedAsset);
    }

    return serveFile(res, path.join(adminRoot, pathname.replace("/admin/", "")));
  }

  if (pathname.startsWith("/mobile/assets/")) {
    const sharedAsset = sharedAssetPath(pathname, "/mobile/assets/");
    if (sharedAsset) {
      return serveFile(res, sharedAsset);
    }

    return serveFile(res, path.join(mobileRoot, pathname.replace("/mobile/", "")));
  }

  if (pathname.startsWith("/mobile/")) {
    return serveFile(res, path.join(mobileRoot, pathname.replace("/mobile/", "")));
  }

  if (pathname.startsWith("/assets/")) {
    const sharedAsset = sharedAssetPath(pathname, "/assets/");
    if (sharedAsset) {
      return serveFile(res, sharedAsset);
    }

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
