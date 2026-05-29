import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { canManageMembers } from "@/lib/permissions";
import { roleSchema } from "@/lib/validators";

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

    if (userId === currentUser?.id) {
      return NextResponse.json(
        { error: "Нельзя изменить собственную роль." },
        { status: 400 },
      );
    }

    const target = await dbQuery<{ role: Role }>(
      `select role::text as role from "User" where id = $1 limit 1`,
      [userId],
    );

    if (!target.rows[0]) {
      return NextResponse.json({ error: "Пользователь не найден." }, { status: 404 });
    }

    if (target.rows[0].role === Role.OWNER) {
      return NextResponse.json(
        { error: "Роль владельца нельзя менять через интерфейс." },
        { status: 400 },
      );
    }

    await dbQuery(`update "User" set role = $1::"Role", "updatedAt" = now() where id = $2`, [
      parsed.data.role,
      userId,
    ]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить роль пользователя." },
      { status: 500 },
    );
  }
}
