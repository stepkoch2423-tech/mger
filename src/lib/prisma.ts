import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { getDatabaseUrl } from "@/lib/deployment";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function requireDatabaseUrl() {
  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required for the PostgreSQL-backed MGER board.");
  }

  return databaseUrl;
}

function createPrismaClient() {
  const adapter = new PrismaPg({
    connectionString: requireDatabaseUrl(),
    connectionTimeoutMillis: 10_000,
    query_timeout: 20_000,
  });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient();
  }

  return globalForPrisma.prisma;
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    const client = getPrismaClient();
    const value = Reflect.get(client, property, client);

    return typeof value === "function" ? value.bind(client) : value;
  },
});
