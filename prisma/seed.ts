import { config } from "dotenv";
import { addDays, set } from "date-fns";
import { hash } from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Role, RSVPStatus } from "@prisma/client";

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
  process.env.DATABASE_URL ??
  process.env.PRISMA_DATABASE_URL ??
  process.env.POSTGRES_PRISMA_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the PostgreSQL database.");
}

const adapter = new PrismaPg(normalizePostgresUrl(databaseUrl));

const prisma = new PrismaClient({
  adapter,
});

const seedProfile = process.env.SEED_PROFILE ?? "demo";

function buildDate(offsetDays: number, hours: number, minutes = 0) {
  return set(addDays(new Date(), offsetDays), {
    hours,
    minutes,
    seconds: 0,
    milliseconds: 0,
  });
}

async function main() {
  await prisma.eventResponse.deleteMany();
  await prisma.eventPhoto.deleteMany();
  await prisma.event.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();

  const ownerPassword = await hash(process.env.OWNER_PASSWORD ?? "mger-admin-2026", 10);

  const owner = await prisma.user.create({
    data: {
      name: process.env.OWNER_NAME ?? "Кочетков Степан Дмитриевич",
      email: process.env.OWNER_EMAIL ?? "admin@mger.local",
      passwordHash: ownerPassword,
      role: Role.OWNER,
      firstName: process.env.OWNER_FIRST_NAME ?? "Степан",
      lastName: process.env.OWNER_LAST_NAME ?? "Кочетков",
      patronymic: process.env.OWNER_PATRONYMIC ?? "Дмитриевич",
      birthYear: Number(process.env.OWNER_BIRTH_YEAR ?? 2001),
      education:
        process.env.OWNER_EDUCATION ??
        "Администратор штаба МГЕР",
      headquarters: process.env.OWNER_HEADQUARTERS ?? "Центральный штаб",
      about:
        process.env.OWNER_ABOUT ??
        "Администрирует доску мероприятий и управляет ролями участников.",
      achievements:
        process.env.OWNER_ACHIEVEMENTS ??
        "Подготовил production-версию доски мероприятий для штаба.",
      avatarUrl: process.env.OWNER_AVATAR_URL ?? "/photos/event-kazan.png",
    },
  });

  const activistAccounts = [
    {
      name: "Анастасия Русанова",
      email: "anastasia.rusanova@mger.local",
      password: "rusanova-2026",
      firstName: "Анастасия",
      lastName: "Русанова",
      avatarUrl: "/photos/event-kazan.png",
    },
    {
      name: "Маша Лапина",
      email: "masha.lapina@mger.local",
      password: "lapina-2026",
      firstName: "Маша",
      lastName: "Лапина",
      avatarUrl: "/photos/event-tuapse.png",
    },
    {
      name: "Анастасия Ярцева",
      email: "anastasia.yartseva@mger.local",
      password: "yartseva-2026",
      firstName: "Анастасия",
      lastName: "Ярцева",
      avatarUrl: "/photos/event-mariupol.png",
    },
    {
      name: "Антон Хайлов",
      email: "anton.hailov@mger.local",
      password: "hailov-2026",
      firstName: "Антон",
      lastName: "Хайлов",
      avatarUrl: "/photos/event-kazan.png",
    },
    {
      name: "Алексей Папин",
      email: "alexey.papin@mger.local",
      password: "papin-2026",
      firstName: "Алексей",
      lastName: "Папин",
      avatarUrl: "/photos/event-tuapse.png",
    },
  ];

  const activists = await Promise.all(
    activistAccounts.map(async (account) =>
      prisma.user.create({
        data: {
          name: account.name,
          email: account.email,
          passwordHash: await hash(account.password, 10),
          role: Role.ACTIVIST,
          firstName: account.firstName,
          lastName: account.lastName,
          birthYear: 2004,
          education: "Активист штаба МГЕР",
          headquarters: "Региональный штаб",
          about: "Использует доску для просмотра календаря и участия в мероприятиях.",
          achievements: "Участвует в работе штаба и мероприятиях команды.",
          avatarUrl: account.avatarUrl,
        },
      }),
    ),
  );

  if (seedProfile !== "demo") {
    return;
  }

  await Promise.all([
    prisma.event.create({
      data: {
        title: "Георгиевская лента на набережной",
        summary:
          "Выезд волонтёров на городскую акцию с раздачей лент, фотозоной и координацией команды на месте.",
        description:
          "Собираем команду для городской акции на набережной. Будут дежурства по встрече гостей, фотосопровождение, раздача лент и короткий инструктаж для новых участников. Возьмите ветровку и заряженный телефон.",
        location: "Казань, Кремлёвская набережная",
        category: "Патриотическая акция",
        organizerName: "Региональный штаб",
        startAt: buildDate(2, 16, 0),
        endAt: buildDate(2, 19, 0),
        capacity: 80,
        createdById: owner.id,
        photos: {
          create: [
            {
              url: "/photos/event-kazan.png",
              alt: "Акция Молодой гвардии на набережной",
              sortOrder: 0,
            },
            {
              url: "/photos/event-tuapse.png",
              alt: "Добровольцы на выездном мероприятии",
              sortOrder: 1,
            },
          ],
        },
      },
    }),
    prisma.event.create({
      data: {
        title: "Памятный выезд волонтёров",
        summary:
          "Небольшой городской выезд с возложением цветов, медиа-сопровождением и встречей с ветеранами.",
        description:
          "Выезд рассчитан на компактную группу активистов. Координатор распределит роли по фото, навигации участников и сопровождению гостей. После официальной части проведём короткий круг обратной связи.",
        location: "Мариуполь, мемориальный комплекс",
        category: "Памятная дата",
        organizerName: "Городское отделение",
        startAt: buildDate(5, 11, 30),
        endAt: buildDate(5, 14, 0),
        capacity: 30,
        createdById: owner.id,
        photos: {
          create: [
            {
              url: "/photos/event-mariupol.png",
              alt: "Участники мероприятия у памятника",
              sortOrder: 0,
            },
          ],
        },
      },
    }),
    prisma.event.create({
      data: {
        title: "Гуманитарный штаб выходного дня",
        summary:
          "Фасовка гуманитарной помощи, логистика коробок и подготовка коротких видеосводок для соцсетей.",
        description:
          "Работаем сменами по два часа. Внутри пространства будут организованы координационный стол, упаковочная линия и зона выдачи. Смены распределяет администратор штаба после входа в систему.",
        location: "Туапсе, молодёжный центр",
        category: "Гуманитарная миссия",
        organizerName: "Оперативный штаб",
        startAt: buildDate(9, 10, 0),
        endAt: buildDate(9, 15, 30),
        capacity: 45,
        createdById: owner.id,
        photos: {
          create: [
            {
              url: "/photos/event-tuapse.png",
              alt: "Гуманитарная команда Молодой гвардии",
              sortOrder: 0,
            },
          ],
        },
      },
    }),
  ]);

  const firstEvent = await prisma.event.findFirst({
    where: {
      title: "Георгиевская лента на набережной",
    },
  });

  if (firstEvent) {
    await prisma.eventResponse.create({
      data: {
        eventId: firstEvent.id,
        userId: activists[0].id,
        status: RSVPStatus.GOING,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
