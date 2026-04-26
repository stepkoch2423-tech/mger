"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Search,
  ShieldCheck,
  UserRoundCheck,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { ROLE } from "@/lib/domain-constants";
import { roleLabel } from "@/lib/domain-labels";
import type { MemberProfile } from "@/lib/members";
import { canManageMembers } from "@/lib/permissions";
import { cn, formatRussianPlural } from "@/lib/utils";
import { BrandLockup } from "@/components/shared/brand-lockup";
import { ConfirmationDialog } from "@/components/shared/confirmation-dialog";
import { UserAvatar } from "@/components/shared/user-avatar";

type MemberAction =
  | {
      type: "role";
      member: MemberProfile;
      nextRole: typeof ROLE.ACTIVIST | typeof ROLE.MODERATOR;
    }
  | {
      type: "status";
      member: MemberProfile;
      isBlocked: boolean;
    };

function getActionCopy(action: MemberAction) {
  if (action.type === "role") {
    return action.nextRole === ROLE.MODERATOR
      ? {
          title: "Сделать модератором?",
          text: `${action.member.name} получит доступ к созданию и редактированию мероприятий.`,
          confirm: "Да, назначить",
        }
      : {
          title: "Вернуть в активисты?",
          text: `${action.member.name} потеряет модераторские права, но останется участником штаба.`,
          confirm: "Да, вернуть",
        };
  }

  return action.isBlocked
    ? {
        title: "Заблокировать участника?",
        text: `${action.member.name} не сможет войти в систему, пока администратор не снимет блокировку.`,
        confirm: "Да, заблокировать",
      }
    : {
        title: "Разблокировать участника?",
        text: `${action.member.name} снова сможет входить в систему и отмечать участие.`,
        confirm: "Да, разблокировать",
      };
}

export function MembersScreen({
  currentUser,
  members,
}: {
  currentUser: SessionUser;
  members: MemberProfile[];
}) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [action, setAction] = useState<MemberAction | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const deferredQuery = useDeferredValue(query);
  const canManage = canManageMembers(currentUser.role);

  const visibleMembers = useMemo(() => {
    const normalized = deferredQuery.trim().toLowerCase();

    if (!normalized) {
      return members;
    }

    return members.filter((member) =>
      [
        member.name,
        member.email,
        roleLabel[member.role],
        member.headquarters,
        member.education,
        member.about,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [deferredQuery, members]);

  function confirmAction(nextAction: MemberAction) {
    setMessage(null);
    setAction(nextAction);
  }

  function runAction() {
    if (!action) {
      return;
    }

    startTransition(async () => {
      try {
        const response =
          action.type === "role"
            ? await fetch(`/api/users/${action.member.id}/role`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ role: action.nextRole }),
              })
            : await fetch(`/api/users/${action.member.id}/status`, {
                method: "PATCH",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({ isBlocked: action.isBlocked }),
              });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось обновить участника.");
        }

        setMessage({ type: "success", text: "Данные участника обновлены." });
        setAction(null);
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Не удалось обновить участника.",
        });
      }
    });
  }

  const actionCopy = action ? getActionCopy(action) : null;

  return (
    <main className="min-h-screen overflow-x-clip text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-3 py-3 sm:px-4 sm:py-4">
        <section className="panel-surface surface-panel rounded-[2rem] p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <BrandLockup variant="login" priority />
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8398be]">
                Команда штаба
              </p>
              <h1 className="mt-2 font-display text-[2.7rem] uppercase leading-none tracking-tight text-white">
                Участники
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-[#95a8cc]">
                Здесь собраны профили активистов и модераторов. Администратор может менять роль и блокировать доступ с подтверждением.
              </p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <label className="surface-chip flex min-w-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm text-[#9db2d8] sm:min-w-[300px]">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className="min-w-0 flex-1 bg-transparent outline-none placeholder:text-[#6d82aa]"
                  placeholder="Поиск по имени, штабу или роли"
                />
              </label>
              <Link
                href="/"
                className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
              >
                <ArrowLeft className="h-4 w-4" />
                На доску
              </Link>
            </div>
          </div>

          {message ? (
            <div
              className={cn(
                "mt-4 rounded-[1.1rem] border px-4 py-3 text-sm",
                message.type === "success"
                  ? "border-emerald-400/20 bg-emerald-500/12 text-emerald-100"
                  : "border-rose-400/20 bg-rose-500/12 text-rose-100",
              )}
            >
              {message.text}
            </div>
          ) : null}

          <div className="mt-5 grid gap-3 xl:grid-cols-2">
            {visibleMembers.map((member) => {
              const nextRole = member.role === ROLE.MODERATOR ? ROLE.ACTIVIST : ROLE.MODERATOR;
              const canChangeMember = canManage && member.role !== ROLE.OWNER && member.id !== currentUser.id;

              return (
                <article
                  key={member.id}
                  className={cn(
                    "rounded-[1.45rem] border bg-white/[0.025] p-4",
                    member.isBlocked ? "border-rose-400/20 opacity-72" : "border-white/8",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <UserAvatar avatarUrl={member.avatarUrl} name={member.name} size="md" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">{member.name}</h2>
                        <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-[#b7c9ef]">
                          {roleLabel[member.role]}
                        </span>
                        {member.isBlocked ? (
                          <span className="rounded-full bg-rose-500/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-rose-200">
                            Заблокирован
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 truncate text-sm text-[#91a5cb]">{member.email}</p>
                      <div className="mt-3 grid gap-2 text-sm text-[#a7b9dc] sm:grid-cols-2">
                        <Info label="Штаб" value={member.headquarters ?? "Не указан"} />
                        <Info label="Учёба/работа" value={member.education ?? "Не указано"} />
                        <Info
                          label="Активность"
                          value={`${formatRussianPlural(member.responsesCount, [
                            "отметка",
                            "отметки",
                            "отметок",
                          ])}, ${formatRussianPlural(member.createdEventsCount, [
                            "событие",
                            "события",
                            "событий",
                          ])}`}
                        />
                        <Info
                          label="Год рождения"
                          value={member.birthYear ? `${member.birthYear}` : "Не указан"}
                        />
                      </div>
                      {member.about ? (
                        <p className="mt-3 line-clamp-2 text-sm leading-6 text-[#d5e0f7]">
                          {member.about}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {canChangeMember ? (
                    <div className="mt-4 grid gap-2 border-t border-white/8 pt-4 min-[420px]:grid-cols-2">
                      <button
                        type="button"
                        onClick={() => confirmAction({ type: "role", member, nextRole })}
                        className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full border border-[#4d6fd8]/26 bg-[#214aa8]/18 px-4 py-2.5 text-sm font-semibold text-[#d5e2ff] transition hover:bg-[#214aa8]/28"
                      >
                        {nextRole === ROLE.MODERATOR ? (
                          <ShieldCheck className="h-4 w-4" />
                        ) : (
                          <UserRoundCheck className="h-4 w-4" />
                        )}
                        <span className="truncate">
                          {nextRole === ROLE.MODERATOR ? (
                            <>
                              <span className="sm:hidden">Модератор</span>
                              <span className="hidden sm:inline">Сделать модератором</span>
                            </>
                          ) : (
                            <>
                              <span className="sm:hidden">Активист</span>
                              <span className="hidden sm:inline">Вернуть в активисты</span>
                            </>
                          )}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          confirmAction({
                            type: "status",
                            member,
                            isBlocked: !member.isBlocked,
                          })
                        }
                        className={cn(
                          "inline-flex min-w-0 items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold transition",
                          member.isBlocked
                            ? "border border-emerald-400/20 bg-emerald-500/12 text-emerald-100 hover:bg-emerald-500/18"
                            : "border border-rose-400/20 bg-rose-500/12 text-rose-100 hover:bg-rose-500/18",
                        )}
                      >
                        {member.isBlocked ? (
                          <CheckCircle2 className="h-4 w-4" />
                        ) : (
                          <Ban className="h-4 w-4" />
                        )}
                        {member.isBlocked ? "Разблокировать" : "Заблокировать"}
                      </button>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>

          {!visibleMembers.length ? (
            <div className="mt-5 rounded-[1.4rem] border border-dashed border-white/10 bg-white/[0.03] px-5 py-8 text-center text-sm text-[#92a5ca]">
              Участники по этому запросу не найдены.
            </div>
          ) : null}
        </section>
      </div>

      {action && actionCopy ? (
        <ConfirmationDialog
          open={Boolean(action)}
          onClose={() => setAction(null)}
          onConfirm={runAction}
          pending={pending}
          title={actionCopy.title}
          description={actionCopy.text}
          confirmLabel={actionCopy.confirm}
          tone={action.type === "status" && action.isBlocked ? "danger" : "primary"}
        />
      ) : null}
    </main>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-[0.95rem] border border-white/8 bg-white/[0.03] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7f93b7]">
        {label}
      </p>
      <p className="mt-1 line-clamp-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}
