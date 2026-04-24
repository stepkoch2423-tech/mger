import { Role, RSVPStatus } from "@prisma/client";
import { z } from "zod";

const requiredText = (label: string, min = 2) =>
  z
    .string()
    .trim()
    .min(min, `${label} должно содержать не меньше ${min} символов.`);

const photoUrlSchema = z.string().trim().refine(
  (value) => value.startsWith("/") || /^https?:\/\//.test(value),
  "Одна из ссылок на фотографии некорректна.",
);

export const registerSchema = z.object({
  name: requiredText("Имя"),
  email: z.email("Укажите корректный email."),
  password: z
    .string()
    .min(8, "Пароль должен содержать минимум 8 символов.")
    .max(64, "Пароль слишком длинный."),
});

export const loginSchema = z.object({
  email: z.email("Укажите корректный email."),
  password: z.string().min(1, "Введите пароль."),
});

export const eventSchema = z
  .object({
    title: requiredText("Название"),
    summary: requiredText("Краткое описание", 12).max(
      180,
      "Слишком длинное краткое описание.",
    ),
    description: requiredText("Описание", 24),
    location: requiredText("Место"),
    category: requiredText("Категория"),
    organizerName: requiredText("Организатор"),
    startAt: z.iso.datetime("Укажите дату и время начала."),
    endAt: z.iso.datetime("Укажите дату и время окончания."),
    capacity: z
      .preprocess(
        (value) =>
          value === "" || value === null || value === undefined ? null : Number(value),
        z.number().int().positive().max(500).nullable(),
      )
      .optional()
      .default(null),
    photoUrls: z
      .array(photoUrlSchema)
      .max(6, "Можно прикрепить не больше 6 фотографий.")
      .default([]),
  })
  .refine((value) => new Date(value.endAt) > new Date(value.startAt), {
    message: "Время окончания должно быть позже времени начала.",
    path: ["endAt"],
  });

export const roleSchema = z.object({
  role: z.enum([Role.ACTIVIST, Role.MODERATOR]),
});

export const rsvpSchema = z.object({
  status: z.enum([RSVPStatus.GOING, RSVPStatus.DECLINED]),
});
