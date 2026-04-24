"use client";

import { type FormEvent, useDeferredValue, useState, useTransition } from "react";
import { RSVPStatus, Role } from "@prisma/client";
import { format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bell,
  CalendarRange,
  FileText,
  FolderKanban,
  ImageIcon,
  KeyRound,
  LayoutGrid,
  List,
  LogOut,
  MessageSquareMore,
  Newspaper,
  Search,
  Settings,
  ShieldCheck,
  UserRound,
  Users,
  WandSparkles,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { canManageEvents, canManageMembers } from "@/lib/permissions";
import type { BoardEvent, BoardPayload } from "@/lib/dashboard";
import { cn, formatRussianPlural, toDateKey } from "@/lib/utils";
import { CalendarBoard } from "@/components/home/calendar-board";
import { EventDetailPanel } from "@/components/home/event-detail-panel";
import { Modal } from "@/components/ui/modal";

type AuthMode = "login" | "register";
type ContentView = "calendar" | "list";

type FlashState =
  | {
      type: "success" | "error";
      text: string;
    }
  | null;

type EventEditorState = {
  open: boolean;
  mode: "create" | "edit";
  event: BoardEvent | null;
  dateKey: string;
};

const inputClass =
  "w-full rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white outline-none transition placeholder:text-[#6f84ac] focus:border-[#4a7cff] focus:bg-white/[0.06] focus:ring-4 focus:ring-[rgba(74,124,255,0.16)]";
const textAreaClass = `${inputClass} min-h-[128px] resize-y`;
const labelClass = "mb-2 block text-[11px] font-semibold uppercase tracking-[0.28em] text-[#7f93bb]";

const navigationItems: Array<{
  icon: typeof LayoutGrid;
  label: string;
  active?: boolean;
  badge?: string;
}> = [
  { icon: LayoutGrid, label: "Доска мероприятий", active: true },
  { icon: CalendarRange, label: "Календарь" },
  { icon: FolderKanban, label: "Мои мероприятия" },
  { icon: MessageSquareMore, label: "Сообщения", badge: "3" },
  { icon: Users, label: "Команда" },
  { icon: UserRound, label: "Участники" },
  { icon: FileText, label: "Документы" },
  { icon: Newspaper, label: "Новости" },
  { icon: ImageIcon, label: "Галерея" },
  { icon: Settings, label: "Настройки" },
];

function getDefaultDateKey(board: BoardPayload) {
  const todayKey = toDateKey(new Date(board.now));

  if (board.events.some((event) => event.dateKey === todayKey)) {
    return todayKey;
  }

  return board.spotlight?.dateKey ?? todayKey;
}

function getEventsForDate(events: BoardEvent[], dateKey: string) {
  return events.filter((event) => event.dateKey === dateKey);
}

function getInitialEditorState(dateKey: string, event: BoardEvent | null) {
  const startDate = event ? new Date(event.startAt) : new Date(`${dateKey}T12:00:00`);
  const endDate = event ? new Date(event.endAt) : new Date(`${dateKey}T14:00:00`);

  return {
    title: event?.title ?? "",
    category: event?.category ?? "Волонтёрство",
    location: event?.location ?? "",
    organizerName: event?.organizerName ?? "Региональный штаб",
    summary: event?.summary ?? "",
    description: event?.description ?? "",
    date: format(startDate, "yyyy-MM-dd"),
    startTime: format(startDate, "HH:mm"),
    endTime: format(endDate, "HH:mm"),
    capacity: event?.capacity ? `${event.capacity}` : "",
    photoUrls: event?.photos.map((photo) => photo.url) ?? [],
  };
}

export function EventsBoardApp({
  board,
  currentUser,
}: {
  board: BoardPayload;
  currentUser: SessionUser | null;
}) {
  const router = useRouter();
  const [selectedMonth, setSelectedMonth] = useState(() => startOfMonth(new Date(board.now)));
  const [selectedDateKey, setSelectedDateKey] = useState(() => getDefaultDateKey(board));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(() => board.spotlight?.id ?? null);
  const [contentView, setContentView] = useState<ContentView>("calendar");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("register");
  const [flash, setFlash] = useState<FlashState>(null);
  const [rsvpPendingId, setRsvpPendingId] = useState<string | null>(null);
  const [rolePendingId, setRolePendingId] = useState<string | null>(null);
  const [eventQuery, setEventQuery] = useState("");
  const [memberQuery, setMemberQuery] = useState("");
  const [editorState, setEditorState] = useState<EventEditorState>({
    open: false,
    mode: "create",
    event: null,
    dateKey: getDefaultDateKey(board),
  });
  const [isRefreshing, startRefresh] = useTransition();

  const deferredEventQuery = useDeferredValue(eventQuery);
  const deferredMemberQuery = useDeferredValue(memberQuery);
  const dateEvents = getEventsForDate(board.events, selectedDateKey);
  const resolvedSelectedEventId = dateEvents.some((event) => event.id === selectedEventId)
    ? selectedEventId
    : dateEvents[0]?.id ?? null;
  const isModeratorView = canManageEvents(currentUser?.role);
  const isOwnerView = canManageMembers(currentUser?.role);
  const filteredEventDesk = board.events.filter((event) => {
    const query = deferredEventQuery.trim().toLowerCase();

    if (!query) {
      return new Date(event.endAt) >= new Date(board.now);
    }

    return [event.title, event.location, event.category, event.organizerName]
      .join(" ")
      .toLowerCase()
      .includes(query);
  });
  const filteredMembers = board.members.filter((member) => {
    const query = deferredMemberQuery.trim().toLowerCase();

    if (!query) {
      return true;
    }

    return [member.name, member.email, roleLabel[member.role]].join(" ").toLowerCase().includes(query);
  });

  function refreshBoard() {
    startRefresh(() => {
      router.refresh();
    });
  }

  function openCreateForDate(dateKey: string) {
    setEditorState({
      open: true,
      mode: "create",
      event: null,
      dateKey,
    });
  }

  function openEditEvent(event: BoardEvent) {
    setEditorState({
      open: true,
      mode: "edit",
      event,
      dateKey: event.dateKey,
    });
  }

  function handleBoardSuccess(message: string) {
    setFlash({ type: "success", text: message });
    refreshBoard();
  }

  function jumpToEvent(event: BoardEvent) {
    setSelectedDateKey(event.dateKey);
    setSelectedMonth(startOfMonth(new Date(event.startAt)));
    setSelectedEventId(event.id);
  }

  async function handleLogout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });

    if (!response.ok) {
      setFlash({ type: "error", text: "Не удалось завершить сессию." });
      return;
    }

    setFlash({ type: "success", text: "Сессия завершена." });
    refreshBoard();
  }

  async function handleRsvp(eventId: string, status: RSVPStatus) {
    if (!currentUser) {
      setAuthMode("login");
      setAuthOpen(true);
      return;
    }

    setRsvpPendingId(eventId);

    try {
      const response = await fetch(`/api/events/${eventId}/rsvp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFlash({
          type: "error",
          text: payload.error ?? "Не удалось обновить участие.",
        });
        return;
      }

      setFlash({
        type: "success",
        text:
          status === RSVPStatus.GOING
            ? "Отметка «Я приду» сохранена."
            : "Отметка «Не смогу» сохранена.",
      });
      refreshBoard();
    } finally {
      setRsvpPendingId(null);
    }
  }

  async function handleRoleChange(userId: string, role: "ACTIVIST" | "MODERATOR") {
    setRolePendingId(userId);

    try {
      const response = await fetch(`/api/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role }),
      });

      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setFlash({
          type: "error",
          text: payload.error ?? "Не удалось изменить роль.",
        });
        return;
      }

      setFlash({
        type: "success",
        text:
          role === Role.MODERATOR
            ? "Пользователь назначен модератором."
            : "Пользователь переведён в активисты.",
      });
      refreshBoard();
    } finally {
      setRolePendingId(null);
    }
  }

  const spotlight = board.spotlight ?? board.events[0] ?? null;
  const selectedDateLabel = format(new Date(selectedDateKey), "d MMMM", { locale: ru });
  const visibleList = filteredEventDesk.slice(0, 8);

  return (
    <div className="min-h-screen text-white">
      <div className="mx-auto max-w-[1720px] px-3 py-3 lg:px-4">
        <div className="flex gap-4">
          <aside className="panel-surface sticky top-3 hidden h-[calc(100vh-1.5rem)] w-[248px] shrink-0 flex-col rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,40,0.95),rgba(8,15,28,0.96))] p-4 shadow-[0_30px_90px_rgba(0,0,0,0.28)] lg:flex">
            <div className="rounded-[1.8rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="relative h-20 overflow-hidden rounded-[1.4rem] bg-[linear-gradient(135deg,#173b91,#e21c2a)]">
                <Image
                  src="/branding/mger-logo.png"
                  alt="Молодая гвардия"
                  fill
                  className="object-contain p-4"
                  sizes="220px"
                  priority
                />
              </div>
            </div>

            <nav className="mt-4 flex-1 space-y-1.5">
              {navigationItems.map((item) => (
                <SidebarNavButton
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  active={item.active}
                  badge={item.badge}
                />
              ))}
            </nav>

            <div className="rounded-[1.7rem] border border-white/8 bg-white/[0.03] p-4">
              <div className="flex items-center gap-3">
                <div className="relative h-11 w-11 overflow-hidden rounded-full border border-white/10 bg-[#122341]">
                  <Image
                    src={spotlight?.photos[0]?.url ?? "/photos/event-kazan.png"}
                    alt="Штаб"
                    fill
                    sizes="44px"
                    className="object-cover"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-white">
                    {currentUser?.name ?? "Гость штаба"}
                  </p>
                  <p className="truncate text-sm text-[#8ea2c8]">
                    {currentUser ? roleLabel[currentUser.role] : "Режим просмотра"}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <section className="panel-surface overflow-hidden rounded-[2.2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,21,39,0.94),rgba(8,15,28,0.95))] shadow-[0_32px_110px_rgba(0,0,0,0.28)]">
              <div className="relative min-h-[280px] overflow-hidden">
                <Image
                  src={spotlight?.photos[0]?.url ?? "/photos/event-kazan.png"}
                  alt={spotlight?.title ?? "Молодая гвардия"}
                  fill
                  priority
                  sizes="(max-width: 1400px) 100vw, 1200px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(95deg,rgba(10,22,45,0.95)_0%,rgba(19,44,104,0.86)_34%,rgba(22,47,115,0.62)_52%,rgba(234,35,52,0.74)_84%,rgba(10,19,33,0.28)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,16,0.18),rgba(4,8,16,0.52))]" />

                <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap gap-2 lg:hidden">
                      {navigationItems.slice(0, 4).map((item) => (
                        <span
                          key={item.label}
                          className={cn(
                            "rounded-full border px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em]",
                            item.active
                              ? "border-white/22 bg-white/14 text-white"
                              : "border-white/12 bg-black/12 text-white/74",
                          )}
                        >
                          {item.label}
                        </span>
                      ))}
                    </div>

                    <div className="ml-auto flex flex-wrap items-center gap-2">
                      {isModeratorView ? (
                        <button
                          type="button"
                          onClick={() => openCreateForDate(selectedDateKey)}
                          className="inline-flex items-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(234,35,52,0.35)] transition hover:bg-[#ff3245]"
                        >
                          <WandSparkles className="h-4 w-4" />
                          Создать мероприятие
                        </button>
                      ) : null}

                      <IconButton icon={Search} label="Поиск" />
                      <IconButton icon={Bell} label="Уведомления" />
                      <IconButton icon={Settings} label="Настройки" />

                      {currentUser ? (
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                        >
                          <LogOut className="h-4 w-4" />
                          Выйти
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("login");
                              setAuthOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                          >
                            <KeyRound className="h-4 w-4" />
                            Войти
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("register");
                              setAuthOpen(true);
                            }}
                            className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-black/18 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black/26"
                          >
                            <Users className="h-4 w-4" />
                            Регистрация
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_340px] xl:items-end">
                    <div className="max-w-3xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/72">
                        Молодая гвардия
                      </p>
                      <h1 className="mt-3 font-display text-[3rem] uppercase leading-[0.9] tracking-tight text-white sm:text-[4.2rem]">
                        Доска мероприятий
                      </h1>
                      <p className="mt-3 max-w-2xl text-base leading-7 text-white/84">
                        Плотный календарь штаба с фото, регистрацией, ролями модераторов и отметками посещения в одном рабочем окне.
                      </p>
                      <div className="mt-5 flex flex-wrap gap-2">
                        <HeroMetric label="События" value={board.summary.upcomingLabel} />
                        <HeroMetric label="Команда" value={board.summary.membersLabel} />
                        <HeroMetric label="Штаб" value={board.summary.moderationLabel} />
                        <HeroMetric label="Отклики" value={board.summary.responseLabel} />
                      </div>
                    </div>

                    <div className="rounded-[1.7rem] border border-white/14 bg-[rgba(8,14,26,0.44)] p-4 backdrop-blur-md">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/64">
                        Ближайший акцент
                      </p>
                      <h2 className="mt-3 line-clamp-2 font-display text-3xl uppercase leading-[0.92] tracking-tight text-white">
                        {spotlight?.title ?? "Ближайшее мероприятие"}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm leading-6 text-white/78">
                        {spotlight?.summary ?? "Откройте календарь и выберите событие для деталей, RSVP и модерации."}
                      </p>
                      <div className="mt-4 grid grid-cols-2 gap-2">
                        <SurfaceBadge label="Дата" value={spotlight ? format(new Date(spotlight.startAt), "d MMMM", { locale: ru }) : "Скоро"} />
                        <SurfaceBadge label="Локация" value={spotlight?.location ?? "Штаб"} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {flash ? (
              <div
                className={cn(
                  "flex items-center justify-between gap-3 rounded-[1.4rem] border px-4 py-3 text-sm font-medium shadow-[0_18px_50px_rgba(0,0,0,0.18)]",
                  flash.type === "success"
                    ? "border-emerald-400/20 bg-emerald-500/12 text-emerald-200"
                    : "border-rose-400/20 bg-rose-500/12 text-rose-200",
                )}
              >
                <span>{flash.text}</span>
                <button
                  type="button"
                  onClick={() => setFlash(null)}
                  className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/86"
                >
                  Закрыть
                </button>
              </div>
            ) : null}

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_420px]">
              <section className="panel-surface min-w-0 rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,40,0.96),rgba(8,16,31,0.96))] p-4 shadow-[0_28px_80px_rgba(0,0,0,0.26)] sm:p-5">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7f93bb]">
                        Оперативная панель
                      </p>
                      <h2 className="mt-2 font-display text-[2.25rem] uppercase tracking-tight text-white">
                        Доска мероприятий
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex rounded-full border border-white/8 bg-white/[0.03] p-1">
                        <ToolbarTab
                          label="Календарь"
                          active={contentView === "calendar"}
                          onClick={() => setContentView("calendar")}
                          icon={LayoutGrid}
                        />
                        <ToolbarTab
                          label="Список"
                          active={contentView === "list"}
                          onClick={() => setContentView("list")}
                          icon={List}
                        />
                      </div>

                      <label className="flex min-w-[230px] items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[#9db2d8]">
                        <Search className="h-4 w-4 shrink-0" />
                        <input
                          type="search"
                          value={eventQuery}
                          onChange={(event) => setEventQuery(event.target.value)}
                          className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#6d82aa]"
                          placeholder="Поиск по названию или месту"
                        />
                      </label>

                      <button
                        type="button"
                        onClick={() => {
                          const today = new Date(board.now);
                          setSelectedMonth(startOfMonth(today));
                          setSelectedDateKey(toDateKey(today));
                          setSelectedEventId(null);
                        }}
                        className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm font-semibold text-[#d2def7] transition hover:bg-white/[0.06]"
                      >
                        Сегодня
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <SurfaceBadge label="Выбранная дата" value={selectedDateLabel} />
                    <SurfaceBadge label="Событий в день" value={`${dateEvents.length}`} />
                    <SurfaceBadge label="Обновлено" value={format(new Date(board.now), "d MMM · HH:mm", { locale: ru })} />
                    {isModeratorView ? (
                      <button
                        type="button"
                        onClick={() => openCreateForDate(selectedDateKey)}
                        className="inline-flex items-center gap-2 rounded-full border border-[#4d6fd8]/26 bg-[#214aa8]/18 px-4 py-2.5 text-sm font-semibold text-[#d5e2ff] transition hover:bg-[#214aa8]/28"
                      >
                        <WandSparkles className="h-4 w-4" />
                        Новое мероприятие
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-4">
                  {contentView === "calendar" ? (
                    <CalendarBoard
                      selectedMonth={selectedMonth}
                      selectedDateKey={selectedDateKey}
                      events={board.events}
                      canManageEvents={isModeratorView}
                      onSelectDate={(date) => {
                        setSelectedMonth(startOfMonth(date));
                        setSelectedDateKey(toDateKey(date));
                      }}
                      onJumpToToday={() => {
                        const today = new Date(board.now);
                        setSelectedMonth(startOfMonth(today));
                        setSelectedDateKey(toDateKey(today));
                        setSelectedEventId(null);
                      }}
                      onPreviousMonth={() =>
                        setSelectedMonth(
                          (current) =>
                            startOfMonth(new Date(current.getFullYear(), current.getMonth() - 1, 1)),
                        )
                      }
                      onNextMonth={() =>
                        setSelectedMonth(
                          (current) =>
                            startOfMonth(new Date(current.getFullYear(), current.getMonth() + 1, 1)),
                        )
                      }
                    />
                  ) : (
                    <div className="space-y-3">
                      {visibleList.length ? (
                        visibleList.map((event) => (
                          <button
                            key={event.id}
                            type="button"
                            onClick={() => jumpToEvent(event)}
                            className="group flex w-full items-center gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-left transition hover:border-white/14 hover:bg-white/[0.05]"
                          >
                            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-[1.1rem] border border-white/8 bg-[#101e36]">
                              <Image
                                src={event.photos[0]?.url ?? "/photos/event-kazan.png"}
                                alt={event.title}
                                fill
                                sizes="80px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#93a7cf]">
                                {format(new Date(event.startAt), "d MMMM · HH:mm", { locale: ru })}
                              </p>
                              <h3 className="mt-2 line-clamp-1 text-lg font-semibold text-white">
                                {event.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#91a5cb]">
                                {event.summary}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-[#7c91b8]">
                                <span>{event.category}</span>
                                <span>•</span>
                                <span>{event.location}</span>
                              </div>
                            </div>
                            <ArrowRight className="h-5 w-5 shrink-0 text-[#7388b0] transition group-hover:translate-x-1 group-hover:text-white" />
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[1.6rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-[#92a5ca]">
                          По вашему запросу события не найдены.
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="mt-4 rounded-[1.7rem] border border-white/8 bg-[linear-gradient(90deg,rgba(29,56,122,0.36),rgba(17,29,52,0.16),rgba(234,35,52,0.12))] p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="max-w-xl">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8ca1cb]">
                        Промо блока штаба
                      </p>
                      <h3 className="mt-2 text-xl font-semibold text-white">
                        Продвигайте выезды и собирайте команду в одном календаре
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-[#9bb0d5]">
                        В карточке события уже есть фотографии, RSVP и модерация, поэтому активист видит полную картину без переходов по разным разделам.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const target = spotlight ?? board.events[0];
                        if (target) {
                          jumpToEvent(target);
                        }
                      }}
                      className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.1]"
                    >
                      Открыть событие
                    </button>
                  </div>
                </div>
              </section>

              <div className="xl:sticky xl:top-3">
                <EventDetailPanel
                  selectedDateKey={selectedDateKey}
                  selectedEventId={resolvedSelectedEventId}
                  events={dateEvents}
                  currentUser={currentUser}
                  canManageEvents={isModeratorView}
                  rsvpPendingId={rsvpPendingId}
                  onSelectEvent={setSelectedEventId}
                  onOpenCreate={openCreateForDate}
                  onOpenEdit={openEditEvent}
                  onRequireAuth={() => {
                    setAuthMode("login");
                    setAuthOpen(true);
                  }}
                  onSetResponse={handleRsvp}
                />
              </div>
            </div>

            {isModeratorView ? (
              <section className="panel-surface rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,40,0.96),rgba(8,16,31,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.26)]">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7f93bb]">
                      Модерация
                    </p>
                    <h2 className="mt-2 font-display text-[2rem] uppercase tracking-tight text-white">
                      Штабная панель событий
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#93a7cb]">
                      Здесь удобно быстро открыть карточку мероприятия, посмотреть отклики и перейти в редактирование без растянутых блоков и лишнего шума.
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <label className="flex min-w-[230px] items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[#9db2d8]">
                      <Search className="h-4 w-4 shrink-0" />
                      <input
                        type="search"
                        value={eventQuery}
                        onChange={(event) => setEventQuery(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#6d82aa]"
                        placeholder="Поиск по названию или месту"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => openCreateForDate(selectedDateKey)}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3245]"
                    >
                      <WandSparkles className="h-4 w-4" />
                      Новое мероприятие
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-3 xl:grid-cols-2">
                  {filteredEventDesk.map((event) => (
                    <div
                      key={event.id}
                      className="rounded-[1.6rem] border border-white/8 bg-white/[0.03] p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#8fa4cd]">
                            {event.category}
                          </p>
                          <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">
                            {event.title}
                          </h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => openEditEvent(event)}
                          className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cbd9f5] transition hover:bg-white/[0.08]"
                        >
                          Открыть
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 sm:grid-cols-3">
                        <SurfaceBadge label="Дата" value={format(new Date(event.startAt), "d MMM", { locale: ru })} />
                        <SurfaceBadge label="Придут" value={`${event.attendeeStats.going}`} />
                        <SurfaceBadge label="Не смогут" value={`${event.attendeeStats.declined}`} />
                      </div>

                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-[#91a5cb]">
                        {event.location}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}

            {isOwnerView ? (
              <section className="panel-surface rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(12,22,40,0.96),rgba(8,16,31,0.96))] p-5 shadow-[0_28px_80px_rgba(0,0,0,0.26)]">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7f93bb]">
                      Доступы
                    </p>
                    <h2 className="mt-2 font-display text-[2rem] uppercase tracking-tight text-white">
                      Назначение модераторов
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#93a7cb]">
                      Владелец выдаёт права модератора и возвращает участников в обычный режим просмотра прямо из одной таблицы.
                    </p>
                  </div>

                  <label className="flex min-w-[250px] items-center gap-2 rounded-full border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[#9db2d8]">
                    <Search className="h-4 w-4 shrink-0" />
                    <input
                      type="search"
                      value={memberQuery}
                      onChange={(event) => setMemberQuery(event.target.value)}
                      className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#6d82aa]"
                      placeholder="Поиск по имени или email"
                    />
                  </label>
                </div>

                <div className="mt-4 space-y-3">
                  {filteredMembers.map((member) => {
                    const isOwner = member.role === Role.OWNER;
                    const nextRole =
                      member.role === Role.MODERATOR ? Role.ACTIVIST : Role.MODERATOR;

                    return (
                      <div
                        key={member.id}
                        className="flex flex-col gap-4 rounded-[1.5rem] border border-white/8 bg-white/[0.03] px-4 py-4 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-lg font-semibold text-white">{member.name}</p>
                            <span
                              className={cn(
                                "rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em]",
                                member.role === Role.OWNER
                                  ? "bg-[#214aa8]/24 text-[#cedcff]"
                                  : member.role === Role.MODERATOR
                                    ? "bg-amber-500/16 text-amber-200"
                                    : "bg-white/[0.06] text-[#b6c9ef]",
                              )}
                            >
                              {roleLabel[member.role]}
                            </span>
                          </div>
                          <p className="mt-2 truncate text-sm text-[#91a5cb]">{member.email}</p>
                          <p className="mt-1 text-sm text-[#7f93bb]">
                            {formatRussianPlural(member.responsesCount, [
                              "отметка",
                              "отметки",
                              "отметок",
                            ])}
                            {" · "}
                            {formatRussianPlural(member.createdEventsCount, [
                              "созданное событие",
                              "созданных события",
                              "созданных событий",
                            ])}
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {isOwner ? (
                            <span className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b7c9ef]">
                              Фиксированная роль
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleRoleChange(member.id, nextRole)}
                              disabled={rolePendingId === member.id}
                              className="inline-flex items-center gap-2 rounded-full bg-[#214aa8] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d58bf] disabled:cursor-wait disabled:opacity-70"
                            >
                              <ShieldCheck className="h-4 w-4" />
                              {nextRole === Role.MODERATOR
                                ? "Сделать модератором"
                                : "Вернуть в активисты"}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {authOpen ? (
              <AuthDialog
                open={authOpen}
                mode={authMode}
                onClose={() => setAuthOpen(false)}
                onModeChange={setAuthMode}
                onSuccess={(message) => {
                  setAuthOpen(false);
                  handleBoardSuccess(message);
                }}
              />
            ) : null}

            {editorState.open ? (
              <EventEditorDialog
                key={`${editorState.mode}-${editorState.event?.id ?? editorState.dateKey}`}
                state={editorState}
                open={editorState.open}
                onClose={() =>
                  setEditorState((current) => ({
                    ...current,
                    open: false,
                  }))
                }
                onSaved={(message) => {
                  setEditorState((current) => ({ ...current, open: false }));
                  handleBoardSuccess(message);
                }}
                onDeleted={(message) => {
                  setEditorState((current) => ({ ...current, open: false }));
                  setFlash({ type: "success", text: message });
                  refreshBoard();
                }}
              />
            ) : null}

            {isRefreshing ? (
              <div className="pointer-events-none fixed bottom-6 right-6 rounded-full border border-white/10 bg-[#081321]/96 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                Обновляем данные…
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarNavButton({
  icon: Icon,
  label,
  active,
  badge,
}: {
  icon: typeof LayoutGrid;
  label: string;
  active?: boolean;
  badge?: string;
}) {
  return (
    <button
      type="button"
      className={cn(
        "flex w-full items-center justify-between rounded-[1.2rem] px-3 py-3 text-left transition",
        active
          ? "bg-[#173b91]/20 text-white shadow-[inset_0_0_0_1px_rgba(80,124,255,0.26)]"
          : "text-[#8ea2c8] hover:bg-white/[0.04] hover:text-white",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-5 w-5" />
        <span className="text-sm font-medium">{label}</span>
      </span>
      {badge ? (
        <span className="rounded-full bg-[var(--mger-red)] px-2 py-0.5 text-[11px] font-semibold text-white">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function IconButton({
  icon: Icon,
  label,
}: {
  icon: typeof Search;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-white/14 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-white/14 bg-white/[0.08] px-4 py-2 text-sm text-white/90 backdrop-blur-md">
      <span className="mr-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/64">
        {label}
      </span>
      <span className="font-semibold text-white">{value}</span>
    </div>
  );
}

function SurfaceBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7f94bc]">
        {label}
      </p>
      <p className="mt-1 line-clamp-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function ToolbarTab({
  label,
  active,
  onClick,
  icon: Icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon: typeof LayoutGrid;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
        active
          ? "bg-white text-[#15306f]"
          : "text-[#a9bcdf] hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      {label}
    </button>
  );
}

function AuthDialog({
  open,
  mode,
  onClose,
  onModeChange,
  onSuccess,
}: {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload =
      mode === "register"
        ? {
            name: `${formData.get("name") ?? ""}`.trim(),
            email: `${formData.get("email") ?? ""}`.trim(),
            password: `${formData.get("password") ?? ""}`,
          }
        : {
            email: `${formData.get("email") ?? ""}`.trim(),
            password: `${formData.get("password") ?? ""}`,
          };

    const response = await fetch(`/api/auth/${mode === "register" ? "register" : "login"}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Не удалось выполнить действие.");
      setPending(false);
      return;
    }

    setPending(false);
    onSuccess(mode === "register" ? "Аккаунт создан и пользователь вошёл в систему." : "Вход выполнен.");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "register" ? "Регистрация активиста" : "Вход в штаб"}
      description="После входа можно отмечать участие, а модератор получает доступ к созданию и редактированию мероприятий."
      size="sm"
    >
      <div className="flex gap-2 rounded-full border border-white/8 bg-white/[0.03] p-1">
        {(["register", "login"] as const).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => {
              setPending(false);
              setError(null);
              onModeChange(item);
            }}
            className={cn(
              "flex-1 rounded-full px-4 py-3 text-sm font-semibold transition",
              item === mode
                ? "bg-white text-[#183470]"
                : "text-[#95a9cf] hover:text-white",
            )}
          >
            {item === "register" ? "Регистрация" : "Вход"}
          </button>
        ))}
      </div>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        {mode === "register" ? (
          <div>
            <label htmlFor="auth-name" className={labelClass}>
              Имя и фамилия
            </label>
            <input
              id="auth-name"
              name="name"
              className={inputClass}
              autoComplete="name"
              placeholder="Например, Алексей Волков"
            />
          </div>
        ) : null}

        <div>
          <label htmlFor="auth-email" className={labelClass}>
            Email
          </label>
          <input
            id="auth-email"
            name="email"
            type="email"
            className={inputClass}
            autoComplete={mode === "register" ? "email" : "username"}
            placeholder="name@example.ru"
          />
        </div>

        <div>
          <label htmlFor="auth-password" className={labelClass}>
            Пароль
          </label>
          <input
            id="auth-password"
            name="password"
            type="password"
            className={inputClass}
            autoComplete={mode === "register" ? "new-password" : "current-password"}
            placeholder="Минимум 8 символов"
          />
        </div>

        {error ? (
          <div className="rounded-[1.2rem] border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-full bg-[var(--mger-red)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#ff3245] disabled:cursor-wait disabled:opacity-70"
        >
          {pending
            ? "Подождите…"
            : mode === "register"
              ? "Создать аккаунт"
              : "Войти в систему"}
        </button>

        <div className="rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[#93a7cb]">
          Владелец отдельно назначает модераторов. После обычной регистрации пользователь входит как активист и может отмечать участие в календаре.
        </div>
      </form>
    </Modal>
  );
}

function EventEditorDialog({
  open,
  state,
  onClose,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  state: EventEditorState;
  onClose: () => void;
  onSaved: (message: string) => void;
  onDeleted: (message: string) => void;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [formState, setFormState] = useState(() => getInitialEditorState(state.dateKey, state.event));

  async function uploadPhotos(files: File[]) {
    if (!files.length) {
      return [];
    }

    const uploadForm = new FormData();

    for (const file of files) {
      uploadForm.append("files", file);
    }

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: uploadForm,
    });

    const payload = (await response.json()) as { urls?: string[]; error?: string };

    if (!response.ok || !payload.urls) {
      throw new Error(payload.error ?? "Не удалось загрузить фотографии.");
    }

    return payload.urls;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    try {
      const uploadedUrls = await uploadPhotos(newFiles);

      const payload = {
        title: formState.title,
        summary: formState.summary,
        description: formState.description,
        location: formState.location,
        category: formState.category,
        organizerName: formState.organizerName,
        startAt: new Date(`${formState.date}T${formState.startTime}:00`).toISOString(),
        endAt: new Date(`${formState.date}T${formState.endTime}:00`).toISOString(),
        capacity: formState.capacity,
        photoUrls: [...formState.photoUrls, ...uploadedUrls],
      };

      const response = await fetch(
        state.mode === "create" ? "/api/events" : `/api/events/${state.event?.id}`,
        {
          method: state.mode === "create" ? "POST" : "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Не удалось сохранить мероприятие.");
      }

      setPending(false);
      onSaved(
        state.mode === "create"
          ? "Мероприятие добавлено в календарь."
          : "Мероприятие обновлено.",
      );
    } catch (submissionError) {
      setPending(false);
      setError(
        submissionError instanceof Error
          ? submissionError.message
          : "Не удалось сохранить мероприятие.",
      );
    }
  }

  async function handleDelete() {
    if (!state.event) {
      return;
    }

    const confirmed = window.confirm("Удалить мероприятие из календаря?");

    if (!confirmed) {
      return;
    }

    setPending(true);
    setError(null);

    const response = await fetch(`/api/events/${state.event.id}`, {
      method: "DELETE",
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setPending(false);
      setError(data.error ?? "Не удалось удалить мероприятие.");
      return;
    }

    setPending(false);
    onDeleted("Мероприятие удалено.");
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={state.mode === "create" ? "Новое мероприятие" : "Редактирование мероприятия"}
      description="Заполните дату, время, описание и фотографии. После сохранения событие сразу появится в календаре и станет доступно активистам."
    >
      <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
        <div className="lg:col-span-2">
          <label htmlFor="event-title" className={labelClass}>
            Название
          </label>
          <input
            id="event-title"
            className={inputClass}
            value={formState.title}
            onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
            placeholder="Например, Гуманитарный штаб выходного дня"
          />
        </div>

        <div>
          <label htmlFor="event-category" className={labelClass}>
            Категория
          </label>
          <input
            id="event-category"
            className={inputClass}
            value={formState.category}
            onChange={(event) =>
              setFormState((current) => ({ ...current, category: event.target.value }))
            }
            placeholder="Патриотическая акция"
          />
        </div>

        <div>
          <label htmlFor="event-location" className={labelClass}>
            Место
          </label>
          <input
            id="event-location"
            className={inputClass}
            value={formState.location}
            onChange={(event) =>
              setFormState((current) => ({ ...current, location: event.target.value }))
            }
            placeholder="Москва, городской штаб"
          />
        </div>

        <div>
          <label htmlFor="event-organizer" className={labelClass}>
            Организатор
          </label>
          <input
            id="event-organizer"
            className={inputClass}
            value={formState.organizerName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, organizerName: event.target.value }))
            }
            placeholder="Федеральный штаб"
          />
        </div>

        <div>
          <label htmlFor="event-capacity" className={labelClass}>
            Лимит мест
          </label>
          <input
            id="event-capacity"
            className={inputClass}
            inputMode="numeric"
            value={formState.capacity}
            onChange={(event) =>
              setFormState((current) => ({ ...current, capacity: event.target.value }))
            }
            placeholder="Например, 40"
          />
        </div>

        <div>
          <label htmlFor="event-date" className={labelClass}>
            Дата
          </label>
          <input
            id="event-date"
            type="date"
            className={inputClass}
            value={formState.date}
            onChange={(event) => setFormState((current) => ({ ...current, date: event.target.value }))}
          />
        </div>

        <div>
          <label htmlFor="event-start" className={labelClass}>
            Начало
          </label>
          <input
            id="event-start"
            type="time"
            className={inputClass}
            value={formState.startTime}
            onChange={(event) =>
              setFormState((current) => ({ ...current, startTime: event.target.value }))
            }
          />
        </div>

        <div>
          <label htmlFor="event-end" className={labelClass}>
            Окончание
          </label>
          <input
            id="event-end"
            type="time"
            className={inputClass}
            value={formState.endTime}
            onChange={(event) =>
              setFormState((current) => ({ ...current, endTime: event.target.value }))
            }
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="event-summary" className={labelClass}>
            Краткое описание
          </label>
          <textarea
            id="event-summary"
            className={`${inputClass} min-h-[96px] resize-y`}
            value={formState.summary}
            onChange={(event) => setFormState((current) => ({ ...current, summary: event.target.value }))}
            placeholder="Короткая подводка, которая видна в карточке события."
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="event-description" className={labelClass}>
            Полное описание
          </label>
          <textarea
            id="event-description"
            className={textAreaClass}
            value={formState.description}
            onChange={(event) =>
              setFormState((current) => ({ ...current, description: event.target.value }))
            }
            placeholder="Что будет происходить, что взять с собой и кого ждёте в команду."
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="event-files" className={labelClass}>
            Новые фотографии
          </label>
          <input
            id="event-files"
            type="file"
            multiple
            accept="image/*"
            className={inputClass}
            onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))}
          />
          <p className="mt-2 text-sm text-[#92a5ca]">
            Поддерживаются обычные изображения. После загрузки фотографии прикрепятся к событию автоматически.
          </p>
        </div>

        <div className="lg:col-span-2">
          <p className={labelClass}>Текущие фотографии</p>
          {formState.photoUrls.length ? (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {formState.photoUrls.map((url) => (
                <div
                  key={url}
                  className="overflow-hidden rounded-[1.2rem] border border-white/8 bg-white/[0.03]"
                >
                  <div className="relative aspect-[1.18/0.86]">
                    <Image
                      src={url}
                      alt="Фото события"
                      fill
                      sizes="280px"
                      className="object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3 border-t border-white/8 px-3 py-3">
                    <span className="line-clamp-1 text-sm text-[#c9d7f3]">{url.split("/").pop()}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormState((current) => ({
                          ...current,
                          photoUrls: current.photoUrls.filter((item) => item !== url),
                        }))
                      }
                      className="rounded-full border border-rose-400/20 bg-rose-500/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-rose-200"
                    >
                      Убрать
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-[1.3rem] border border-dashed border-white/10 bg-white/[0.03] px-4 py-5 text-sm text-[#93a7cb]">
              Пока без фото.
            </div>
          )}

          {newFiles.length ? (
            <p className="mt-3 text-sm text-[#93a7cb]">
              Будут загружены: {newFiles.map((file) => file.name).join(", ")}
            </p>
          ) : null}
        </div>

        {error ? (
          <div className="lg:col-span-2 rounded-[1.2rem] border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-5">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            >
              Отмена
            </button>
            {state.mode === "edit" ? (
              <button
                type="button"
                onClick={handleDelete}
                className="rounded-full border border-rose-400/20 bg-rose-500/12 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/18"
              >
                Удалить
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#214aa8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d58bf] disabled:cursor-wait disabled:opacity-70"
          >
            {pending ? "Сохраняем…" : state.mode === "create" ? "Создать событие" : "Сохранить изменения"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

const roleLabel = {
  [Role.OWNER]: "Владелец",
  [Role.MODERATOR]: "Модератор",
  [Role.ACTIVIST]: "Активист",
} as const;
