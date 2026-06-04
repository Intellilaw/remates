import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sharedAssets = ["app-version.js", "court-options.js"];
const assetTargets = ["mobile", "web", "admin"];
const capacitorPublicAssets = path.join(root, "android", "app", "src", "main", "assets", "public", "assets");
const shellFiles = [
  path.join(root, "apps", "web", "index.html"),
  path.join(root, "apps", "web", "dashboard.html"),
  path.join(root, "apps", "admin", "index.html"),
  path.join(root, "apps", "mobile", "index.html")
];

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

function readVersion(source) {
  const match = source.match(/REMATES_APP_VERSION\s*=\s*"([^"]+)"/);
  if (!match) {
    throw new Error("Unable to read REMATES_APP_VERSION from apps/shared/app-version.js");
  }
  return match[1];
}

async function updateShellAssetVersions(version) {
  for (const shellFile of shellFiles) {
    const html = await fs.readFile(shellFile, "utf8");
    const updated = html.replace(
      /((?:href|src)="[^"]+\.(?:css|js))(?:\?v=[^"]*)?(")/g,
      `$1?v=${version}$2`
    );
    if (updated !== html) {
      await fs.writeFile(shellFile, updated, "utf8");
    }
  }
}

const appVersionSource = await fs.readFile(path.join(root, "apps", "shared", "app-version.js"), "utf8");
const appVersion = readVersion(appVersionSource);

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

await updateShellAssetVersions(appVersion);
