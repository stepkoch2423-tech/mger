import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

function normalizePostgresUrl(databaseUrl: string | undefined) {
  if (!databaseUrl) {
    return undefined;
  }

  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: normalizePostgresUrl(
      process.env["DATABASE_URL"] ??
        process.env["PRISMA_DATABASE_URL"] ??
        process.env["POSTGRES_PRISMA_URL"] ??
        process.env["POSTGRES_URL"],
    ),
  },
});
