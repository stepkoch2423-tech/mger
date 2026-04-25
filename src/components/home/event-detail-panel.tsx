"use client";

import { type ComponentType, useState } from "react";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import Image from "next/image";
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
import type { SessionUser } from "@/lib/auth/session";
import type { BoardEvent } from "@/lib/dashboard";
import { RSVP_STATUS, type AppRsvpStatus } from "@/lib/domain-constants";
import { cn, formatEventDateRange, formatRussianPlural } from "@/lib/utils";

const roleLabel = {
  OWNER: "Владелец",
  MODERATOR: "Модератор",
  ACTIVIST: "Активист",
} as const;

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
  const [activePhoto, setActivePhoto] = useState(0);

  const activeEvent =
    events.find((event) => event.id === selectedEventId) ?? events[0] ?? null;

  if (!events.length) {
    return (
      <aside className="panel-surface surface-panel rounded-[1.8rem] p-5">
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
    activePhoto < activeEvent.photos.length ? activePhoto : 0;
  const photo = activeEvent.photos[activePhotoIndex] ?? activeEvent.photos[0] ?? null;
  const range = formatEventDateRange(activeEvent.startAt, activeEvent.endAt);
  const seatsLeft =
    activeEvent.capacity === null
      ? null
      : Math.max(activeEvent.capacity - activeEvent.attendeeStats.going, 0);

  return (
    <aside className="panel-surface surface-panel overflow-hidden rounded-[1.8rem]">
      <div className="overflow-x-auto border-b border-white/8 px-4 py-4">
        <div className="flex min-w-max gap-2">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event.id)}
              className={cn(
                "rounded-full border px-3 py-2 text-xs font-semibold transition",
                event.id === activeEvent.id
                  ? "border-[#4a7cff] bg-[#2b4da7] text-white"
                  : "border-white/10 bg-white/[0.04] text-[#9bb0d6] hover:border-white/16 hover:text-white",
              )}
            >
              {format(new Date(event.startAt), "HH:mm")} · {event.title}
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
            <h3 className="mt-3 font-display text-[2.35rem] uppercase leading-[0.92] tracking-tight text-white">
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

        <div className="relative overflow-hidden rounded-[1.4rem] border border-white/8 bg-[#0b1628]">
          <div className="relative aspect-[1.24/0.92]">
            {photo ? (
              <Image
                src={photo.url}
                alt={photo.alt ?? activeEvent.title}
                fill
                sizes="(max-width: 1280px) 100vw, 420px"
                className="object-cover"
                priority
              />
            ) : (
              <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(33,74,168,0.92),rgba(234,35,52,0.76))]" />
            )}

            <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_10%,rgba(6,12,22,0.82)_100%)]" />
            <div className="absolute inset-x-0 bottom-0 p-4">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/72">
                <span>{range.day}</span>
                <span>•</span>
                <span>{range.time}</span>
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/88">
                {activeEvent.description}
              </p>
            </div>
          </div>
        </div>

        {activeEvent.photos.length > 1 ? (
          <div className="grid grid-cols-4 gap-2">
            {activeEvent.photos.map((item, index) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setActivePhoto(index)}
                className={cn(
                  "relative aspect-[1.08/0.82] overflow-hidden rounded-[1rem] border",
                  index === activePhotoIndex
                    ? "border-[#4a7cff]"
                    : "border-white/10",
                )}
              >
                <Image
                  src={item.url}
                  alt={item.alt ?? activeEvent.title}
                  fill
                  sizes="120px"
                  className="object-cover"
                />
              </button>
            ))}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-[1.25rem] border border-white/8 bg-white/[0.025]">
          <InfoRow icon={CalendarDays} label="Дата" value={range.day} />
          <InfoRow icon={Clock3} label="Время" value={range.time} />
          <InfoRow icon={MapPin} label="Локация" value={activeEvent.location} />
          <InfoRow icon={UserRoundCheck} label="Организатор" value={activeEvent.organizerName} />
        </div>

        <div className="rounded-[1.35rem] border border-white/8 bg-white/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8094bb]">
                Ответ на участие
              </p>
              <h4 className="mt-2 text-lg font-semibold text-white">
                {currentUser
                  ? activeEvent.currentUserResponse === RSVP_STATUS.GOING
                    ? "Вы отметили участие"
                    : activeEvent.currentUserResponse === RSVP_STATUS.DECLINED
                      ? "Вы отметили, что не сможете"
                      : "Отметьте участие, чтобы штаб видел отклик"
                  : "Войдите, чтобы отметить участие"}
              </h4>
            </div>
            <div className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9db1d7]">
              {currentUser ? roleLabel[currentUser.role] : "Гость"}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() =>
                currentUser
                  ? onSetResponse(activeEvent.id, RSVP_STATUS.GOING)
                  : onRequireAuth()
              }
              disabled={rsvpPendingId === activeEvent.id}
              className={cn(
                "rounded-[1.05rem] border px-4 py-3 text-left transition",
                activeEvent.currentUserResponse === RSVP_STATUS.GOING
                  ? "border-emerald-400/40 bg-emerald-500/12"
                  : "border-white/8 bg-white/[0.03] hover:border-emerald-400/30 hover:bg-emerald-500/8",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-emerald-300">
                Я приду
              </span>
              <p className="mt-1 text-sm leading-6 text-[#c9d7f3]">
                Штаб увидит вас в списке присутствующих.
              </p>
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
                "rounded-[1.05rem] border px-4 py-3 text-left transition",
                activeEvent.currentUserResponse === RSVP_STATUS.DECLINED
                  ? "border-rose-400/40 bg-rose-500/12"
                  : "border-white/8 bg-white/[0.03] hover:border-rose-400/30 hover:bg-rose-500/8",
              )}
            >
              <span className="text-[11px] font-semibold uppercase tracking-[0.24em] text-rose-300">
                Не смогу
              </span>
              <p className="mt-1 text-sm leading-6 text-[#c9d7f3]">
                Отметка сохранится для корректной численности.
              </p>
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
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8094bb]">
                  Список откликов
                </p>
                <h4 className="mt-2 text-lg font-semibold text-white">
                  Модератор видит всех, кто ответил
                </h4>
              </div>
              <span className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#9db1d7]">
                Создал: {activeEvent.createdByName}
              </span>
            </div>

            <div className="mt-4 space-y-2">
              {activeEvent.attendees.length ? (
                activeEvent.attendees.map((attendee) => (
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
                  Пока никто не отметил участие. После регистрации активисты смогут отвечать прямо из календаря.
                </p>
              )}
            </div>
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
