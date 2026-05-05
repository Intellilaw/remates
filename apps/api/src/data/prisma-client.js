const databaseUrl = process.env.DATABASE_URL || "";

let prismaPromise = null;

export function hasDatabaseUrl() {
  return Boolean(databaseUrl);
}

export async function getPrisma() {
  if (!databaseUrl) {
    return null;
  }

  if (!prismaPromise) {
    prismaPromise = import("@prisma/client").then(({ PrismaClient }) => new PrismaClient());
  }

  return prismaPromise;
}
