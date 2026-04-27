"use client";

import { CalendarBoard } from "@/components/home/calendar-board";
import { EventDetailPanel } from "@/components/home/event-detail-panel";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import {
  formInputClass as inputClass,
  formLabelClass as labelClass,
  formTextAreaClass as textAreaClass,
} from "@/components/shared/form-styles";
import { InlineLoader } from "@/components/shared/inline-loader";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Modal } from "@/components/ui/modal";
import type { SessionUser } from "@/lib/auth/session";
import type { BoardEvent, BoardPayload } from "@/lib/dashboard";
import { RSVP_STATUS, type AppRsvpStatus } from "@/lib/domain-constants";
import { roleLabel } from "@/lib/domain-labels";
import { canManageEvents } from "@/lib/permissions";
import { cn, toDateKey } from "@/lib/utils";
import { format, startOfMonth } from "date-fns";
import { ru } from "date-fns/locale";
import {
  ArrowRight,
  CalendarRange,
  ImageIcon,
  KeyRound,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  Newspaper,
  Search,
  UserRoundPen,
  UsersRound,
  WandSparkles,
  X,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useDeferredValue,
  useEffect,
  useRef,
  useState,
  useTransition,
  type FormEvent,
} from "react";

type ContentView = "calendar" | "list";
type ActiveNavigation = "top" | "calendar";
type NavigationAction = ActiveNavigation | "members" | "inactive";

type FlashState =
  | {
      type: "success" | "error" | "info";
      text: string;
    }
  | null;

type EventEditorState = {
  open: boolean;
  mode: "create" | "edit";
  event: BoardEvent | null;
  dateKey: string;
};

const NAVIGATION_SYNC_LOCK_MS = 900;

const navigationItems: Array<{
  icon: typeof LayoutGrid;
  label: string;
  action: NavigationAction;
}> = [
  { icon: LayoutGrid, label: "Доска мероприятий", action: "top" },
  { icon: CalendarRange, label: "Календарь", action: "calendar" },
  { icon: UsersRound, label: "Участники", action: "members" },
  { icon: Newspaper, label: "Новости", action: "inactive" },
  { icon: ImageIcon, label: "Галерея", action: "inactive" },
];

function resolveActiveNavigation(calendarElement: HTMLElement | null): ActiveNavigation {
  const calendarTop = calendarElement?.getBoundingClientRect().top;
  return calendarTop !== undefined && calendarTop <= 160 ? "calendar" : "top";
}

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

function normalizeCapacityInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 3);

  if (!digits) {
    return "";
  }

  return Number(digits) > 500 ? "500" : digits;
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
  const [flash, setFlash] = useState<FlashState>(null);
  const [activeNavigation, setActiveNavigation] = useState<ActiveNavigation>("top");
  const [rsvpPendingId, setRsvpPendingId] = useState<string | null>(null);
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [eventQuery, setEventQuery] = useState("");
  const [editorState, setEditorState] = useState<EventEditorState>({
    open: false,
    mode: "create",
    event: null,
    dateKey: getDefaultDateKey(board),
  });
  const [isRefreshing, startRefresh] = useTransition();
  const [isLoggingOut, startLogoutTransition] = useTransition();
  const heroRef = useRef<HTMLElement | null>(null);
  const calendarRef = useRef<HTMLElement | null>(null);
  const detailPanelRef = useRef<HTMLDivElement | null>(null);
  const shouldScrollToDetailsRef = useRef(false);
  const navigationScrollLockedRef = useRef(false);
  const navigationScrollFrameRef = useRef<number | null>(null);
  const navigationUnlockTimerRef = useRef<number | null>(null);

  const deferredEventQuery = useDeferredValue(eventQuery);
  const dateEvents = getEventsForDate(board.events, selectedDateKey);
  const resolvedSelectedEventId = dateEvents.some((event) => event.id === selectedEventId)
    ? selectedEventId
    : dateEvents[0]?.id ?? null;
  const isModeratorView = canManageEvents(currentUser?.role);
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

  function refreshBoard() {
    startRefresh(() => {
      router.refresh();
    });
  }

  function showFlash(type: NonNullable<FlashState>["type"], text: string) {
    setFlash({ type, text });
  }

  function goToLogin() {
    if (typeof window === "undefined") {
      router.push("/login");
      return;
    }

    const returnTo = `${window.location.pathname}${window.location.search}`;
    router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }

  function scrollToSection(target: HTMLElement | null) {
    target?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  function lockNavigationScrollSync() {
    if (typeof window === "undefined") {
      return;
    }

    navigationScrollLockedRef.current = true;

    if (navigationUnlockTimerRef.current !== null) {
      window.clearTimeout(navigationUnlockTimerRef.current);
    }

    navigationUnlockTimerRef.current = window.setTimeout(() => {
      navigationScrollLockedRef.current = false;
      navigationUnlockTimerRef.current = null;
      setActiveNavigation(resolveActiveNavigation(calendarRef.current));
    }, NAVIGATION_SYNC_LOCK_MS);
  }

  function handleNavigation(action: NavigationAction) {
    if (action === "inactive") {
      return;
    }

    if (action === "members") {
      goToMembers();
      return;
    }

    lockNavigationScrollSync();
    setActiveNavigation(action);

    if (action === "top") {
      scrollToSection(heroRef.current);
      return;
    }

    if (action === "calendar") {
      if (contentView !== "calendar") {
        setContentView("calendar");
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          scrollToSection(calendarRef.current);
        });
      });
      return;
    }
  }

  function scrollDetailsIntoView() {
    if (typeof window === "undefined") {
      return;
    }

    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        detailPanelRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    });
  }

  function openCreateForDate(dateKey: string) {
    const nextDate = new Date(`${dateKey}T12:00:00`);
    setSelectedMonth(startOfMonth(nextDate));
    setSelectedDateKey(dateKey);
    setSelectedEventId(null);
    setEditorState({
      open: true,
      mode: "create",
      event: null,
      dateKey,
    });
  }

  function openEditEvent(event: BoardEvent) {
    setSelectedDateKey(event.dateKey);
    setSelectedMonth(startOfMonth(new Date(event.startAt)));
    setSelectedEventId(event.id);
    setEditorState({
      open: true,
      mode: "edit",
      event,
      dateKey: event.dateKey,
    });
  }

  function handleBoardSuccess(message: string) {
    showFlash("success", message);
    refreshBoard();
  }

  function goToProfile() {
    if (!currentUser) {
      goToLogin();
      return;
    }

    router.push("/profile");
  }

  function goToMembers() {
    if (!currentUser) {
      router.push("/login?returnTo=%2Fmembers");
      return;
    }

    router.push("/members");
  }

  function jumpToEvent(event: BoardEvent) {
    if (event.dateKey === selectedDateKey && event.id === selectedEventId) {
      scrollDetailsIntoView();
      return;
    }

    shouldScrollToDetailsRef.current = true;
    setSelectedDateKey(event.dateKey);
    setSelectedMonth(startOfMonth(new Date(event.startAt)));
    setSelectedEventId(event.id);
  }

  function handleSelectCalendarDate(date: Date) {
    const dateKey = toDateKey(date);
    const eventsForDate = getEventsForDate(board.events, dateKey);
    const nextSelectedEventId = eventsForDate[0]?.id ?? null;

    if (dateKey === selectedDateKey && nextSelectedEventId === resolvedSelectedEventId) {
      scrollDetailsIntoView();
      return;
    }

    setSelectedMonth(startOfMonth(date));
    setSelectedDateKey(dateKey);
    setSelectedEventId(nextSelectedEventId);

    shouldScrollToDetailsRef.current = true;
  }

  function requestLogout() {
    setLogoutConfirmOpen(true);
  }

  function openMobileMenu() {
    setMobileMenuOpen(true);
  }

  function closeMobileMenu() {
    setMobileMenuOpen(false);
  }

  function handleLogout() {
    startLogoutTransition(async () => {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        showFlash("error", "Не удалось завершить сессию.");
        return;
      }

      setLogoutConfirmOpen(false);
      showFlash("success", "Сессия завершена.");
      refreshBoard();
    });
  }

  async function handleRsvp(eventId: string, status: AppRsvpStatus) {
    if (!currentUser) {
      goToLogin();
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
        showFlash("error", payload.error ?? "Не удалось обновить участие.");
        return;
      }

      showFlash(
        "success",
        status === RSVP_STATUS.GOING
          ? "Отметка «Я приду» сохранена."
          : "Отметка «Не смогу» сохранена.",
      );
      refreshBoard();
    } finally {
      setRsvpPendingId(null);
    }
  }

  const spotlight = board.spotlight ?? board.events[0] ?? null;
  const selectedDateLabel = format(new Date(selectedDateKey), "d MMMM", { locale: ru });
  const visibleList = filteredEventDesk.slice(0, 8);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    document.documentElement.removeAttribute("data-theme");
    window.localStorage.removeItem("mger-theme");
  }, []);

  useEffect(() => {
    function updateActiveNavigationFromScroll() {
      if (navigationScrollLockedRef.current) {
        return;
      }

      setActiveNavigation(resolveActiveNavigation(calendarRef.current));
    }

    function queueActiveNavigationUpdate() {
      if (navigationScrollLockedRef.current || navigationScrollFrameRef.current !== null) {
        return;
      }

      navigationScrollFrameRef.current = window.requestAnimationFrame(() => {
        navigationScrollFrameRef.current = null;
        updateActiveNavigationFromScroll();
      });
    }

    updateActiveNavigationFromScroll();
    window.addEventListener("scroll", queueActiveNavigationUpdate, { passive: true });
    window.addEventListener("resize", queueActiveNavigationUpdate);

    return () => {
      window.removeEventListener("scroll", queueActiveNavigationUpdate);
      window.removeEventListener("resize", queueActiveNavigationUpdate);

      if (navigationScrollFrameRef.current !== null) {
        window.cancelAnimationFrame(navigationScrollFrameRef.current);
        navigationScrollFrameRef.current = null;
      }

      if (navigationUnlockTimerRef.current !== null) {
        window.clearTimeout(navigationUnlockTimerRef.current);
        navigationUnlockTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!shouldScrollToDetailsRef.current) {
      return;
    }

    shouldScrollToDetailsRef.current = false;
    scrollDetailsIntoView();
  }, [selectedDateKey, selectedEventId]);

  useEffect(() => {
    if (!flash) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setFlash(null);
    }, 2800);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [flash]);

  return (
    <div className="min-h-screen overflow-x-clip text-white">
      <div className="mx-auto max-w-[1680px] px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex gap-4">
          <aside
            data-tone="adaptive"
            className="panel-surface surface-panel sticky top-3 hidden h-[calc(100svh-1.5rem)] w-[236px] shrink-0 flex-col overflow-hidden rounded-[1.9rem] px-3.5 py-4 lg:flex"
          >
            <div className="shrink-0 border-b border-white/8 pb-4">
              <BrandLockup priority />
              <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8ca1cb]">
                Штабная доска
              </p>
            </div>

            <nav className="mt-3 min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
              {navigationItems.map((item) => (
                <SidebarNavButton
                  key={item.label}
                  icon={item.icon}
                  label={item.label}
                  onClick={() => handleNavigation(item.action)}
                  active={item.action === activeNavigation}
                  disabled={item.action === "inactive"}
                />
              ))}
            </nav>

            <button
              type="button"
              onClick={goToProfile}
              className="mt-3 shrink-0 flex items-center gap-3 rounded-[1.2rem] border-t border-white/8 pt-3 text-left transition hover:bg-white/[0.03]"
            >
              <UserAvatar
                avatarUrl={currentUser?.avatarUrl}
                name={currentUser?.name ?? "Гость штаба"}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {currentUser?.name ?? "Гость штаба"}
                </p>
                <p className="truncate text-sm text-[#8ea2c8]">
                  {currentUser ? roleLabel[currentUser.role] : "Нажмите, чтобы войти"}
                </p>
              </div>
            </button>
          </aside>

          <div className="min-w-0 flex-1 space-y-4">
            <section
              ref={heroRef}
              className="panel-surface surface-panel overflow-hidden rounded-[2rem]"
              data-tone="dark"
            >
              <div className="relative min-h-[340px] overflow-hidden">
                <Image
                  src={spotlight?.photos[0]?.url ?? "/photos/event-kazan.png"}
                  alt={spotlight?.title ?? "Молодая гвардия"}
                  fill
                  priority
                  loading="eager"
                  sizes="(max-width: 1400px) 100vw, 1200px"
                  className="object-cover object-center"
                />
                <div className="absolute inset-0 bg-[linear-gradient(98deg,rgba(9,20,42,0.94)_0%,rgba(20,44,100,0.84)_36%,rgba(18,40,96,0.56)_54%,rgba(148,29,43,0.68)_82%,rgba(7,14,26,0.5)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(4,8,16,0.18),rgba(4,8,16,0.62))]" />

                <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-5 lg:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 lg:hidden">
                        <BrandLockup variant="hero" priority />
                      </div>

                      <div className="ml-auto hidden flex-wrap items-center gap-2 sm:justify-end lg:flex">
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

                        {currentUser ? (
                          <>
                            <button
                              type="button"
                              onClick={goToProfile}
                              className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.14] lg:inline-flex"
                            >
                              <UserRoundPen className="h-4 w-4" />
                              Профиль
                            </button>
                            <button
                              type="button"
                              onClick={requestLogout}
                              aria-busy={isLoggingOut}
                              disabled={isLoggingOut}
                              className="font-display inline-flex items-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-bold tracking-[0.01em] text-white shadow-[0_14px_36px_rgba(234,35,52,0.28)] transition hover:bg-[#ff3245] disabled:cursor-wait disabled:opacity-70"
                            >
                              {isLoggingOut ? (
                                <InlineLoader label="Выходим" />
                              ) : (
                                <>
                                  <LogOut className="h-4 w-4" />
                                  Выйти
                                </>
                              )}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={goToLogin}
                            className="font-display inline-flex items-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-bold tracking-[0.01em] text-white shadow-[0_14px_36px_rgba(234,35,52,0.28)] transition hover:bg-[#ff3245]"
                          >
                            <KeyRound className="h-4 w-4" />
                            Войти
                          </button>
                        )}
                      </div>

                      <div className="ml-auto flex items-center gap-2 lg:hidden">
                        <button
                          type="button"
                          onClick={openMobileMenu}
                          aria-label="Открыть меню"
                          aria-expanded={mobileMenuOpen}
                          className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/14 bg-white/[0.08] text-white transition hover:bg-white/[0.14]"
                        >
                          <Menu className="h-5 w-5" />
                        </button>
                        {currentUser ? (
                          <button
                            type="button"
                            onClick={goToProfile}
                            aria-label="Открыть профиль"
                            className="rounded-full"
                          >
                            <UserAvatar
                              avatarUrl={currentUser.avatarUrl}
                              name={currentUser.name}
                              size="sm"
                              className="h-11 w-11 border-white/18"
                            />
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={goToLogin}
                            aria-label="Войти"
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[var(--mger-red)] text-white shadow-[0_14px_36px_rgba(234,35,52,0.28)] transition hover:bg-[#ff3245]"
                          >
                            <KeyRound className="h-5 w-5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {isModeratorView ? (
                      <button
                        type="button"
                        onClick={() => openCreateForDate(selectedDateKey)}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-3 text-sm font-semibold text-white shadow-[0_14px_36px_rgba(234,35,52,0.28)] transition hover:bg-[#ff3245] lg:hidden"
                      >
                        <WandSparkles className="h-4 w-4" />
                        Создать мероприятие
                      </button>
                    ) : null}

                    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_320px] xl:items-end">
                      <div className="max-w-3xl">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/72">
                          Молодая гвардия
                        </p>
                        <h1 className="mt-3 font-display text-[clamp(2.3rem,13vw,3rem)] uppercase leading-[0.9] tracking-tight text-white sm:text-[4rem]">
                          Доска мероприятий
                        </h1>
                        <p className="mt-3 max-w-2xl text-base leading-7 text-white/84">
                          Календарь штаба, роли модераторов и фотоотчёты в одном чистом рабочем окне без лишнего шума.
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-3">
                          <HeroMetric label="События" value={board.summary.upcomingLabel} />
                          <HeroMetric label="Команда" value={board.summary.membersLabel} />
                          <HeroMetric label="Штаб" value={board.summary.moderationLabel} />
                          <HeroMetric label="Отклики" value={board.summary.responseLabel} />
                        </div>
                      </div>

                      <div className="border-t border-white/10 pt-4 xl:border-t-0 xl:border-l xl:pl-6 xl:pt-0">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.3em] text-white/64">
                          Ближайший акцент
                        </p>
                        <h2 className="mt-3 line-clamp-3 font-display text-[2.1rem] uppercase leading-[0.92] tracking-tight text-white">
                          {spotlight?.title ?? "Ближайшее мероприятие"}
                        </h2>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-white/78">
                          {spotlight?.summary ??
                            "Откройте календарь и выберите событие для деталей, RSVP и модерации."}
                        </p>
                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <SurfaceBadge
                            label="Дата"
                            value={
                              spotlight
                                ? format(new Date(spotlight.startAt), "d MMMM", { locale: ru })
                                : "Нет даты"
                            }
                          />
                          <SurfaceBadge label="Локация" value={spotlight?.location ?? "Штаб"} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <div className="space-y-4">
              <section
                ref={calendarRef}
                data-tone="adaptive"
                className="panel-surface surface-panel min-w-0 rounded-[1.85rem] p-4 sm:p-5"
              >
                <div className="flex flex-col gap-4 border-b border-white/8 pb-4">
                  <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7f93bb]">
                        Оперативная панель
                      </p>
                      <h2 className="mt-2 font-display text-[clamp(1.85rem,10vw,2.15rem)] uppercase tracking-tight text-white">
                        Доска мероприятий
                      </h2>
                    </div>

                    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
                      <div className="grid w-full grid-cols-2 rounded-full border border-white/8 bg-white/[0.03] p-1 sm:flex sm:w-auto">
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

                      <label className="surface-chip flex w-full min-w-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[#9db2d8] sm:min-w-[230px] sm:w-auto">
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
                        className="surface-chip w-full rounded-full px-4 py-2.5 text-sm font-semibold text-[#d2def7] transition hover:bg-white/[0.06] sm:w-auto"
                      >
                        Сегодня
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm text-[#aac0e4]">
                    <InlineFact label="Выбранная дата" value={selectedDateLabel} />
                    <InlineFact label="Событий в день" value={`${dateEvents.length}`} />
                    <InlineFact
                      label="Обновлено"
                      value={format(new Date(board.now), "d MMM · HH:mm", { locale: ru })}
                    />
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
                      onSelectDate={handleSelectCalendarDate}
                      onOpenCreate={(date) => openCreateForDate(toDateKey(date))}
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
                            className="group surface-subtle flex w-full min-w-0 flex-col gap-3 rounded-[1.3rem] px-3 py-3 text-left transition hover:border-white/14 hover:bg-white/[0.05] sm:flex-row sm:items-center sm:gap-4 sm:px-4 sm:py-4"
                          >
                            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-[1.1rem] border border-white/8 bg-[#101e36] sm:h-20 sm:w-20 sm:aspect-auto">
                              <Image
                                src={event.photos[0]?.url ?? "/photos/event-kazan.png"}
                                alt={event.title}
                                fill
                                sizes="(max-width: 639px) 100vw, 80px"
                                className="object-cover"
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate whitespace-nowrap text-[0.72rem] font-semibold uppercase tracking-[0.2em] text-[#93a7cf] sm:text-[11px] sm:tracking-[0.24em]">
                                {format(new Date(event.startAt), "d MMM · HH:mm", { locale: ru })}
                              </p>
                              <h3 className="mt-2 line-clamp-2 text-lg font-semibold text-white">
                                {event.title}
                              </h3>
                              <p className="mt-1 line-clamp-2 text-sm leading-6 text-[#91a5cb]">
                                {event.summary}
                              </p>
                              <div className="mt-3 space-y-1">
                                <p className="truncate text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7c91b8]">
                                  {event.category}
                                </p>
                                <p className="line-clamp-2 text-xs leading-5 text-[#8ea2c8]">
                                  {event.location}
                                </p>
                              </div>
                            </div>
                            <ArrowRight className="hidden h-5 w-5 shrink-0 text-[#7388b0] transition group-hover:translate-x-1 group-hover:text-white sm:block" />
                          </button>
                        ))
                      ) : (
                        <div className="rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-[#92a5ca]">
                          По вашему запросу события не найдены.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </section>

              <div ref={detailPanelRef}>
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
                  onRequireAuth={goToLogin}
                  onSetResponse={handleRsvp}
                />
              </div>
            </div>

            {isModeratorView ? (
              <section data-tone="adaptive" className="panel-surface surface-panel min-w-0 overflow-hidden rounded-[1.85rem] p-4 sm:p-5">
                <div className="flex flex-col gap-4 border-b border-white/8 pb-4 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7f93bb]">
                      Модерация
                    </p>
                    <h2 className="mt-2 font-display text-[clamp(1.8rem,9vw,2rem)] uppercase tracking-tight text-white">
                      Штабная панель событий
                    </h2>
                    <p className="mt-2 max-w-3xl text-sm leading-6 text-[#93a7cb]">
                      Здесь удобно быстро открыть карточку мероприятия, посмотреть отклики и перейти в редактирование без растянутых блоков и лишнего шума.
                    </p>
                  </div>

                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
                    <label className="surface-chip flex w-full min-w-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[#9db2d8] sm:min-w-[230px] sm:w-auto">
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
                      className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-[#ff3245] sm:w-auto"
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
                      className="surface-subtle min-w-0 overflow-hidden rounded-[1.3rem] p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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
                          className="self-start whitespace-nowrap rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#cbd9f5] transition hover:bg-white/[0.08]"
                        >
                          Открыть
                        </button>
                      </div>

                      <div className="mt-4 grid gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
                        <SurfaceBadge label="Дата" value={format(new Date(event.startAt), "d MMM", { locale: ru })} />
                        <SurfaceBadge label="Придут" value={`${event.attendeeStats.going}`} />
                        <SurfaceBadge label="Не смогут" value={`${event.attendeeStats.declined}`} />
                      </div>

                      <p className="mt-4 break-words text-sm leading-6 text-[#91a5cb]">
                        {event.location}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
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
                  showFlash("success", message);
                  refreshBoard();
                }}
              />
            ) : null}

            {isRefreshing ? (
              <div className="pointer-events-none fixed bottom-6 right-6 rounded-full border border-white/10 bg-[#081321]/96 px-4 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <InlineLoader label="Обновляем данные" />
              </div>
            ) : null}

            {flash ? (
              <FlashToast flash={flash} onClose={() => setFlash(null)} />
            ) : null}

            <ConfirmationDialog
              open={logoutConfirmOpen}
              onClose={() => setLogoutConfirmOpen(false)}
              onConfirm={handleLogout}
              pending={isLoggingOut}
              title="Вы точно хотите выйти?"
              description="Сессия завершится на этом устройстве. При необходимости вы сможете войти снова по выданным данным."
              confirmLabel="Да, выйти"
              cancelLabel="Нет"
              tone="danger"
            />

            <MobileNavigationDrawer
              open={mobileMenuOpen}
              currentUser={currentUser}
              activeNavigation={activeNavigation}
              onClose={closeMobileMenu}
              onNavigate={(action) => {
                closeMobileMenu();
                handleNavigation(action);
              }}
              onOpenProfile={() => {
                closeMobileMenu();
                goToProfile();
              }}
              onLogin={() => {
                closeMobileMenu();
                goToLogin();
              }}
              onLogout={() => {
                closeMobileMenu();
                requestLogout();
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SidebarNavButton({
  icon: Icon,
  label,
  onClick,
  active,
  disabled,
}: {
  icon: typeof LayoutGrid;
  label: string;
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex w-full items-center justify-between rounded-[1rem] px-3 py-2.5 text-left transition",
        active
          ? "bg-[#173b91]/14 text-white shadow-[inset_0_0_0_1px_rgba(80,124,255,0.26)]"
          : disabled
            ? "cursor-default text-[#63789e]"
            : "text-[#8ea2c8] hover:bg-white/[0.04] hover:text-white",
      )}
    >
      <span className="flex items-center gap-3">
        <Icon className="h-[1.15rem] w-[1.15rem]" />
        <span className="text-sm font-medium">{label}</span>
      </span>
    </button>
  );
}

function MobileNavigationDrawer({
  open,
  currentUser,
  activeNavigation,
  onClose,
  onNavigate,
  onOpenProfile,
  onLogin,
  onLogout,
}: {
  open: boolean;
  currentUser: SessionUser | null;
  activeNavigation: ActiveNavigation;
  onClose: () => void;
  onNavigate: (action: NavigationAction) => void;
  onOpenProfile: () => void;
  onLogin: () => void;
  onLogout: () => void;
}) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#020816]/82 backdrop-blur-sm lg:hidden"
      onClick={onClose}
      role="presentation"
    >
      <aside
        data-tone="adaptive"
        className="panel-surface surface-panel flex h-full w-[min(320px,calc(100vw-1.5rem))] flex-col overflow-hidden rounded-r-[1.8rem] px-4 py-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-white/8 pb-4">
          <div>
            <BrandLockup priority />
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-[#8ca1cb]">
              Штабная доска
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Закрыть меню"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => (
            <SidebarNavButton
              key={item.label}
              icon={item.icon}
              label={item.label}
              onClick={() => (item.action === "inactive" ? undefined : onNavigate(item.action))}
              active={item.action === activeNavigation}
              disabled={item.action === "inactive"}
            />
          ))}
        </nav>

        <button
          type="button"
          onClick={currentUser ? onOpenProfile : onLogin}
          className="mt-4 flex items-center gap-3 rounded-[1.25rem] border-t border-white/8 pt-4 text-left"
        >
          <UserAvatar
            avatarUrl={currentUser?.avatarUrl}
            name={currentUser?.name ?? "Гость штаба"}
            size="sm"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {currentUser?.name ?? "Гость штаба"}
            </p>
            <p className="truncate text-sm text-[#8ea2c8]">
              {currentUser ? roleLabel[currentUser.role] : "Нажмите, чтобы войти"}
            </p>
          </div>
        </button>

        <div className="mt-4 grid gap-2">
          {currentUser ? (
            <>
              <button
                type="button"
                onClick={onLogout}
                className="font-display inline-flex items-center justify-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-3 text-sm font-bold tracking-[0.01em] text-white transition hover:bg-[#ff3245]"
              >
                <LogOut className="h-4 w-4" />
                Выйти
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="font-display inline-flex items-center justify-center gap-2 rounded-full bg-[var(--mger-red)] px-4 py-3 text-sm font-bold tracking-[0.01em] text-white transition hover:bg-[#ff3245]"
            >
              <KeyRound className="h-4 w-4" />
              Войти
            </button>
          )}
        </div>
      </aside>
    </div>
  );
}

function HeroMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 sm:min-w-[132px] sm:flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/64 sm:text-[11px] sm:tracking-[0.24em]">
        {label}
      </p>
      <p className="mt-1 text-base font-semibold leading-6 text-white sm:text-sm">{value}</p>
    </div>
  );
}

function InlineFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1 sm:min-w-[132px]">
      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#7f94bc]">
        {label}
      </p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function SurfaceBadge({ label, value }: { label: string; value: string }) {
  return (
    <div className="surface-subtle min-w-0 rounded-[1rem] px-3 py-2.5">
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
        "inline-flex min-w-0 flex-1 items-center justify-center gap-2 rounded-full px-3 py-2.5 text-sm font-semibold transition sm:flex-none sm:px-4",
        active
          ? "bg-white text-[#15306f]"
          : "text-[#a9bcdf] hover:bg-white/[0.06] hover:text-white",
      )}
    >
      <Icon className="h-4 w-4" />
      <span className="truncate whitespace-nowrap">{label}</span>
    </button>
  );
}

function FlashToast({
  flash,
  onClose,
}: {
  flash: NonNullable<FlashState>;
  onClose: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed inset-x-3 bottom-4 z-40 mx-auto flex max-w-md items-center gap-3 rounded-[1.2rem] border px-4 py-3 text-sm shadow-[0_24px_60px_rgba(0,0,0,0.35)] sm:inset-x-auto sm:right-6 sm:mx-0",
        flash.type === "success"
          ? "border-emerald-400/20 bg-[#0f2d22]/94 text-emerald-100"
          : flash.type === "info"
            ? "border-sky-400/20 bg-[#12243c]/94 text-sky-100"
            : "border-rose-400/20 bg-[#34141b]/94 text-rose-100",
      )}
      role="status"
      aria-live="polite"
    >
      <span className="flex-1">{flash.text}</span>
      <button
        type="button"
        onClick={onClose}
        className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80 transition hover:bg-white/[0.08]"
      >
        OK
      </button>
    </div>
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
  const [pendingAction, setPendingAction] = useState<"save" | "delete" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [formState, setFormState] = useState(() => getInitialEditorState(state.dateKey, state.event));
  const pending = pendingAction !== null;

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
    setPendingAction("save");
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

      setPendingAction(null);
      onSaved(
        state.mode === "create"
          ? "Мероприятие добавлено в календарь."
          : "Мероприятие обновлено.",
      );
    } catch (submissionError) {
      setPendingAction(null);
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

    setPendingAction("delete");
    setError(null);

    try {
      const response = await fetch(`/api/events/${state.event.id}`, {
        method: "DELETE",
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setError(data.error ?? "Не удалось удалить мероприятие.");
        return;
      }

      onDeleted("Мероприятие удалено.");
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "Не удалось удалить мероприятие.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  function handleCloseRequest() {
    if (!pending) {
      onClose();
    }
  }

  return (
    <Modal
      open={open}
      onClose={handleCloseRequest}
      size="md"
      title={state.mode === "create" ? "Новое мероприятие" : "Редактирование мероприятия"}
    >
      <form className="grid gap-3 lg:grid-cols-2" onSubmit={handleSubmit}>
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={3}
            value={formState.capacity}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                capacity: normalizeCapacityInput(event.target.value),
              }))
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
            className={`${inputClass} min-h-[84px] resize-y`}
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
            className={`${textAreaClass} min-h-[132px]`}
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
            disabled={pending}
            onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))}
          />
        </div>

        {formState.photoUrls.length ? (
          <div className="lg:col-span-2">
            <p className={labelClass}>Текущие фотографии</p>
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
          </div>
        ) : null}

        {newFiles.length ? (
          <p className="lg:col-span-2 text-sm text-[#93a7cb]">
            Будут загружены: {newFiles.map((file) => file.name).join(", ")}
          </p>
        ) : null}

        {error ? (
          <div className="lg:col-span-2 rounded-[1.2rem] border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}

        <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 border-t border-white/8 pt-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleCloseRequest}
              disabled={pending}
              className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:cursor-wait disabled:opacity-60"
            >
              Отмена
            </button>
            {state.mode === "edit" ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={pending}
                className="rounded-full border border-rose-400/20 bg-rose-500/12 px-4 py-2.5 text-sm font-semibold text-rose-200 transition hover:bg-rose-500/18 disabled:cursor-wait disabled:opacity-60"
              >
                {pendingAction === "delete" ? <InlineLoader label="Удаляем" /> : "Удалить"}
              </button>
            ) : null}
          </div>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-[#214aa8] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2d58bf] disabled:cursor-wait disabled:opacity-70"
          >
            {pendingAction === "save" ? (
              <InlineLoader label={state.mode === "create" ? "Создаём" : "Сохраняем"} />
            ) : state.mode === "create" ? (
              "Создать событие"
            ) : (
              "Сохранить изменения"
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
}
