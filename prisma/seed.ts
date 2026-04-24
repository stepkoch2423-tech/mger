import "dotenv/config";
import { addDays, addHours, set } from "date-fns";
import { hash } from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Role, RSVPStatus } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

const prisma = new PrismaClient({
  adapter,
});

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

  const defaultPassword = process.env.OWNER_PASSWORD ?? "molodaya2026";
  const ownerEmail = process.env.OWNER_EMAIL ?? "owner@mger.local";

  const [ownerPassword, moderatorPassword, activistPassword] = await Promise.all([
    hash(defaultPassword, 10),
    hash("moderator2026", 10),
    hash("aktivist2026", 10),
  ]);

  const owner = await prisma.user.create({
    data: {
      name: "Штаб МГЕР",
      email: ownerEmail,
      passwordHash: ownerPassword,
      role: Role.OWNER,
    },
  });

  const moderator = await prisma.user.create({
    data: {
      name: "Мария Кузнецова",
      email: "moderator@mger.local",
      passwordHash: moderatorPassword,
      role: Role.MODERATOR,
    },
  });

  const activist = await prisma.user.create({
    data: {
      name: "Алексей Волков",
      email: "aktivist@mger.local",
      passwordHash: activistPassword,
      role: Role.ACTIVIST,
    },
  });

  const secondActivist = await prisma.user.create({
    data: {
      name: "Арина Смирнова",
      email: "arina@mger.local",
      passwordHash: activistPassword,
      role: Role.ACTIVIST,
    },
  });

  const events = await Promise.all([
    prisma.event.create({
      data: {
        title: "Георгиевская лента на набережной",
        summary:
          "Выезд волонтеров на городскую акцию с раздачей лент, фотозоной и точкой записи новых активистов.",
        description:
          "Собираем команду для городской акции на набережной. Будут дежурства по встрече гостей, фотосопровождение, раздача лент и короткий инструктаж для новых участников. Возьмите ветровку и заряженный телефон.",
        location: "Казань, Кремлёвская набережная",
        category: "Патриотическая акция",
        organizerName: "Региональный штаб",
        startAt: buildDate(2, 16, 0),
        endAt: buildDate(2, 19, 0),
        capacity: 80,
        createdById: moderator.id,
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
        createdById: moderator.id,
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
          "Работаем сменами по два часа. Внутри пространства будут организованы стол регистрации, упаковочная линия и зона выдачи. Можно выбрать удобную смену и взять друзей с собой после регистрации.",
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
    prisma.event.create({
      data: {
        title: "Школа модераторов и координаторов",
        summary:
          "Закрытая практическая встреча для будущих модераторов: сценарии, чек-листы, управление фотоотчётом и регистрацией.",
        description:
          "Разберём, как собирать событие под ключ: от анонса до фотоотчёта и аналитики по присутствию. После встречи владелец приложения сможет назначать новых модераторов прямо из штаба.",
        location: "Москва, центральный штаб",
        category: "Обучение",
        organizerName: "Федеральный штаб",
        startAt: buildDate(14, 18, 30),
        endAt: addHours(buildDate(14, 18, 30), 3),
        capacity: 20,
        createdById: owner.id,
        photos: {
          create: [
            {
              url: "/photos/event-kazan.png",
              alt: "Встреча команды координаторов",
              sortOrder: 0,
            },
          ],
        },
      },
    }),
  ]);

  await prisma.eventResponse.createMany({
    data: [
      {
        eventId: events[0].id,
        userId: activist.id,
        status: RSVPStatus.GOING,
      },
      {
        eventId: events[0].id,
        userId: secondActivist.id,
        status: RSVPStatus.GOING,
      },
      {
        eventId: events[1].id,
        userId: activist.id,
        status: RSVPStatus.DECLINED,
      },
      {
        eventId: events[2].id,
        userId: secondActivist.id,
        status: RSVPStatus.GOING,
      },
      {
        eventId: events[3].id,
        userId: moderator.id,
        status: RSVPStatus.GOING,
      },
    ],
  });
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
