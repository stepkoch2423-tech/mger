import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { Role } from "@prisma/client";
import { dbQuery } from "@/lib/db";

const SESSION_COOKIE_NAME = "mger-session";
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;

export type SessionUser = {
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
};

function getSessionSecret() {
  return process.env.SESSION_SECRET ?? "mger-local-demo-secret";
}

function hashToken(token: string) {
  return createHash("sha256").update(`${getSessionSecret()}:${token}`).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await dbQuery(
    `insert into "Session" (id, "tokenHash", "expiresAt", "userId", "createdAt")
     values (concat('session_', md5($1)), $1, $2, $3, now())`,
    [hashToken(token), expiresAt, userId],
  );

  return { token, expiresAt };
}

export function applySessionCookie(response: NextResponse, token: string, expiresAt: Date) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: token,
    expires: expiresAt,
    maxAge: SESSION_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: SESSION_COOKIE_NAME,
    value: "",
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
}

export async function revokeCurrentSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return;
  }

  await dbQuery(`delete from "Session" where "tokenHash" = $1`, [hashToken(token)]);
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const result = await dbQuery<{
    expiresAt: Date;
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
  }>(
    `select
       s."expiresAt",
       u.id, u.name, u.email, u.role::text as role, u."avatarUrl", u."firstName",
       u."lastName", u.patronymic, u."birthYear", u.education, u.about,
       u.achievements, u.headquarters, u."isBlocked", u."createdAt"
     from "Session" s
     join "User" u on u.id = s."userId"
     where s."tokenHash" = $1
     limit 1`,
    [hashToken(token)],
  );

  const session = result.rows[0];

  if (!session || session.expiresAt <= new Date() || session.isBlocked) {
    return null;
  }

  return {
    id: session.id,
    name: session.name,
    email: session.email,
    role: session.role,
    avatarUrl: session.avatarUrl,
    firstName: session.firstName,
    lastName: session.lastName,
    patronymic: session.patronymic,
    birthYear: session.birthYear,
    education: session.education,
    about: session.about,
    achievements: session.achievements,
    headquarters: session.headquarters,
    isBlocked: session.isBlocked,
    createdAt: session.createdAt.toISOString(),
  };
});
