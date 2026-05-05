import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSeedData } from "./seed.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const runtimeFilePath = process.env.DATA_FILE_PATH || path.join(__dirname, "runtime-db.json");

export async function writeSeedFile() {
  const seed = createSeedData();
  await fs.writeFile(runtimeFilePath, JSON.stringify(seed, null, 2), "utf8");
  return seed;
}

export async function ensureSeedFile() {
  try {
    await fs.access(runtimeFilePath);
  } catch {
    await writeSeedFile();
  }
}

export async function readSeedFile() {
  await ensureSeedFile();
  const raw = await fs.readFile(runtimeFilePath, "utf8");
  return JSON.parse(raw);
}

export async function writeSeedData(data) {
  await fs.writeFile(runtimeFilePath, JSON.stringify(data, null, 2), "utf8");
  return data;
}

export function describeSeedTarget() {
  return runtimeFilePath;
}
