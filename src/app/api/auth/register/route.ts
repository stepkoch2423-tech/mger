import { hash } from "bcryptjs";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/auth/session";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Не удалось создать профиль." },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: {
        email: parsed.data.email,
      },
      select: {
        id: true,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже зарегистрирован." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 12);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email: parsed.data.email,
        passwordHash,
        role: Role.ACTIVIST,
      },
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
    });

    applySessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать профиль. Попробуйте позже." },
      { status: 500 },
    );
  }
}
