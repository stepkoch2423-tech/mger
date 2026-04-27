import { config } from "dotenv";
import { defineConfig } from "prisma/config";

config({ path: ".env.local" });
config();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url:
      process.env["DATABASE_URL"] ??
      process.env["PRISMA_DATABASE_URL"] ??
      process.env["POSTGRES_PRISMA_URL"] ??
      process.env["POSTGRES_URL"],
  },
});
