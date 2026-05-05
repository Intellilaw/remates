import { createSeedData } from "./seed.js";
import { getPrisma, hasDatabaseUrl } from "./prisma-client.js";
import { readPrismaState, writePrismaState } from "./prisma-state.js";
import { describeSeedTarget, ensureSeedFile, readSeedFile, writeSeedData, writeSeedFile } from "./json-store.js";

export async function ensureDb() {
  const prisma = await getPrisma();
  if (prisma) {
    const roleCount = await prisma.role.count();
    if (roleCount === 0) {
      await writePrismaState(prisma, createSeedData());
    }
    return;
  }

  await ensureSeedFile();
}

export async function readDb() {
  const prisma = await getPrisma();
  if (prisma) {
    await ensureDb();
    return readPrismaState(prisma);
  }

  return readSeedFile();
}

export async function writeDb(data) {
  const prisma = await getPrisma();
  if (prisma) {
    await writePrismaState(prisma, data);
    return data;
  }

  return writeSeedData(data);
}

export async function mutateDb(mutator) {
  const db = await readDb();
  const updated = await mutator(structuredClone(db));
  await writeDb(updated);
  return updated;
}

export async function resetDb() {
  const prisma = await getPrisma();
  if (prisma) {
    const seed = createSeedData();
    await writePrismaState(prisma, seed);
    return seed;
  }

  return writeSeedFile();
}

if (process.argv.includes("--reset")) {
  await resetDb();
  const target = hasDatabaseUrl() ? "RDS PostgreSQL" : describeSeedTarget();
  process.stdout.write(`Demo database reset at ${target}\n`);
}
