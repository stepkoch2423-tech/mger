import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageMembers } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { roleSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    userId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  const currentUser = await getCurrentUser();

  if (!canManageMembers(currentUser?.role)) {
    return NextResponse.json(
      { error: "Только владелец штаба может менять роли." },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const parsed = roleSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Некорректная роль." },
        { status: 400 },
      );
    }

    const { userId } = await context.params;
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
        { error: "Роль владельца нельзя менять через интерфейс." },
        { status: 400 },
      );
    }

    await prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        role: parsed.data.role,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить роль пользователя." },
      { status: 500 },
    );
  }
}
