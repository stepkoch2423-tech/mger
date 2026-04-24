import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  const currentUser = await getCurrentUser();

  if (!canManageEvents(currentUser?.role)) {
    return NextResponse.json({ error: "Недостаточно прав для редактирования." }, { status: 403 });
  }

  try {
    const { eventId } = await context.params;
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Проверьте поля мероприятия." },
        { status: 400 },
      );
    }

    await prisma.event.update({
      where: {
        id: eventId,
      },
      data: {
        title: parsed.data.title,
        summary: parsed.data.summary,
        description: parsed.data.description,
        location: parsed.data.location,
        category: parsed.data.category,
        organizerName: parsed.data.organizerName,
        startAt: new Date(parsed.data.startAt),
        endAt: new Date(parsed.data.endAt),
        capacity: parsed.data.capacity ?? null,
        photos: {
          deleteMany: {},
          create: parsed.data.photoUrls.map((url, index) => ({
            url,
            alt: parsed.data.title,
            sortOrder: index,
          })),
        },
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить мероприятие." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  const currentUser = await getCurrentUser();

  if (!canManageEvents(currentUser?.role)) {
    return NextResponse.json({ error: "Недостаточно прав для удаления." }, { status: 403 });
  }

  try {
    const { eventId } = await context.params;

    await prisma.event.delete({
      where: {
        id: eventId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось удалить мероприятие." },
      { status: 500 },
    );
  }
}
