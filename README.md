# MGER Board

Доска мероприятий для "Молодой гвардии" на `Next.js 16`, `React 19`, `Prisma 7` и `PostgreSQL`.

Приложение показывает календарь мероприятий, карточки событий, роли участников штаба и отметки участия. Данные хранятся в PostgreSQL через Prisma driver adapter для `pg`, поэтому один и тот же runtime подходит для Vercel и обычного Node-сервера.

## Стек

- `Next.js 16`
- `React 19`
- `Prisma 7`
- `PostgreSQL`
- `Tailwind CSS 4`

## Локальный запуск

```bash
npm install
vercel env pull .env.local
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

- Администратор: `admin@mger.local` / `mger-admin-2026`
- Активист: `activist@mger.local` / `mger-activist-2026`

## Важные замечания

- Для запуска нужен `DATABASE_URL` или совместимые переменные `POSTGRES_PRISMA_URL` / `POSTGRES_URL`.
- `npm run setup` применяет схему через `prisma db push` и заново наполняет базу seed-данными.
- На production-сервере используйте `npm run server:bootstrap` для применения схемы перед стартом.
- Runtime-загрузки файлов на Vercel пока требуют отдельного файлового хранилища; база данных уже вынесена в PostgreSQL.
