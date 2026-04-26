"use client";

import { cn } from "@/lib/utils";
import { InlineLoader } from "@/components/shared/inline-loader";
import { Modal } from "@/components/ui/modal";

export function ConfirmationDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Нет",
  tone = "primary",
  pending = false,
  onClose,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "primary" | "danger";
  pending?: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal open={open} onClose={() => (pending ? undefined : onClose())} title={title} size="sm">
      <p className="text-sm leading-6 text-[#a9badd]">{description}</p>
      <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-white/8 pt-4">
        <button
          type="button"
          onClick={onClose}
          disabled={pending}
          className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/[0.08] disabled:opacity-60"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={cn(
            "rounded-full px-4 py-2.5 text-sm font-bold text-white transition disabled:cursor-wait disabled:opacity-70",
            tone === "danger" ? "bg-[var(--mger-red)] hover:bg-[#ff3245]" : "bg-[#214aa8] hover:bg-[#2d58bf]",
          )}
        >
          {pending ? <InlineLoader label="Подтверждаем" /> : confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
