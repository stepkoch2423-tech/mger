import { Role } from "@prisma/client";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

export type MemberProfile = {
  id: string;
  name: string;
  email: string;
  role: Role;
  avatarUrl: string | null;
  firstName: string | null;
  lastName: string | null;
  patronymic: string | null;
  birthYear: number | null;
  education: string | null;
  about: string | null;
  achievements: string | null;
  headquarters: string | null;
  isBlocked: boolean;
  createdAt: string;
  responsesCount: number;
  createdEventsCount: number;
};

export const getMembersPayload = cache(async (): Promise<MemberProfile[]> => {
  const users = await prisma.user.findMany({
    orderBy: [{ role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      avatarUrl: true,
      firstName: true,
      lastName: true,
      patronymic: true,
      birthYear: true,
      education: true,
      about: true,
      achievements: true,
      headquarters: true,
      isBlocked: true,
      createdAt: true,
      _count: {
        select: {
          responses: true,
          createdEvents: true,
        },
      },
    },
  });

  return users.map((user) => ({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    firstName: user.firstName,
    lastName: user.lastName,
    patronymic: user.patronymic,
    birthYear: user.birthYear,
    education: user.education,
    about: user.about,
    achievements: user.achievements,
    headquarters: user.headquarters,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt.toISOString(),
    responsesCount: user._count.responses,
    createdEventsCount: user._count.createdEvents,
  }));
});
