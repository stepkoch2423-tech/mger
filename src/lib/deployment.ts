export const READ_ONLY_DEPLOYMENT_MESSAGE =
  "Публичная версия сейчас работает в режиме просмотра. Для входа и редактирования нужно подключить внешнюю базу данных и файловое хранилище.";

export function normalizePostgresUrl(databaseUrl: string) {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get("sslmode");

  if (sslMode === "prefer" || sslMode === "require" || sslMode === "verify-ca") {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

export function getDatabaseUrl() {
  const databaseUrl =
    process.env.DATABASE_URL ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL;

  return databaseUrl ? normalizePostgresUrl(databaseUrl) : undefined;
}

export function isReadOnlyDeployment() {
  return Boolean(process.env.VERCEL) && !getDatabaseUrl();
}
