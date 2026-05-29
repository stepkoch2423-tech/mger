import { config } from "dotenv";
import { hash } from "bcryptjs";
import pg from "pg";
import { managedAccounts } from "./accounts";

config({ path: ".env.local" });
config();

function normalizePostgresUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

const databaseUrl =
  process.env.PRISMA_DATABASE_URL ??
  process.env.DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed accounts.");
}

const resolvedDatabaseUrl = databaseUrl;

async function main() {
  for (const account of managedAccounts) {
    const client = new pg.Client({
      connectionString: normalizePostgresUrl(resolvedDatabaseUrl),
      connectionTimeoutMillis: 10_000,
      query_timeout: 60_000,
    });
    const accountData = account as Record<string, string | number | null>;
    const passwordHash = await hash(account.password, 10);

    await client.connect();
    await client.query(
      `
        insert into "User" (
          id, name, email, "passwordHash", role, "firstName", "lastName", patronymic,
          "birthYear", education, headquarters, about, achievements, "avatarUrl",
          "isBlocked", "createdAt", "updatedAt"
        )
        values (
          concat('user_', md5($2)), $1, lower($2), $3, $4::"Role", $5, $6, $7,
          $8, $9, $10, $11, $12, $13, false, now(), now()
        )
        on conflict (email) do update set
          name = excluded.name,
          "passwordHash" = excluded."passwordHash",
          role = excluded.role,
          "firstName" = excluded."firstName",
          "lastName" = excluded."lastName",
          patronymic = excluded.patronymic,
          "birthYear" = excluded."birthYear",
          education = excluded.education,
          headquarters = excluded.headquarters,
          about = excluded.about,
          achievements = excluded.achievements,
          "avatarUrl" = excluded."avatarUrl",
          "isBlocked" = false,
          "updatedAt" = now()
      `,
      [
        account.name,
        account.email,
        passwordHash,
        account.role,
        account.firstName,
        account.lastName,
        accountData.patronymic ?? null,
        accountData.birthYear ?? 2004,
        accountData.education ?? "Активист штаба МГЕР",
        accountData.headquarters ?? "Региональный штаб",
        accountData.about ?? "Использует доску для просмотра календаря и участия в мероприятиях.",
        accountData.achievements ?? "Участвует в работе штаба и мероприятиях команды.",
        account.avatarUrl,
      ],
    );

    console.log(`${account.email}: updated`);
    await client.end();
  }
}

main()
  .then(() => undefined)
  .catch(async (error) => {
    console.error(error);
    process.exit(1);
  });
