import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.join(root, "apps", "shared", "app-version.js");
const destinations = [
  path.join(root, "apps", "mobile", "assets", "app-version.js"),
  path.join(root, "apps", "web", "assets", "app-version.js"),
  path.join(root, "apps", "admin", "assets", "app-version.js")
];

await Promise.all(
  destinations.map(async (destination) => {
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.copyFile(source, destination);
  })
);
