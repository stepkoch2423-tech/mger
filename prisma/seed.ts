import "dotenv/config";
import { addDays, set } from "date-fns";
import { hash } from "bcryptjs";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient, Role } from "@prisma/client";

const adapter = new PrismaBetterSqlite3({
  url: process.env.DATABASE_URL ?? "file:./dev.db",
});

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

  const defaultPassword = process.env.OWNER_PASSWORD ?? "mger-admin-2026";
  const ownerEmail = process.env.OWNER_EMAIL ?? "admin@mger.local";
  const ownerPassword = await hash(defaultPassword, 10);
  const activistPassword = await hash(process.env.ACTIVIST_PASSWORD ?? "mger-activist-2026", 10);

  const owner = await prisma.user.create({
    data: {
      name: process.env.OWNER_NAME ?? "Главный администратор МГЕР",
      email: ownerEmail,
      passwordHash: ownerPassword,
      role: Role.OWNER,
      firstName: process.env.OWNER_FIRST_NAME ?? "Александр",
      lastName: process.env.OWNER_LAST_NAME ?? "Соколов",
      patronymic: process.env.OWNER_PATRONYMIC ?? "Игоревич",
      birthYear: Number(process.env.OWNER_BIRTH_YEAR ?? 1992),
      education:
        process.env.OWNER_EDUCATION ??
        "Казанский федеральный университет, управление проектами",
      headquarters: process.env.OWNER_HEADQUARTERS ?? "Региональный штаб Татарстана",
      about:
        process.env.OWNER_ABOUT ??
        "Координирует календарь, модераторов и городские акции штаба.",
      achievements:
        process.env.OWNER_ACHIEVEMENTS ??
        "Запустил систему штабных мероприятий и волонтёрских смен.",
      avatarUrl: process.env.OWNER_AVATAR_URL ?? "/photos/event-kazan.png",
    },
  });

  const activist = await prisma.user.create({
    data: {
      name: process.env.ACTIVIST_NAME ?? "Активист штаба МГЕР",
      email: process.env.ACTIVIST_EMAIL ?? "activist@mger.local",
      passwordHash: activistPassword,
      role: Role.ACTIVIST,
      firstName: process.env.ACTIVIST_FIRST_NAME ?? "Илья",
      lastName: process.env.ACTIVIST_LAST_NAME ?? "Морозов",
      patronymic: process.env.ACTIVIST_PATRONYMIC ?? "Сергеевич",
      birthYear: Number(process.env.ACTIVIST_BIRTH_YEAR ?? 2004),
      education: process.env.ACTIVIST_EDUCATION ?? "КНИТУ-КАИ, студент 3 курса",
      headquarters: process.env.ACTIVIST_HEADQUARTERS ?? "Студенческий штаб",
      about:
        process.env.ACTIVIST_ABOUT ??
        "Помогает на патриотических акциях и гуманитарных сборах.",
      achievements:
        process.env.ACTIVIST_ACHIEVEMENTS ??
        "Участвовал в 8 мероприятиях и ведёт фотоархив команды.",
      avatarUrl: process.env.ACTIVIST_AVATAR_URL ?? "/photos/event-mariupol.png",
    },
  });

  if (seedProfile !== "demo") {
    return;
  }

  const moderatorPassword = await hash(process.env.MODERATOR_PASSWORD ?? "mger-moderator-2026", 10);
  const moderator = await prisma.user.create({
    data: {
      name: "Мария Кузнецова",
      email: process.env.MODERATOR_EMAIL ?? "moderator@mger.local",
      passwordHash: moderatorPassword,
      role: Role.MODERATOR,
      firstName: "Мария",
      lastName: "Кузнецова",
      patronymic: "Андреевна",
      birthYear: 1998,
      education: "Молодёжный центр, координатор добровольцев",
      headquarters: "Городской штаб Казани",
      about: "Отвечает за набор команд, фотоотчёты и сопровождение новичков.",
      achievements: "Собрала 12 волонтёрских смен за весенний сезон.",
      avatarUrl: "/photos/event-tuapse.png",
    },
  });

  await prisma.user.createMany({
    data: [
      {
        name: "Анна Волкова",
        email: "anna.volkova@mger.local",
        passwordHash: activistPassword,
        role: Role.ACTIVIST,
        firstName: "Анна",
        lastName: "Волкова",
        birthYear: 2002,
        education: "Колледж культуры, медиаволонтёр",
        headquarters: "Медиа-штаб",
        about: "Снимает короткие ролики и помогает с публикациями после мероприятий.",
        achievements: "Подготовила серию карточек ко Дню Победы.",
        avatarUrl: "/photos/event-kazan.png",
      },
      {
        name: "Рустам Галиев",
        email: "rustam.galiev@mger.local",
        passwordHash: activistPassword,
        role: Role.ACTIVIST,
        firstName: "Рустам",
        lastName: "Галиев",
        birthYear: 2001,
        education: "Работает в городском молодёжном центре",
        headquarters: "Оперативный штаб",
        about: "Помогает с логистикой, списками участников и выдачей материалов.",
        achievements: "Организовал склад гуманитарной помощи на 300 коробок.",
        avatarUrl: "/photos/event-tuapse.png",
      },
      {
        name: "Олег Никитин",
        email: "oleg.nikitin@mger.local",
        passwordHash: activistPassword,
        role: Role.ACTIVIST,
        firstName: "Олег",
        lastName: "Никитин",
        birthYear: 1999,
        education: "Волонтёр городских патриотических проектов",
        headquarters: "Резерв штаба",
        about: "Профиль временно заблокирован для проверки модерации.",
        achievements: "Помогал на выездных мероприятиях.",
        avatarUrl: "/photos/event-mariupol.png",
        isBlocked: true,
      },
    ],
  });

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
        userId: activist.id,
        status: "GOING",
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
