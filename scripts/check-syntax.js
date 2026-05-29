import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ignoredDirs = new Set([".git", "node_modules", ".terraform"]);
const jsFiles = [];
const sharedAssets = ["app-version.js", "court-options.js"];
const syncedAssetRoots = [
  path.join("apps", "web", "assets"),
  path.join("apps", "admin", "assets"),
  path.join("apps", "mobile", "assets"),
  path.join("android", "app", "src", "main", "assets", "public", "assets")
];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (ignoredDirs.has(entry.name)) {
      continue;
    }

    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
    } else if (entry.isFile() && entry.name.endsWith(".js")) {
      jsFiles.push(fullPath);
    }
  }
}

walk(root);

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: root,
    encoding: "utf8"
  });

  if (result.status !== 0) {
    process.stderr.write(result.stderr || result.stdout);
    process.exit(result.status || 1);
  }
}

for (const assetName of sharedAssets) {
  const sourcePath = path.join(root, "apps", "shared", assetName);
  const source = fs.readFileSync(sourcePath, "utf8");

  for (const targetRoot of syncedAssetRoots) {
    const targetPath = path.join(root, targetRoot, assetName);
    if (!fs.existsSync(targetPath)) {
      continue;
    }

    const target = fs.readFileSync(targetPath, "utf8");
    if (target !== source) {
      process.stderr.write(
        `${path.relative(root, targetPath)} is out of sync with apps/shared/${assetName}. Run npm run sync:shared-assets.\n`
      );
      process.exit(1);
    }
  }
}

process.stdout.write(`Checked ${jsFiles.length} JavaScript files.\n`);
