import { compare } from "bcryptjs";
import { NextResponse } from "next/server";
import { applySessionCookie, createSession } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { loginSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Не удалось войти." },
        { status: 400 },
      );
    }

    const users = await dbQuery<{
      id: string;
      name: string;
      email: string;
      passwordHash: string;
      role: string;
      avatarUrl: string | null;
      isBlocked: boolean;
    }>(
      `select id, name, email, "passwordHash", role::text as role, "avatarUrl", "isBlocked"
       from "User"
       where email = lower($1)
       limit 1`,
      [parsed.data.email],
    );
    const user = users.rows[0];

    if (!user) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    if (user.isBlocked) {
      return NextResponse.json(
        { error: "Профиль заблокирован. Обратитесь к администратору штаба." },
        { status: 403 },
      );
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
        avatarUrl: user.avatarUrl,
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
