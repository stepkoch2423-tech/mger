import { copyFileSync, existsSync, mkdirSync } from "fs";
import { tmpdir } from "os";
import { join, resolve } from "path";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "@prisma/client";
import { isReadOnlyDeployment } from "@/lib/deployment";

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function resolveDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  if (!isReadOnlyDeployment()) {
    return "file:./dev.db";
  }

  const bundledDatabasePath = resolve(process.cwd(), "dev.db");
  const runtimeDirectory = join(tmpdir(), "mger-board");
  const runtimeDatabasePath = join(runtimeDirectory, "dev.db");

  if (existsSync(bundledDatabasePath) && !existsSync(runtimeDatabasePath)) {
    mkdirSync(runtimeDirectory, { recursive: true });
    copyFileSync(bundledDatabasePath, runtimeDatabasePath);
  }

  return `file:${runtimeDatabasePath}`;
}

const databaseUrl = resolveDatabaseUrl();
const adapter = new PrismaBetterSqlite3({ url: databaseUrl });

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
