import pg from "pg";
import type { QueryResultRow } from "pg";
import { getDatabaseUrl } from "@/lib/deployment";

type QueryParams = Array<string | number | boolean | Date | null | string[]>;

function createClient() {
  const connectionString = getDatabaseUrl();

  if (!connectionString) {
    throw new Error("DATABASE_URL is required for the PostgreSQL-backed MGER board.");
  }

  return new pg.Client({
    connectionString,
    connectionTimeoutMillis: 10_000,
    query_timeout: 60_000,
  });
}

export async function dbQuery<T extends QueryResultRow>(text: string, values: QueryParams = []) {
  const client = createClient();

  await client.connect();

  try {
    return await client.query<T>(text, values);
  } finally {
    await client.end().catch(() => undefined);
  }
}

export async function dbTransaction<T>(
  run: (client: pg.Client) => Promise<T>,
) {
  const client = createClient();

  await client.connect();

  try {
    await client.query("begin");
    const result = await run(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await client.end().catch(() => undefined);
  }
}
