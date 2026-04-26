import { LoaderCircle } from "lucide-react";

export function InlineLoader({ label }: { label?: string }) {
  return (
    <span className="inline-flex items-center justify-center gap-2">
      <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      {label ? <span>{label}</span> : null}
    </span>
  );
}
