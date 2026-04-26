import "dotenv/config";
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const databasePath = resolve(process.cwd(), "dev.db");

function run(command, env = {}) {
  execSync(command, {
    cwd: process.cwd(),
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });
}

function removeDatabaseArtifacts() {
  for (const suffix of ["", "-journal", "-shm", "-wal"]) {
    const filePath = `${databasePath}${suffix}`;
    if (existsSync(filePath)) {
      rmSync(filePath, { force: true });
    }
  }
}

removeDatabaseArtifacts();

const seedEnv = {
  DATABASE_URL: "file:./dev.db",
  SEED_PROFILE: "render",
  OWNER_EMAIL: process.env.OWNER_EMAIL ?? "admin@mger.local",
  OWNER_PASSWORD: process.env.OWNER_PASSWORD ?? "mger-admin-2026",
  OWNER_NAME: process.env.OWNER_NAME ?? "Кусков Матвей Максимович",
  OWNER_FIRST_NAME: process.env.OWNER_FIRST_NAME ?? "Матвей",
  OWNER_LAST_NAME: process.env.OWNER_LAST_NAME ?? "Кусков",
  OWNER_PATRONYMIC: process.env.OWNER_PATRONYMIC ?? "Максимович",
  OWNER_BIRTH_YEAR: process.env.OWNER_BIRTH_YEAR ?? "2001",
  OWNER_EDUCATION: process.env.OWNER_EDUCATION ?? "Руководитель проекта МГЕР",
  OWNER_HEADQUARTERS: process.env.OWNER_HEADQUARTERS ?? "Центральный штаб",
  OWNER_ABOUT:
    process.env.OWNER_ABOUT ??
    "Администрирует доску мероприятий и управляет ролями участников.",
  OWNER_ACHIEVEMENTS:
    process.env.OWNER_ACHIEVEMENTS ??
    "Подготовил демонстрационную production-версию для Vercel.",
  OWNER_AVATAR_URL: process.env.OWNER_AVATAR_URL ?? "/photos/event-kazan.png",
  ACTIVIST_EMAIL: process.env.ACTIVIST_EMAIL ?? "activist@mger.local",
  ACTIVIST_PASSWORD: process.env.ACTIVIST_PASSWORD ?? "mger-activist-2026",
  ACTIVIST_NAME: process.env.ACTIVIST_NAME ?? "Карямин Кирилл Николаевич",
  ACTIVIST_FIRST_NAME: process.env.ACTIVIST_FIRST_NAME ?? "Кирилл",
  ACTIVIST_LAST_NAME: process.env.ACTIVIST_LAST_NAME ?? "Карямин",
  ACTIVIST_PATRONYMIC: process.env.ACTIVIST_PATRONYMIC ?? "Николаевич",
  ACTIVIST_BIRTH_YEAR: process.env.ACTIVIST_BIRTH_YEAR ?? "2004",
  ACTIVIST_EDUCATION:
    process.env.ACTIVIST_EDUCATION ?? "Активист регионального штаба",
  ACTIVIST_HEADQUARTERS: process.env.ACTIVIST_HEADQUARTERS ?? "Региональный штаб",
  ACTIVIST_ABOUT:
    process.env.ACTIVIST_ABOUT ??
    "Использует доску для просмотра календаря и участия в мероприятиях.",
  ACTIVIST_ACHIEVEMENTS:
    process.env.ACTIVIST_ACHIEVEMENTS ??
    "Тестирует production-демо и сценарии отклика на мероприятия.",
  ACTIVIST_AVATAR_URL: process.env.ACTIVIST_AVATAR_URL ?? "/photos/event-tuapse.png",
};

run("npm run db:init", seedEnv);
run("npm run db:push", seedEnv);
run("npm run db:seed", seedEnv);
