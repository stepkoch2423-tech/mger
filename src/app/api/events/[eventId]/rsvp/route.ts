import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { READ_ONLY_DEPLOYMENT_MESSAGE, isReadOnlyDeployment } from "@/lib/deployment";
import { rsvpSchema } from "@/lib/validators";

type Context = {
  params: Promise<{
    eventId: string;
  }>;
};

export async function POST(request: Request, context: Context) {
  if (isReadOnlyDeployment()) {
    return NextResponse.json({ error: READ_ONLY_DEPLOYMENT_MESSAGE }, { status: 503 });
  }

  const currentUser = await getCurrentUser();

  if (!currentUser) {
    return NextResponse.json({ error: "Нужно войти в аккаунт." }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = rsvpSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Не удалось сохранить отметку." },
        { status: 400 },
      );
    }

    const { eventId } = await context.params;

    await dbQuery(
      `insert into "EventResponse" (id, status, "eventId", "userId", "createdAt", "updatedAt")
       values (concat('response_', md5($1 || $2)), $3::"RSVPStatus", $1, $2, now(), now())
       on conflict ("eventId", "userId") do update set status = excluded.status, "updatedAt" = now()`,
      [eventId, currentUser.id, parsed.data.status],
    );

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Не удалось обновить отметку участия." },
      { status: 500 },
    );
  }
}
