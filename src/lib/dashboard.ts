import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { cache } from "react";
import { RSVPStatus, Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { dbQuery } from "@/lib/db";
import { getDatabaseUrl } from "@/lib/deployment";
import { canManageEvents } from "@/lib/permissions";
import { formatRussianPlural, toDateKey } from "@/lib/utils";

export type BoardEvent = {
  id: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  category: string;
  organizerName: string;
  startAt: string;
  endAt: string;
  dateKey: string;
  capacity: number | null;
  createdByName: string;
  photos: Array<{
    id: string;
    url: string;
    alt: string | null;
  }>;
  attendeeStats: {
    going: number;
    declined: number;
  };
  attendees: Array<{
    id: string;
    name: string;
    email: string;
    role: Role;
    status: RSVPStatus;
  }>;
  currentUserResponse: RSVPStatus | null;
};

export type BoardPayload = {
  now: string;
  summary: {
    upcomingLabel: string;
    membersLabel: string;
    moderationLabel: string;
    responseLabel: string;
  };
  spotlight: BoardEvent | null;
  events: BoardEvent[];
};

type EventRow = {
  id: string;
  title: string;
  summary: string;
  description: string;
  location: string;
  category: string;
  organizerName: string;
  startAt: Date;
  endAt: Date;
  capacity: number | null;
  createdByName: string;
};

type PhotoRow = {
  id: string;
  eventId: string;
  url: string;
  alt: string | null;
};

type ResponseRow = {
  eventId: string;
  status: RSVPStatus;
  userId: string;
  name: string;
  email: string;
  role: Role;
};

const getDashboardSnapshot = cache(async () => {
  const now = new Date();

  if (!getDatabaseUrl()) {
    return {
      now,
      events: [] as EventRow[],
      photos: [] as PhotoRow[],
      responses: [] as ResponseRow[],
      users: [] as Array<{ role: Role }>,
    };
  }

  const rangeStart = startOfMonth(subMonths(now, 1));
  const rangeEnd = endOfMonth(addMonths(now, 2));

  const events = await dbQuery<EventRow>(
    `select e.id, e.title, e.summary, e.description, e.location, e.category,
            e."organizerName", e."startAt", e."endAt", e.capacity,
            u.name as "createdByName"
     from "Event" e
     join "User" u on u.id = e."createdById"
     where e."startAt" >= $1 and e."startAt" <= $2
     order by e."startAt" asc`,
    [rangeStart, rangeEnd],
  );
  const photos = await dbQuery<PhotoRow>(
    `select p.id, p."eventId", p.url, p.alt
     from "EventPhoto" p
     join "Event" e on e.id = p."eventId"
     where e."startAt" >= $1 and e."startAt" <= $2
     order by p."eventId" asc, p."sortOrder" asc`,
    [rangeStart, rangeEnd],
  );
  const responses = await dbQuery<ResponseRow>(
    `select r."eventId", r.status::text as status, u.id as "userId", u.name, u.email, u.role::text as role
     from "EventResponse" r
     join "Event" e on e.id = r."eventId"
     join "User" u on u.id = r."userId"
     where e."startAt" >= $1 and e."startAt" <= $2
     order by r."createdAt" asc`,
    [rangeStart, rangeEnd],
  );
  const users = await dbQuery<{ role: Role }>(`select role::text as role from "User"`);

  return {
    now,
    events: events.rows,
    photos: photos.rows,
    responses: responses.rows,
    users: users.rows,
  };
});

export async function getBoardPayload(viewer: SessionUser | null): Promise<BoardPayload> {
  const snapshot = await getDashboardSnapshot();
  const now = snapshot.now;
  const canSeeAttendees = canManageEvents(viewer?.role);

  const photosByEvent = new Map<string, PhotoRow[]>();
  for (const photo of snapshot.photos) {
    photosByEvent.set(photo.eventId, [...(photosByEvent.get(photo.eventId) ?? []), photo]);
  }

  const responsesByEvent = new Map<string, ResponseRow[]>();
  for (const response of snapshot.responses) {
    responsesByEvent.set(response.eventId, [
      ...(responsesByEvent.get(response.eventId) ?? []),
      response,
    ]);
  }

  const events = snapshot.events.map<BoardEvent>((event) => {
    const eventResponses = responsesByEvent.get(event.id) ?? [];
    const going = eventResponses.filter((response) => response.status === RSVPStatus.GOING).length;
    const declined = eventResponses.filter(
      (response) => response.status === RSVPStatus.DECLINED,
    ).length;

    return {
      id: event.id,
      title: event.title,
      summary: event.summary,
      description: event.description,
      location: event.location,
      category: event.category,
      organizerName: event.organizerName,
      startAt: event.startAt.toISOString(),
      endAt: event.endAt.toISOString(),
      dateKey: toDateKey(event.startAt),
      capacity: event.capacity,
      createdByName: event.createdByName,
      photos: (photosByEvent.get(event.id) ?? []).map((photo) => ({
        id: photo.id,
        url: photo.url,
        alt: photo.alt,
      })),
      attendeeStats: {
        going,
        declined,
      },
      attendees: canSeeAttendees
        ? eventResponses.map((response) => ({
            id: response.userId,
            name: response.name,
            email: response.email,
            role: response.role,
            status: response.status,
          }))
        : [],
      currentUserResponse:
        eventResponses.find((response) => response.userId === viewer?.id)?.status ?? null,
    };
  });

  const upcomingEvents = events.filter((event) => new Date(event.endAt) >= now);
  const moderatorsCount = snapshot.users.filter(
    (user) => user.role === Role.MODERATOR || user.role === Role.OWNER,
  ).length;
  const totalResponses = events.reduce(
    (total, event) => total + event.attendeeStats.going + event.attendeeStats.declined,
    0,
  );

  return {
    now: now.toISOString(),
    summary: {
      upcomingLabel: formatRussianPlural(upcomingEvents.length, [
        "событие впереди",
        "события впереди",
        "событий впереди",
      ]),
      membersLabel: formatRussianPlural(snapshot.users.length, [
        "участник в системе",
        "участника в системе",
        "участников в системе",
      ]),
      moderationLabel: formatRussianPlural(moderatorsCount, [
        "модератор в штабе",
        "модератора в штабе",
        "модераторов в штабе",
      ]),
      responseLabel: formatRussianPlural(totalResponses, [
        "отметка посещения",
        "отметки посещения",
        "отметок посещения",
      ]),
    },
    spotlight: upcomingEvents[0] ?? events[0] ?? null,
    events,
  };
}
