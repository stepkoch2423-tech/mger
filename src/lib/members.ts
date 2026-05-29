import { Role } from "@prisma/client";
import { cache } from "react";
import { dbQuery } from "@/lib/db";

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
  const users = await dbQuery<{
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
    createdAt: Date;
    responsesCount: string;
    createdEventsCount: string;
  }>(
    `select u.id, u.name, u.email, u.role::text as role, u."avatarUrl", u."firstName",
            u."lastName", u.patronymic, u."birthYear", u.education, u.about,
            u.achievements, u.headquarters, u."isBlocked", u."createdAt",
            count(distinct r.id) as "responsesCount",
            count(distinct e.id) as "createdEventsCount"
     from "User" u
     left join "EventResponse" r on r."userId" = u.id
     left join "Event" e on e."createdById" = u.id
     group by u.id
     order by u.role asc, u."createdAt" asc`,
  );

  return users.rows.map((user) => ({
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
    responsesCount: Number(user.responsesCount),
    createdEventsCount: Number(user.createdEventsCount),
  }));
});
