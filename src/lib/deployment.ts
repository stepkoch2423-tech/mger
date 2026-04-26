export const READ_ONLY_DEPLOYMENT_MESSAGE =
  "Публичная версия сейчас работает в режиме просмотра. Для входа и редактирования нужно подключить внешнюю базу данных и файловое хранилище.";

export function isReadOnlyDeployment() {
  return Boolean(process.env.VERCEL) && !process.env.DATABASE_URL;
}
