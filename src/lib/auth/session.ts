import { createHash, randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

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

  await prisma.session.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt,
    },
  });

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

  await prisma.session.deleteMany({
    where: {
      tokenHash: hashToken(token),
    },
  });
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const session = await prisma.session.findUnique({
    where: {
      tokenHash: hashToken(token),
    },
    include: {
      user: true,
    },
  });

  if (!session || session.expiresAt <= new Date() || session.user.isBlocked) {
    return null;
  }

  return {
    id: session.user.id,
    name: session.user.name,
    email: session.user.email,
    role: session.user.role,
    avatarUrl: session.user.avatarUrl,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    patronymic: session.user.patronymic,
    birthYear: session.user.birthYear,
    education: session.user.education,
    about: session.user.about,
    achievements: session.user.achievements,
    headquarters: session.user.headquarters,
    isBlocked: session.user.isBlocked,
    createdAt: session.user.createdAt.toISOString(),
  };
});
