import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { prisma } from "@/lib/prisma";
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

    await prisma.user.update({
      where: {
        id: currentUser.id,
      },
      data: {
        name: fullName || currentUser.name,
        firstName: nullableText(parsed.data.firstName),
        lastName: nullableText(parsed.data.lastName),
        patronymic: nullableText(parsed.data.patronymic),
        birthYear: parsed.data.birthYear ?? null,
        education: nullableText(parsed.data.education),
        headquarters: nullableText(parsed.data.headquarters),
        about: nullableText(parsed.data.about),
        achievements: nullableText(parsed.data.achievements),
        avatarUrl: nullableText(parsed.data.avatarUrl),
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить профиль." },
      { status: 500 },
    );
  }
}
