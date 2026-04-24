"use client";

import { type ReactNode, useEffect, useEffectEvent } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

const sizeClasses = {
  sm: "max-w-lg",
  md: "max-w-3xl",
  lg: "max-w-6xl",
} as const;

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  size?: keyof typeof sizeClasses;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({
  open,
  title,
  description,
  size = "md",
  onClose,
  children,
}: ModalProps) {
  const handleEscape = useEffectEvent((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  });

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const listener = (event: KeyboardEvent) => handleEscape(event);
    window.addEventListener("keydown", listener);

    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-[#020816]/78 px-4 py-6 backdrop-blur-md sm:items-center"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={cn(
          "panel-surface relative w-full overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(180deg,rgba(11,23,41,0.98),rgba(9,18,33,0.98))] shadow-[0_40px_140px_rgba(0,0,0,0.55)]",
          sizeClasses[size],
        )}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        aria-describedby={description ? "modal-description" : undefined}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.35),transparent)]" />
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
          aria-label="Закрыть"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="border-b border-white/8 px-6 py-6 sm:px-8">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.34em] text-[#7d90b7]">
            Штабной интерфейс
          </p>
          <h2
            id="modal-title"
            className="font-display text-3xl uppercase tracking-tight text-white"
          >
            {title}
          </h2>
          {description ? (
            <p id="modal-description" className="mt-2 max-w-2xl text-sm text-[#9cafcf]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="max-h-[82vh] overflow-y-auto px-6 py-6 sm:px-8">{children}</div>
      </div>
    </div>
  );
}
