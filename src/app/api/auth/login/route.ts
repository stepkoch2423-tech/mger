import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Не удалось войти." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: {
        email: parsed.data.email.toLowerCase(),
      },
    });

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    const isValidPassword = await compare(parsed.data.password, user.passwordHash);

    if (!isValidPassword) {
      return NextResponse.json({ error: "Неверный пароль." }, { status: 401 });
    }

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
      { error: "Не удалось выполнить вход. Попробуйте позже." },
      { status: 500 },
    );
  }
}
