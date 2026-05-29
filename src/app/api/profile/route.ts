import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { profileSchema } from "@/lib/validators";

function nullableText(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

export async function PATCH(request: Request) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = profileSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Проверьте поля профиля." },
        { status: 400 },
      );
    }

    const fullName = [
      parsed.data.lastName,
      parsed.data.firstName,
      parsed.data.patronymic,
    ]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(" ");

    await dbQuery(
      `update "User"
       set name = $1, "firstName" = $2, "lastName" = $3, patronymic = $4,
           "birthYear" = $5, education = $6, headquarters = $7, about = $8,
           achievements = $9, "avatarUrl" = $10, "updatedAt" = now()
       where id = $11`,
      [
        fullName || currentUser.name,
        nullableText(parsed.data.firstName),
        nullableText(parsed.data.lastName),
        nullableText(parsed.data.patronymic),
        parsed.data.birthYear ?? null,
        nullableText(parsed.data.education),
        nullableText(parsed.data.headquarters),
        nullableText(parsed.data.about),
        nullableText(parsed.data.achievements),
        nullableText(parsed.data.avatarUrl),
        currentUser.id,
      ],
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить профиль." },
      { status: 500 },
    );
  }
}
