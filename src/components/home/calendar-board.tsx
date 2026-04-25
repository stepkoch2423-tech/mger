"use client";

import type { BoardEvent } from "@/lib/dashboard";
import { cn, formatRussianPlural, toDateKey } from "@/lib/utils";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  subMonths,
} from "date-fns";
import { ru } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

type CalendarBoardProps = {
  selectedMonth: Date;
  selectedDateKey: string;
  events: BoardEvent[];
  canManageEvents: boolean;
  onSelectDate: (date: Date) => void;
  onJumpToToday: () => void;
  onPreviousMonth: () => void;
  onNextMonth: () => void;
};

const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

export function CalendarBoard({
  selectedMonth,
  selectedDateKey,
  events,
  canManageEvents,
  onSelectDate,
  onJumpToToday,
  onPreviousMonth,
  onNextMonth,
}: CalendarBoardProps) {
  const gridStart = startOfWeek(startOfMonth(selectedMonth), { weekStartsOn: 1 });
  const gridEnd = endOfWeek(endOfMonth(selectedMonth), { weekStartsOn: 1 });
  const calendarDays = eachDayOfInterval({ start: gridStart, end: gridEnd });

  const eventsByDate = new Map<string, BoardEvent[]>();
  for (const event of events) {
    const bucket = eventsByDate.get(event.dateKey) ?? [];
    bucket.push(event);
    eventsByDate.set(event.dateKey, bucket);
  }

  const monthLabel = format(selectedMonth, "LLLL yyyy", { locale: ru });
  const nextMonthEvents = events.filter((event) =>
    isSameMonth(addMonths(selectedMonth, 1), new Date(event.startAt)),
  ).length;
  const previousMonthEvents = events.filter((event) =>
    isSameMonth(subMonths(selectedMonth, 1), new Date(event.startAt)),
  ).length;

  return (
    <section className="overflow-hidden rounded-[1.55rem] border border-white/6 bg-black/10">
      <div className="px-4 py-4 sm:px-5">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-end">
          <div className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8398be]">
              Календарь движения
            </p>
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={onPreviousMonth}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="min-w-0 font-display text-[clamp(2rem,4vw,3.5rem)] uppercase leading-[0.92] tracking-tight text-white">
                {monthLabel}
              </h2>
              <button
                type="button"
                onClick={onNextMonth}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#95a8cc] xl:justify-end">
            <button
              type="button"
              onClick={onJumpToToday}
              className="rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3748]"
            >
              Сегодня
            </button>
            <span className="surface-chip rounded-full px-3 py-2">
              Прошлый месяц: {previousMonthEvents}
            </span>
            <span className="surface-chip rounded-full px-3 py-2">
              Следующий: {nextMonthEvents}
            </span>
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 px-3 py-4 sm:hidden">
        <div className="mb-2 grid grid-cols-7 gap-1.5">
          {weekDays.map((day) => (
            <div
              key={day}
              className="rounded-[0.75rem] bg-white/[0.035] px-1 py-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8195bb]"
            >
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {calendarDays.map((day) => {
            const dateKey = toDateKey(day);
            const dayEvents = eventsByDate.get(dateKey) ?? [];
            const active = dateKey === selectedDateKey;
            const insideCurrentMonth = isSameMonth(day, selectedMonth);

            return (
              <button
                key={dateKey}
                type="button"
                onClick={() => onSelectDate(day)}
                className={cn(
                  "relative aspect-square rounded-[0.95rem] border p-1.5 transition",
                  active
                    ? "border-[#4a76df] bg-[linear-gradient(180deg,rgba(45,73,151,0.32),rgba(11,19,34,0.94))]"
                    : "border-white/8 bg-white/[0.025] hover:border-white/14 hover:bg-white/[0.04]",
                  !insideCurrentMonth && "opacity-45",
                )}
              >
                <div className="flex h-full flex-col">
                  <span
                    className={cn(
                      "inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                      active
                        ? "bg-white text-[#17326f]"
                        : isToday(day)
                          ? "bg-[var(--mger-red)] text-white"
                          : "bg-white/[0.06] text-white",
                    )}
                  >
                    {format(day, "d")}
                  </span>

                  <div className="mt-auto flex items-center justify-between">
                    <span className="text-[9px] font-semibold uppercase tracking-[0.18em] text-[#8398be]">
                      {dayEvents.length
                        ? `${dayEvents.length}`
                        : insideCurrentMonth
                          ? ""
                          : "арх"}
                    </span>
                    {dayEvents.length ? (
                      <span className="inline-flex h-2.5 w-2.5 rounded-full bg-[var(--mger-red)]" />
                    ) : null}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="hidden border-t border-white/8 px-3 py-4 sm:block sm:px-4">
        <div>
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="rounded-[0.9rem] bg-white/[0.035] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8195bb]"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {calendarDays.map((day) => {
              const dateKey = toDateKey(day);
              const dayEvents = eventsByDate.get(dateKey) ?? [];
              const active = dateKey === selectedDateKey;
              const insideCurrentMonth = isSameMonth(day, selectedMonth);
              const firstEvent = dayEvents[0] ?? null;

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "group flex aspect-square min-w-0 flex-col overflow-hidden rounded-[1.15rem] border px-2.5 py-2.5 text-left transition",
                    active
                      ? "border-[#4a76df] bg-[linear-gradient(180deg,rgba(45,73,151,0.3),rgba(11,19,34,0.94))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_32px_rgba(10,20,44,0.34)]"
                      : "border-white/8 bg-white/[0.025] hover:border-white/14 hover:bg-white/[0.04]",
                    !insideCurrentMonth && "opacity-45",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-[0.95rem] text-sm font-bold",
                        active
                          ? "bg-white text-[#17326f]"
                          : isToday(day)
                            ? "bg-[var(--mger-red)] text-white"
                            : "bg-white/[0.06] text-white",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {dayEvents.length ? (
                      <span className="inline-flex min-w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#dce7ff]">
                        {dayEvents.length}
                      </span>
                    ) : insideCurrentMonth && canManageEvents ? (
                      <span
                        className={cn(
                          "inline-flex h-8 w-8 items-center justify-center rounded-[0.9rem] border border-white/10 bg-white/[0.04] text-[#9eb3d8] transition group-hover:border-[#4a76df]/44 group-hover:text-white",
                          active && "border-[#4a76df]/44 text-white",
                        )}
                        aria-hidden="true"
                      >
                        <Plus className="h-4 w-4" />
                      </span>
                    ) : (
                      <span className="inline-flex h-8 items-center text-[10px] font-semibold uppercase tracking-[0.24em] text-[#8599c0]">
                        {insideCurrentMonth ? "Пусто" : "Архив"}
                      </span>
                    )}
                  </div>

                  <div className="mt-3 flex min-h-0 flex-1 flex-col justify-between">
                    {firstEvent ? (
                      <div className="min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[var(--mger-red)]">
                          {format(new Date(firstEvent.startAt), "HH:mm")}
                        </p>
                        <p
                          className={cn(
                            "line-clamp-2 text-[13px] font-semibold leading-5",
                            active ? "text-white" : "text-[#dce7ff]",
                          )}
                        >
                          {firstEvent.title}
                        </p>
                        {dayEvents.length > 1 ? (
                          <p className="mt-2 text-[11px] leading-4 text-[#8ea2c7]">
                            + ещё {dayEvents.length - 1}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <div className="mt-auto">
                        <p className="text-[12px] font-semibold leading-4 text-[#d8e5ff]">
                          {insideCurrentMonth ? "Свободно" : "Соседний месяц"}
                        </p>
                        {insideCurrentMonth ? (
                          <p className="mt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7f94bb]">
                            {canManageEvents ? "Нажмите, чтобы добавить" : "День без событий"}
                          </p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="border-t border-white/8 px-4 py-3 text-xs text-[#94a8cd] sm:px-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Активная неделя:{" "}
            <strong className="font-semibold text-white">
              {format(gridStart, "d", { locale: ru })} -{" "}
              {format(addDays(gridStart, 6), "d MMMM", { locale: ru })}
            </strong>
          </span>
          <span>{formatRussianPlural(events.length, ["событие", "события", "событий"])} в обзоре</span>
        </div>
      </div>
    </section>
  );
}
