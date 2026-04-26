import Image from "next/image";
import { cn } from "@/lib/utils";

const avatarSizes = {
  sm: "h-10 w-10 text-sm",
  md: "h-14 w-14 text-base",
  lg: "h-24 w-24 text-2xl",
} as const;

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

export function UserAvatar({
  avatarUrl,
  name,
  size = "md",
  className,
}: {
  avatarUrl?: string | null;
  name: string;
  size?: keyof typeof avatarSizes;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative shrink-0 overflow-hidden rounded-full border border-white/10 bg-[#132541] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]",
        avatarSizes[size],
        className,
      )}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={name}
          fill
          sizes={size === "lg" ? "96px" : "56px"}
          className="object-cover"
        />
      ) : (
        <span className="flex h-full w-full items-center justify-center font-semibold">
          {getInitials(name) || "МГ"}
        </span>
      )}
    </div>
  );
}
