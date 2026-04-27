"use client";

import { type FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ShieldCheck, UserRoundPlus } from "lucide-react";
import { BrandLockup } from "@/components/shared/brand-lockup";
import {
  formInputClass as inputClass,
  formLabelClass as labelClass,
} from "@/components/shared/form-styles";
import { InlineLoader } from "@/components/shared/inline-loader";

function normalizeReturnTo(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  return value;
}

export function RegisterScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    document.documentElement.removeAttribute("data-theme");
    window.localStorage.removeItem("mger-theme");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const payload = {
      name: `${formData.get("name") ?? ""}`.trim(),
      email: `${formData.get("email") ?? ""}`.trim(),
      password: `${formData.get("password") ?? ""}`,
      passwordConfirm: `${formData.get("passwordConfirm") ?? ""}`,
    };

    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(data.error ?? "Не удалось создать профиль.");
      setPending(false);
      return;
    }

    router.replace(normalizeReturnTo(searchParams.get("returnTo")));
    router.refresh();
  }

  return (
    <main className="min-h-screen text-white">
      <div className="mx-auto flex min-h-screen w-full max-w-[1320px] flex-col px-3 py-3 sm:px-4 sm:py-4">
        <div className="grid flex-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_460px]">
          <section className="panel-surface surface-panel relative overflow-hidden rounded-[2rem]">
            <Image
              src="/photos/event-kazan.png"
              alt="Команда Молодой гвардии"
              fill
              priority
              sizes="(max-width: 1280px) 100vw, 860px"
              className="object-cover object-center"
              loading="eager"
            />
            <div className="absolute inset-0 bg-[linear-gradient(98deg,rgba(9,20,42,0.94)_0%,rgba(20,44,100,0.84)_36%,rgba(18,40,96,0.52)_54%,rgba(148,29,43,0.58)_82%,rgba(7,14,26,0.42)_100%)]" />
            <div className="relative z-10 flex h-full min-h-[360px] flex-col justify-between p-5 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between gap-3">
                <BrandLockup variant="login" priority />
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full border border-white/14 bg-white/[0.08] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.14]"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Войти
                </Link>
              </div>

              <div className="max-w-2xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.34em] text-white/68">
                  Новый доступ
                </p>
                <h1 className="mt-3 font-display text-[3rem] uppercase leading-[0.9] tracking-tight text-white sm:text-[4rem]">
                  Регистрация активиста
                </h1>
                <p className="mt-3 max-w-xl text-base leading-7 text-white/84">
                  Создайте профиль, чтобы сохранять участие в мероприятиях и работать с личной
                  карточкой. Новые пользователи получают роль активиста.
                </p>
              </div>
            </div>
          </section>

          <section className="panel-surface surface-panel flex rounded-[2rem] p-5 sm:p-6">
            <div className="m-auto w-full max-w-sm">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-[1rem] border border-white/10 bg-white/[0.04] text-white">
                <UserRoundPlus className="h-5 w-5" />
              </div>
              <h2 className="mt-5 font-display text-[2.2rem] uppercase tracking-tight text-white">
                Создать профиль
              </h2>
              <p className="mt-2 text-sm leading-6 text-[#92a6cc]">
                Данные сохраняются в подключенной PostgreSQL-базе. После регистрации вы сразу
                попадёте на доску мероприятий.
              </p>

              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label htmlFor="register-name" className={labelClass}>
                    ФИО или имя
                  </label>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    disabled={pending}
                    className={inputClass}
                    autoComplete="name"
                    placeholder="Иван Иванов"
                  />
                </div>

                <div>
                  <label htmlFor="register-email" className={labelClass}>
                    Email
                  </label>
                  <input
                    id="register-email"
                    name="email"
                    type="email"
                    disabled={pending}
                    className={inputClass}
                    autoComplete="email"
                    placeholder="name@example.com"
                  />
                </div>

                <div>
                  <label htmlFor="register-password" className={labelClass}>
                    Пароль
                  </label>
                  <input
                    id="register-password"
                    name="password"
                    type="password"
                    disabled={pending}
                    className={inputClass}
                    autoComplete="new-password"
                    placeholder="Минимум 8 символов"
                  />
                </div>

                <div>
                  <label htmlFor="register-password-confirm" className={labelClass}>
                    Повтор пароля
                  </label>
                  <input
                    id="register-password-confirm"
                    name="passwordConfirm"
                    type="password"
                    disabled={pending}
                    className={inputClass}
                    autoComplete="new-password"
                    placeholder="Повторите пароль"
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
                  aria-busy={pending}
                  className="w-full rounded-full bg-[var(--mger-red)] px-5 py-4 text-sm font-semibold text-white transition hover:bg-[#ff3245] disabled:cursor-wait disabled:opacity-70"
                >
                  {pending ? <InlineLoader label="Создаём" /> : "Зарегистрироваться"}
                </button>
              </form>

              <div className="mt-4 rounded-[1.3rem] border border-white/8 bg-white/[0.03] px-4 py-4 text-sm leading-6 text-[#93a7cb]">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[0.95rem] bg-white/[0.04] text-[#cbd8f4]">
                    <ShieldCheck className="h-4 w-4" />
                  </span>
                  <p>
                    Уже есть профиль?{" "}
                    <Link href="/login" className="font-semibold text-white underline-offset-4 hover:underline">
                      Войти в систему
                    </Link>
                    .
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
