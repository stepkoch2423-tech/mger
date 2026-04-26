"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Camera, Save } from "lucide-react";
import type { SessionUser } from "@/lib/auth/session";
import { roleLabel } from "@/lib/domain-labels";
import { BrandLockup } from "@/components/shared/brand-lockup";
import {
  formInputClass,
  formLabelClass,
  formTextAreaClass,
} from "@/components/shared/form-styles";
import { InlineLoader } from "@/components/shared/inline-loader";
import { UserAvatar } from "@/components/shared/user-avatar";

type ProfileFormState = {
  firstName: string;
  lastName: string;
  patronymic: string;
  birthYear: string;
  education: string;
  headquarters: string;
  about: string;
  achievements: string;
  avatarUrl: string;
};

function getInitialFormState(user: SessionUser): ProfileFormState {
  return {
    firstName: user.firstName ?? "",
    lastName: user.lastName ?? "",
    patronymic: user.patronymic ?? "",
    birthYear: user.birthYear ? `${user.birthYear}` : "",
    education: user.education ?? "",
    headquarters: user.headquarters ?? "",
    about: user.about ?? "",
    achievements: user.achievements ?? "",
    avatarUrl: user.avatarUrl ?? "",
  };
}

function normalizeYear(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  const currentYear = new Date().getFullYear();

  if (digits.length === 4 && Number(digits) > currentYear) {
    return `${currentYear}`;
  }

  return digits;
}

function getProfilePreviewName(formState: ProfileFormState, fallbackName: string) {
  const composedName = [formState.lastName, formState.firstName, formState.patronymic]
    .map((value) => value.trim())
    .filter(Boolean)
    .join(" ");

  return composedName || fallbackName;
}

export function ProfileScreen({ currentUser }: { currentUser: SessionUser }) {
  const router = useRouter();
  const initialFormState = useMemo(() => getInitialFormState(currentUser), [currentUser]);
  const [formState, setFormState] = useState(initialFormState);
  const [savedState, setSavedState] = useState(initialFormState);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const profilePreviewName = getProfilePreviewName(formState, currentUser.name);
  const avatarPreviewUrl = useMemo(
    () => (avatarFile ? URL.createObjectURL(avatarFile) : null),
    [avatarFile],
  );

  useEffect(() => {
    return () => {
      if (avatarPreviewUrl) {
        URL.revokeObjectURL(avatarPreviewUrl);
      }
    };
  }, [avatarPreviewUrl]);

  const hasUnsavedChanges =
    avatarFile !== null || JSON.stringify(formState) !== JSON.stringify(savedState);

  async function uploadAvatar() {
    if (!avatarFile) {
      return formState.avatarUrl;
    }

    const uploadForm = new FormData();
    uploadForm.append("files", avatarFile);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: uploadForm,
    });
    const payload = (await response.json()) as { urls?: string[]; error?: string };

    if (!response.ok || !payload.urls?.[0]) {
      throw new Error(payload.error ?? "Не удалось загрузить аватар.");
    }

    return payload.urls[0];
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    startTransition(async () => {
      try {
        const avatarUrl = await uploadAvatar();
        const nextState = {
          ...formState,
          avatarUrl,
        };
        const response = await fetch("/api/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(nextState),
        });
        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error ?? "Не удалось сохранить профиль.");
        }

        setFormState(nextState);
        setSavedState(nextState);
        setAvatarFile(null);
        setMessage({ type: "success", text: "Профиль сохранён." });
        router.refresh();
      } catch (error) {
        setMessage({
          type: "error",
          text: error instanceof Error ? error.message : "Не удалось сохранить профиль.",
        });
      }
    });
  }

  return (
    <main className="min-h-screen overflow-x-clip text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1180px] flex-col px-3 py-3 sm:px-4 sm:py-4">
        <section className="panel-surface surface-panel overflow-hidden rounded-[2rem] p-4 sm:p-6">
          <div className="flex flex-col gap-4 border-b border-white/8 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <BrandLockup variant="login" priority />
              <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#8398be]">
                Личный профиль
              </p>
              <h1 className="mt-2 font-display text-[2.7rem] uppercase leading-none tracking-tight text-white">
                Карточка участника
              </h1>
            </div>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/12 bg-white/[0.05] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.09]"
            >
              <ArrowLeft className="h-4 w-4" />
              На доску
            </Link>
          </div>

          <form className="mt-5 grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]" onSubmit={handleSubmit}>
            <aside className="rounded-[1.45rem] border border-white/8 bg-white/[0.03] p-4">
              <UserAvatar
                avatarUrl={avatarPreviewUrl ?? formState.avatarUrl}
                name={profilePreviewName}
                size="lg"
                className="mx-auto"
              />
              <p className="mt-4 text-center text-lg font-semibold text-white">
                {profilePreviewName}
              </p>
              <p className="mt-1 text-center text-sm text-[#95a8cc]">{roleLabel[currentUser.role]}</p>
              <label className="mt-5 flex cursor-pointer items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-[#dbe6ff] transition hover:bg-white/[0.08]">
                <Camera className="h-4 w-4" />
                Загрузить фото
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(event) => setAvatarFile(event.target.files?.[0] ?? null)}
                />
              </label>
            </aside>

            <div className="grid gap-4 lg:grid-cols-3">
              <div>
                <label htmlFor="profile-last-name" className={formLabelClass}>
                  Фамилия
                </label>
                <input
                  id="profile-last-name"
                  className={formInputClass}
                  value={formState.lastName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, lastName: event.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="profile-first-name" className={formLabelClass}>
                  Имя
                </label>
                <input
                  id="profile-first-name"
                  className={formInputClass}
                  value={formState.firstName}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, firstName: event.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="profile-patronymic" className={formLabelClass}>
                  Отчество
                </label>
                <input
                  id="profile-patronymic"
                  className={formInputClass}
                  value={formState.patronymic}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, patronymic: event.target.value }))
                  }
                />
              </div>
              <div>
                <label htmlFor="profile-birth-year" className={formLabelClass}>
                  Год рождения
                </label>
                <input
                  id="profile-birth-year"
                  type="number"
                  min={1900}
                  max={new Date().getFullYear()}
                  inputMode="numeric"
                  className={formInputClass}
                  value={formState.birthYear}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      birthYear: normalizeYear(event.target.value),
                    }))
                  }
                />
              </div>
              <div className="lg:col-span-2">
                <label htmlFor="profile-education" className={formLabelClass}>
                  Учёба или работа
                </label>
                <input
                  id="profile-education"
                  className={formInputClass}
                  value={formState.education}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, education: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="profile-headquarters" className={formLabelClass}>
                  Штаб
                </label>
                <input
                  id="profile-headquarters"
                  className={formInputClass}
                  value={formState.headquarters}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, headquarters: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="profile-about" className={formLabelClass}>
                  О себе
                </label>
                <textarea
                  id="profile-about"
                  className={formTextAreaClass}
                  value={formState.about}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, about: event.target.value }))
                  }
                />
              </div>
              <div className="lg:col-span-3">
                <label htmlFor="profile-achievements" className={formLabelClass}>
                  Достижения
                </label>
                <textarea
                  id="profile-achievements"
                  className={formTextAreaClass}
                  value={formState.achievements}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, achievements: event.target.value }))
                  }
                />
              </div>

              {message ? (
                <div
                  className={
                    message.type === "success"
                      ? "lg:col-span-3 rounded-[1.1rem] border border-emerald-400/20 bg-emerald-500/12 px-4 py-3 text-sm text-emerald-100"
                      : "lg:col-span-3 rounded-[1.1rem] border border-rose-400/20 bg-rose-500/12 px-4 py-3 text-sm text-rose-100"
                  }
                >
                  {message.text}
                </div>
              ) : null}

              <div className="lg:col-span-3 flex justify-end">
                <button
                  type="submit"
                  disabled={pending || !hasUnsavedChanges}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--mger-red)] px-5 py-3 text-sm font-bold text-white transition hover:bg-[#ff3245] disabled:cursor-not-allowed disabled:opacity-55"
                >
                  {pending ? <InlineLoader label="Сохраняем" /> : <><Save className="h-4 w-4" /> Сохранить профиль</>}
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
