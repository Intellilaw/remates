import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedAssets = ["app-version.js", "court-options.js"];
const assetTargets = ["mobile", "web", "admin"];
const capacitorPublicAssets = path.join(root, "android", "app", "src", "main", "assets", "public", "assets");

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function copyWithRetry(source, destination) {
  await fs.mkdir(path.dirname(destination), { recursive: true });

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    try {
      await fs.writeFile(destination, await fs.readFile(source, "utf8"));
      return;
    } catch (error) {
      if (attempt === 5 || !["UNKNOWN", "EBUSY", "EPERM"].includes(error.code)) {
        throw error;
      }
      await wait(150 * attempt);
    }
  }
}

for (const fileName of sharedAssets) {
  const source = path.join(root, "apps", "shared", fileName);

  for (const appName of assetTargets) {
    await copyWithRetry(source, path.join(root, "apps", appName, "assets", fileName));
  }

  try {
    await fs.access(capacitorPublicAssets);
    await copyWithRetry(source, path.join(capacitorPublicAssets, fileName));
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}
