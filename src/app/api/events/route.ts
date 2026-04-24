import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { eventSchema } from "@/lib/validators";

export async function POST(request: Request) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!canManageEvents(currentUser?.role)) {
    return NextResponse.json({ error: "Только модератор может добавлять события." }, { status: 403 });
  }

  try {
    const body = await request.json();
    const parsed = eventSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Проверьте поля мероприятия." },
        { status: 400 },
      );
    }

    const event = await prisma.event.create({
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
        createdById: currentUser.id,
        photos: {
          create: parsed.data.photoUrls.map((url, index) => ({
            url,
            alt: parsed.data.title,
            sortOrder: index,
          })),
        },
      },
    });

    return NextResponse.json({ id: event.id });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить мероприятие." },
      { status: 500 },
    );
  }
}
