import { cn } from "@/lib/utils";
import Image from "next/image";

type BrandLockupVariant = "sidebar" | "hero" | "login";

const brandSizes: Record<
  BrandLockupVariant,
  {
    wrapper: string;
    mger: string;
    er: string;
    sizes: string;
  }
> = {
  sidebar: {
    wrapper: "h-16",
    mger: "h-16 w-[94px]",
    er: "h-16 w-[49px]",
    sizes: "150px",
  },
  hero: {
    wrapper: "h-11",
    mger: "h-11 w-[64px]",
    er: "h-11 w-[34px]",
    sizes: "104px",
  },
  login: {
    wrapper: "h-14 sm:h-16",
    mger: "h-14 w-[82px] sm:h-16 sm:w-[94px]",
    er: "h-14 w-[43px] sm:h-16 sm:w-[49px]",
    sizes: "150px",
  },
};

export function BrandLockup({
  className,
  priority = false,
  variant = "sidebar",
}: {
  className?: string;
  priority?: boolean;
  variant?: BrandLockupVariant;
}) {
  const size = brandSizes[variant];

  return (
    <div className={cn("flex items-center justify-start gap-[3px]", size.wrapper, className)}>
      <div className={cn("relative shrink-0 overflow-hidden", size.mger)}>
        <Image
          src="/branding/mger-logo.png"
          alt="Молодая гвардия"
          fill
          className="object-contain object-left"
          sizes={size.sizes}
          loading={priority ? "eager" : "lazy"}
        />
      </div>
      <div className={cn("relative shrink-0 overflow-hidden", size.er)}>
        <Image
          src="/branding/er-logo.png"
          alt="Единая Россия"
          fill
          className="object-contain"
          sizes={size.sizes}
          loading={priority ? "eager" : "lazy"}
        />
      </div>
    </div>
  );
}
