"use client";

import type { SessionUser } from "@/lib/auth/session";
import type { BoardEvent } from "@/lib/dashboard";
import { RSVP_STATUS, type AppRsvpStatus } from "@/lib/domain-constants";
import { roleLabel } from "@/lib/domain-labels";
import { cn, formatEventDateRange, formatRussianPlural } from "@/lib/utils";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import {
  CalendarDays,
  Clock3,
  MapPin,
  PencilLine,
  ShieldCheck,
  Ticket,
  UserRoundCheck,
  Users,
} from "lucide-react";
import Image from "next/image";
import { useState, type ComponentType } from "react";

const ATTENDEES_PER_PAGE = 5;

type EventDetailPanelProps = {
  selectedDateKey: string;
  selectedEventId: string | null;
  events: BoardEvent[];
  currentUser: SessionUser | null;
  canManageEvents: boolean;
  rsvpPendingId: string | null;
  onSelectEvent: (eventId: string | null) => void;
  onOpenCreate: (dateKey: string) => void;
  onOpenEdit: (event: BoardEvent) => void;
  onRequireAuth: () => void;
  onSetResponse: (eventId: string, status: AppRsvpStatus) => void;
};

export function EventDetailPanel({
  selectedDateKey,
  selectedEventId,
  events,
  currentUser,
  canManageEvents,
  rsvpPendingId,
  onSelectEvent,
  onOpenCreate,
  onOpenEdit,
  onRequireAuth,
  onSetResponse,
}: EventDetailPanelProps) {
  const [activePhotoState, setActivePhotoState] = useState<{
    eventId: string | null;
    index: number;
  }>({
    eventId: null,
    index: 0,
  });
  const [attendeesPageState, setAttendeesPageState] = useState<{
    eventId: string | null;
    page: number;
  }>({
    eventId: null,
    page: 0,
  });

  const activeEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  if (!events.length) {
    return (
      <aside data-tone="adaptive" className="panel-surface surface-panel rounded-[1.8rem] p-5">
        <div className="rounded-[1.45rem] border border-dashed border-white/10 bg-white/[0.02] p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-[#8397bf]">
            Детали дня
          </p>
          <h3 className="mt-3 font-display text-[2.35rem] uppercase tracking-tight text-white">
            На эту дату событий нет
          </h3>
          <p className="mt-3 text-sm leading-6 text-[#93a6cb]">
            Выберите другое число или создайте новое мероприятие для выбранного дня.
          </p>

          <div className="mt-5 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-[1rem] bg-[#1a356f] text-white">
                <CalendarDays className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">
                  {format(new Date(selectedDateKey), "d MMMM, EEEE", { locale: ru })}
                </p>
                <p className="mt-1 text-sm leading-6 text-[#92a5ca]">
                  Свободный слот можно использовать для новой активности штаба.
                </p>
              </div>
            </div>

            {canManageEvents ? (
              <button
                type="button"
                onClick={() => onOpenCreate(selectedDateKey)}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3245]"
              >
                Создать мероприятие
              </button>
            ) : null}
          </div>
        </div>
      </aside>
    );
  }

  if (!activeEvent) {
    return null;
  }

  const activePhotoIndex =
    activePhotoState.eventId === activeEvent.id &&
    activePhotoState.index < activeEvent.photos.length
      ? activePhotoState.index
      : 0;
  const photo = activeEvent.photos[activePhotoIndex] ?? activeEvent.photos[0] ?? null;
  const range = formatEventDateRange(activeEvent.startAt, activeEvent.endAt);
  const seatsLeft =
    activeEvent.capacity === null
      ? null
      : Math.max(activeEvent.capacity - activeEvent.attendeeStats.going, 0);
  const attendeesPage =
    attendeesPageState.eventId === activeEvent.id ? attendeesPageState.page : 0;
  const attendeesPagesTotal = Math.max(
    1,
    Math.ceil(activeEvent.attendees.length / ATTENDEES_PER_PAGE),
  );
  const visibleAttendees = activeEvent.attendees.slice(
    attendeesPage * ATTENDEES_PER_PAGE,
    attendeesPage * ATTENDEES_PER_PAGE + ATTENDEES_PER_PAGE,
  );

  return (
    <aside
      data-tone="adaptive"
      className="panel-surface surface-panel overflow-hidden rounded-[1.8rem] scroll-mt-4"
    >
      <div className="overflow-x-auto border-b border-white/8 px-4 py-4">
        <div
          className={cn(
            "flex gap-2",
            events.length === 1 ? "min-w-full justify-center" : "min-w-max",
          )}
        >
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event.id)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition",
                events.length === 1 && "w-full max-w-full text-center",
                event.id === activeEvent.id
                  ? "border-[#4a7cff] bg-[#2b4da7] text-white"
                  : "border-white/10 bg-white/[0.04] text-[#9bb0d6] hover:border-white/16 hover:text-white",
              )}
            >
              <span className="block truncate">
                {format(new Date(event.startAt), "HH:mm")} · {event.title}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-5 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <span className="inline-flex rounded-full border border-[#4d6fd8]/30 bg-[#27439b]/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9bb3ff]">
              {activeEvent.category}
            </span>
            <h3 className="mt-3 font-display text-[1.95rem] uppercase leading-[0.92] tracking-tight text-white sm:text-[2.35rem]">
              {activeEvent.title}
            </h3>
            <p className="mt-2 text-sm leading-6 text-[#93a7cb]">{activeEvent.summary}</p>
          </div>

          {canManageEvents ? (
            <button
              type="button"
              onClick={() => onOpenEdit(activeEvent)}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#b4c6ea] transition hover:bg-white/[0.08] hover:text-white"
            >
              <PencilLine className="h-4 w-4" />
              Изменить
            </button>
          ) : null}
        </div>

        <div className="rounded-[1.4rem] bg-white/[0.02] p-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[#9cb2d8] sm:text-[11px] sm:tracking-[0.24em]">
            <span>{range.day}</span>
            <span>•</span>
            <span>{range.time}</span>
          </div>

          <div className="relative flex h-[220px] items-center justify-center overflow-hidden rounded-[1.2rem] bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_55%),rgba(255,255,255,0.02)] sm:h-[320px]">
            {photo ? (
              <Image
                src={photo.url}
                alt={photo.alt ?? activeEvent.title}
                fill
                sizes="(max-width: 1280px) 100vw, 640px"
                className="object-contain p-3"
                priority
                loading="eager"
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(33,74,168,0.92),rgba(234,35,52,0.76))]" />
            )}
          </div>
        </div>

        {activeEvent.photos.length > 1 ? (
          <div className="-mx-1 overflow-x-auto pb-1 sm:mx-0 sm:overflow-visible">
            <div className="flex gap-2 px-1 sm:grid sm:grid-cols-3 sm:px-0 xl:grid-cols-4">
              {activeEvent.photos.map((item, index) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    setActivePhotoState({
                      eventId: activeEvent.id,
                      index,
                    })
                  }
                  className={cn(
                    "relative aspect-[1.18/0.84] w-[42%] min-w-[42%] shrink-0 snap-start overflow-hidden rounded-[1rem] border bg-[#0c1729] sm:w-auto sm:min-w-0",
                    index === activePhotoIndex
                      ? "border-[#4a7cff]"
                      : "border-white/10",
                  )}
                >
                  <Image
                    src={item.url}
                    alt={item.alt ?? activeEvent.title}
                    fill
                    sizes="(max-width: 640px) 42vw, 180px"
                    className="object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8094bb]">
            Что будет происходить
          </p>
          <p className="mt-3 whitespace-pre-line text-sm leading-7 text-[#d7e4fb]">
            {activeEvent.description}
          </p>
        </div>

        <div className="overflow-hidden rounded-[1.25rem] border border-white/8 bg-white/[0.025]">
          <InfoRow icon={CalendarDays} label="Дата" value={range.day} />
          <InfoRow icon={Clock3} label="Время" value={range.time} />
          <InfoRow icon={MapPin} label="Локация" value={activeEvent.location} />
          <InfoRow icon={UserRoundCheck} label="Организатор" value={activeEvent.organizerName} />
        </div>

        <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8094bb]">
                Ответ на участие
              </p>
              <h4 className="mt-2 text-base font-semibold leading-6 text-white sm:text-lg">
                {currentUser
                  ? activeEvent.currentUserResponse === RSVP_STATUS.GOING
                    ? "Вы отметили: приду"
                    : activeEvent.currentUserResponse === RSVP_STATUS.DECLINED
                      ? "Вы отметили: не приду"
                      : "Выберите ответ"
                  : "Войдите, чтобы ответить"}
              </h4>
              <p className="mt-2 text-sm leading-6 text-[#93a7cb]">
                {currentUser
                  ? "Ответ можно изменить в любой момент."
                  : "После входа вы сможете отметить участие в один тап."}
              </p>
            </div>
            <div className="self-start rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.22em] text-[#9db1d7] sm:text-[11px] sm:tracking-[0.24em]">
              {currentUser ? roleLabel[currentUser.role] : "Гость"}
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() =>
                currentUser
                  ? onSetResponse(activeEvent.id, RSVP_STATUS.GOING)
                  : onRequireAuth()
              }
              disabled={rsvpPendingId === activeEvent.id}
              className={cn(
                "rounded-full border px-4 py-3 text-center text-sm font-semibold transition",
                activeEvent.currentUserResponse === RSVP_STATUS.GOING
                  ? "border-emerald-400/50 bg-emerald-500 text-white"
                  : "border-emerald-400/24 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/18",
              )}
            >
              Я приду
            </button>

            <button
              type="button"
              onClick={() =>
                currentUser
                  ? onSetResponse(activeEvent.id, RSVP_STATUS.DECLINED)
                  : onRequireAuth()
              }
              disabled={rsvpPendingId === activeEvent.id}
              className={cn(
                "rounded-full border px-4 py-3 text-center text-sm font-semibold transition",
                activeEvent.currentUserResponse === RSVP_STATUS.DECLINED
                  ? "border-rose-400/50 bg-rose-500 text-white"
                  : "border-rose-400/24 bg-rose-500/10 text-rose-100 hover:bg-rose-500/18",
              )}
            >
              Не приду
            </button>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-3">
          <DetailStat
            icon={Users}
            label="Придут"
            value={formatRussianPlural(activeEvent.attendeeStats.going, [
              "человек",
              "человека",
              "человек",
            ])}
          />
          <DetailStat
            icon={Ticket}
            label="Не смогут"
            value={formatRussianPlural(activeEvent.attendeeStats.declined, [
              "человек",
              "человека",
              "человек",
            ])}
          />
          <DetailStat
            icon={ShieldCheck}
            label="Свободно мест"
            value={seatsLeft === null ? "Без лимита" : `${seatsLeft}`}
          />
        </div>

        {canManageEvents ? (
          <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8094bb]">
                  Список откликов
                </p>
              </div>
              <span className="max-w-full rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#9db1d7] sm:text-[11px] sm:tracking-[0.24em]">
                Создал: {activeEvent.createdByName}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {activeEvent.attendees.length ? (
                visibleAttendees.map((attendee) => (
                  <div
                    key={attendee.id}
                    className="flex flex-col gap-2 rounded-[1.05rem] border border-white/8 bg-[#0c1729] px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white">{attendee.name}</p>
                      <p className="truncate text-sm text-[#91a5ca]">
                        {attendee.email} · {roleLabel[attendee.role]}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em]",
                        attendee.status === RSVP_STATUS.GOING
                          ? "bg-emerald-500/12 text-emerald-300"
                          : "bg-rose-500/12 text-rose-300",
                      )}
                    >
                      {attendee.status === RSVP_STATUS.GOING ? "Придёт" : "Не сможет"}
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-sm leading-6 text-[#90a3c7]">
                  Пока никто не отметил участие. После входа участники смогут отвечать прямо из календаря.
                </p>
              )}
            </div>

            {activeEvent.attendees.length > ATTENDEES_PER_PAGE ? (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {buildPageNumbers(attendeesPagesTotal, attendeesPage + 1).map((pageNumber) => (
                  <button
                    key={pageNumber}
                    type="button"
                    onClick={() =>
                      setAttendeesPageState({
                        eventId: activeEvent.id,
                        page: pageNumber - 1,
                      })
                    }
                    className={cn(
                      "inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-semibold transition",
                      attendeesPage + 1 === pageNumber
                        ? "border-[#4a7cff] bg-[#2b4da7] text-white"
                        : "border-white/10 bg-white/[0.04] text-[#9bb0d6] hover:border-white/16 hover:text-white",
                    )}
                  >
                    {pageNumber}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </aside>
  );
}

type InfoTileProps = {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
};

function InfoRow({ icon: Icon, label, value }: InfoTileProps) {
  return (
    <div className="flex items-center gap-3 border-b border-white/8 px-4 py-3 last:border-b-0">
      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[1rem] bg-white/[0.06] text-[#9eb3da]">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1 sm:flex sm:items-center sm:justify-between sm:gap-4">
        <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7f93b7]">
          {label}
        </p>
        <p className="mt-1 break-words text-sm font-semibold text-white sm:mt-0 sm:text-right">
          {value}
        </p>
      </div>
    </div>
  );
}

function DetailStat({ icon: Icon, label, value }: InfoTileProps) {
  return (
    <div className="rounded-[1.05rem] border border-white/8 bg-white/[0.025] px-4 py-3">
      <div className="flex items-center gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] bg-white/[0.06] text-[#9eb3da]">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[#7f93b7]">
            {label}
          </p>
          <p className="mt-1 break-words text-sm font-semibold text-white">{value}</p>
        </div>
      </div>
    </div>
  );
}

function buildPageNumbers(totalPages: number, currentPage: number) {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const pages = new Set<number>([1, totalPages, currentPage]);

  if (currentPage > 1) {
    pages.add(currentPage - 1);
  }

  if (currentPage < totalPages) {
    pages.add(currentPage + 1);
  }

  return Array.from(pages).sort((left, right) => left - right);
}
