import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedAssets = ["app-version.js", "court-options.js"];
const assetTargets = ["mobile", "web", "admin"];

await Promise.all(
  sharedAssets.flatMap((fileName) => {
    const source = path.join(root, "apps", "shared", fileName);
    return assetTargets.map(async (appName) => {
      const destination = path.join(root, "apps", appName, "assets", fileName);
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.copyFile(source, destination);
    });
  })
);
