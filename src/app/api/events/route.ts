import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { canManageEvents } from "@/lib/permissions";
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

    const created = await dbQuery<{ id: string }>(
      `insert into "Event" (
         id, title, summary, description, location, category, "organizerName",
         "startAt", "endAt", capacity, "createdById", "createdAt", "updatedAt"
       )
       values (
         concat('event_', md5(random()::text || clock_timestamp()::text)),
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now(), now()
       )
       returning id`,
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
        currentUser.id,
      ],
    );
    const event = created.rows[0];

    for (const [index, url] of parsed.data.photoUrls.entries()) {
      await dbQuery(
        `insert into "EventPhoto" (id, url, alt, "sortOrder", "eventId")
         values (concat('photo_', md5($1 || random()::text)), $1, $2, $3, $4)`,
        [url, parsed.data.title, index, event.id],
      );
    }

    return NextResponse.json({ id: event.id });
  } catch {
    return NextResponse.json(
      { error: "Не удалось сохранить мероприятие." },
      { status: 500 },
    );
  }
}
