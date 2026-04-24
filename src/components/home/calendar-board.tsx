"use client";

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
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { BoardEvent } from "@/lib/dashboard";
import { cn, toDateKey } from "@/lib/utils";

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
    <section className="panel-surface overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,40,0.96),rgba(8,16,31,0.96))] shadow-[0_28px_80px_rgba(0,0,0,0.28)]">
      <div className="border-b border-white/8 px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7e93bc]">
              Календарь движения
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onPreviousMonth}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Предыдущий месяц"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <h2 className="font-display text-[2rem] uppercase tracking-tight text-white sm:text-[2.3rem]">
                {monthLabel}
              </h2>
              <button
                type="button"
                onClick={onNextMonth}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                aria-label="Следующий месяц"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#95a8cc]">
              Прошлый месяц: {previousMonthEvents}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#95a8cc]">
              Следующий: {nextMonthEvents}
            </span>
            <button
              type="button"
              onClick={onJumpToToday}
              className="rounded-full bg-[var(--mger-red)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#ff3748]"
            >
              Сегодня
            </button>
          </div>
        </div>
      </div>

      <div className="border-b border-white/8 px-4 py-3 sm:hidden">
        <div className="flex items-center justify-between rounded-[1.2rem] border border-white/8 bg-white/[0.03] px-3 py-2 text-[11px] font-medium text-[#9aaed3]">
          <span>Листайте календарь по горизонтали</span>
          <span className="rounded-full bg-white/[0.08] px-3 py-1 font-semibold text-white">Swipe</span>
        </div>
      </div>

      <div className="overflow-x-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="min-w-[760px]">
          <div className="mb-2 grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="rounded-[1rem] bg-white/[0.04] px-2 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8195bb]"
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

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => onSelectDate(day)}
                  className={cn(
                    "group relative min-h-[132px] rounded-[1.45rem] border px-3 py-3 text-left transition",
                    active
                      ? "border-[#3f6fe3] bg-[linear-gradient(180deg,rgba(58,94,190,0.32),rgba(16,27,47,0.92))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_14px_34px_rgba(10,20,44,0.45)]"
                      : "border-white/8 bg-white/[0.03] hover:border-white/16 hover:bg-white/[0.05]",
                    !insideCurrentMonth && "opacity-45",
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={cn(
                        "inline-flex h-9 w-9 items-center justify-center rounded-full text-base font-bold",
                        active
                          ? "bg-white text-[#17326f]"
                          : isToday(day)
                            ? "bg-[var(--mger-red)] text-white"
                            : "bg-white/[0.06] text-white",
                      )}
                    >
                      {format(day, "d")}
                    </span>

                    {canManageEvents ? (
                      <span className="rounded-full border border-white/8 bg-white/[0.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.24em] text-[#7f93b9]">
                        Штаб
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-3">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#7f94bb]">
                      {dayEvents.length
                        ? `${dayEvents.length} ${dayEvents.length === 1 ? "событие" : "события"}`
                        : insideCurrentMonth
                          ? "свободно"
                          : "другой месяц"}
                    </p>

                    {dayEvents.length ? (
                      <div className="mt-2 space-y-2">
                        {dayEvents.slice(0, 2).map((event) => (
                          <div
                            key={event.id}
                            className={cn(
                              "rounded-[1rem] px-2.5 py-2 text-xs leading-4",
                              active
                                ? "bg-white/[0.92] text-slate-900"
                                : "bg-[#10203a] text-[#d8e4ff]",
                            )}
                          >
                            <span className="block text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--mger-red)]">
                              {format(new Date(event.startAt), "HH:mm")}
                            </span>
                            <span className="mt-1 block line-clamp-2 break-words">{event.title}</span>
                          </div>
                        ))}

                        {dayEvents.length > 2 ? (
                          <p className="px-1 text-[11px] font-medium text-[#8ea2c7]">
                            Ещё {dayEvents.length - 2}
                          </p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-xs leading-5 text-[#7f93b8]">
                        {insideCurrentMonth ? "Свободный слот для нового выезда." : "Дата соседнего месяца."}
                      </p>
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
          <span>{events.length} событий в диапазоне обзора</span>
        </div>
      </div>
    </section>
  );
}
