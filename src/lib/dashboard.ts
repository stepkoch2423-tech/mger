import { addMonths, endOfMonth, startOfMonth, subMonths } from "date-fns";
import { cache } from "react";
import { RSVPStatus, Role } from "@prisma/client";
import type { SessionUser } from "@/lib/auth/session";
import { getDatabaseUrl } from "@/lib/deployment";
import { canManageEvents } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
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

const getDashboardSnapshot = cache(async () => {
  const now = new Date();

  if (!getDatabaseUrl()) {
    return {
      now,
      events: [],
      users: [],
    };
  }

  const rangeStart = startOfMonth(subMonths(now, 1));
  const rangeEnd = endOfMonth(addMonths(now, 2));

  const [events, users] = await Promise.all([
    prisma.event.findMany({
      where: {
        startAt: {
          gte: rangeStart,
          lte: rangeEnd,
        },
      },
      orderBy: {
        startAt: "asc",
      },
      include: {
        createdBy: {
          select: {
            name: true,
          },
        },
        photos: {
          orderBy: {
            sortOrder: "asc",
          },
        },
        responses: {
          orderBy: {
            createdAt: "asc",
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    }),
    prisma.user.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      select: {
        role: true,
      },
    }),
  ]);

  return {
    now,
    events,
    users,
  };
});

export async function getBoardPayload(viewer: SessionUser | null): Promise<BoardPayload> {
  const snapshot = await getDashboardSnapshot();
  const now = snapshot.now;
  const canSeeAttendees = canManageEvents(viewer?.role);

  const events = snapshot.events.map<BoardEvent>((event) => {
    const going = event.responses.filter((response) => response.status === RSVPStatus.GOING).length;
    const declined = event.responses.filter(
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
      createdByName: event.createdBy.name,
      photos: event.photos.map((photo) => ({
        id: photo.id,
        url: photo.url,
        alt: photo.alt,
      })),
      attendeeStats: {
        going,
        declined,
      },
      attendees: canSeeAttendees
        ? event.responses.map((response) => ({
            id: response.user.id,
            name: response.user.name,
            email: response.user.email,
            role: response.user.role,
            status: response.status,
          }))
        : [],
      currentUserResponse:
        event.responses.find((response) => response.userId === viewer?.id)?.status ?? null,
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
