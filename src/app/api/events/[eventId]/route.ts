import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { canManageEvents } from "@/lib/permissions";
import { eventSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function PATCH(request: Request, context: Context) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

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

    await dbQuery(
      `update "Event"
       set title = $1, summary = $2, description = $3, location = $4,
           category = $5, "organizerName" = $6, "startAt" = $7, "endAt" = $8,
           capacity = $9, "updatedAt" = now()
       where id = $10`,
      [
        parsed.data.title,
        parsed.data.summary,
        parsed.data.description,
        parsed.data.location,
        parsed.data.category,
        parsed.data.organizerName,
        new Date(parsed.data.startAt),
        new Date(parsed.data.endAt),
        parsed.data.capacity ?? null,
        eventId,
      ],
    );
    await dbQuery(`delete from "EventPhoto" where "eventId" = $1`, [eventId]);

    for (const [index, url] of parsed.data.photoUrls.entries()) {
      await dbQuery(
        `insert into "EventPhoto" (id, url, alt, "sortOrder", "eventId")
         values (concat('photo_', md5($1 || random()::text)), $1, $2, $3, $4)`,
        [url, parsed.data.title, index, eventId],
      );
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить мероприятие." },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, context: Context) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!canManageEvents(currentUser?.role)) {
    return NextResponse.json({ error: "Недостаточно прав для удаления." }, { status: 403 });
  }

  try {
    const { eventId } = await context.params;

    await dbQuery(`delete from "Event" where id = $1`, [eventId]);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось удалить мероприятие." },
      { status: 500 },
    );
  }
}
