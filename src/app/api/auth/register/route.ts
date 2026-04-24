import { hash } from "bcryptjs";
import { NextResponse } from "next/server";
import { createSession, applySessionCookie } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { registerSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Не удалось зарегистрироваться." },
        { status: 400 },
      );
    }

    const email = parsed.data.email.toLowerCase();
    const existingUser = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Пользователь с таким email уже зарегистрирован." },
        { status: 409 },
      );
    }

    const passwordHash = await hash(parsed.data.password, 10);
    const user = await prisma.user.create({
      data: {
        name: parsed.data.name,
        email,
        passwordHash,
      },
    });

    const session = await createSession(user.id);
    const response = NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });

    applySessionCookie(response, session.token, session.expiresAt);
    return response;
  } catch {
    return NextResponse.json(
      { error: "Не удалось создать аккаунт. Попробуйте ещё раз." },
      { status: 500 },
    );
  }
}
