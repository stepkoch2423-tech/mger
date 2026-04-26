import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { canManageMembers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { userStatusSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!canManageMembers(currentUser?.role)) {
    return NextResponse.json(
      { error: "Только владелец штаба может блокировать участников." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = userStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Некорректный статус." },
        { status: 400 },
      );
    }

    const { userId } = await context.params;

    if (userId === currentUser?.id) {
      return NextResponse.json(
        { error: "Нельзя заблокировать собственный профиль." },
        { status: 400 },
      );
    }

    const target = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!target) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    if (target.role === Role.OWNER) {
      return NextResponse.json(
        { error: "Профиль владельца нельзя блокировать." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        isBlocked: parsed.data.isBlocked,
      },
    });

    if (parsed.data.isBlocked) {
      await prisma.session.deleteMany({
        where: {
          userId,
        },
      });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить статус пользователя." },
      { status: 500 },
    );
  }
}
