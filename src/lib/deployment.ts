export const READ_ONLY_DEPLOYMENT_MESSAGE =
  "Публичная версия сейчас работает в режиме просмотра. Для входа и редактирования нужно подключить внешнюю базу данных и файловое хранилище.";

export function getDatabaseUrl() {
  return (
    process.env.DATABASE_URL ??
    process.env.PRISMA_DATABASE_URL ??
    process.env.POSTGRES_PRISMA_URL ??
    process.env.POSTGRES_URL
  );
}

export function isReadOnlyDeployment() {
  return Boolean(process.env.VERCEL) && !getDatabaseUrl();
}
