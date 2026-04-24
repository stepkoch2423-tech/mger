# MGER Board

Доска мероприятий для "Молодой гвардии" на `Next.js 16`, `React 19`, `Prisma 7` и `SQLite`.

Приложение показывает календарь мероприятий, карточки событий, роли участников штаба и отметки участия. Локально проект работает с seeded SQLite-базой, а публичный Vercel deployment сейчас переведён в режим просмотра, чтобы сайт стабильно открывался без внешней БД и файлового хранилища.

## Стек

- `Next.js 16`
- `React 19`
- `Prisma 7`
- `better-sqlite3`
- `Tailwind CSS 4`

## Локальный запуск

```bash
npm install
npm run prisma:generate
npm run setup
npm run dev
```

Если база уже создана, достаточно:

```bash
npm run prisma:generate
npm run dev
```

Прод-сборка:

```bash
npm run build
npm run start
```

## Тестовые аккаунты

- Владелец: `owner@mger.local` / `molodaya2026`
- Модератор: `moderator@mger.local` / `moderator2026`
- Активист: `aktivist@mger.local` / `aktivist2026`

## Важные замечания

- Основная локальная база находится в `dev.db`.
- Файлы `dev.db-shm`, `dev.db-wal` и папка `output/` не должны попадать в git.
- Для публичного Vercel deployment база автоматически подключается как traced asset, а mutating API-роуты отключены и возвращают режим read-only.
- Чтобы включить полноценный вход, загрузки и редактирование в проде, нужно вынести данные и файлы во внешние managed-сервисы.
