import { type ClassValue, clsx } from "clsx";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function toDateKey(value: Date | string) {
  return format(new Date(value), "yyyy-MM-dd");
}

export function formatRussianPlural(
  count: number,
  forms: [single: string, few: string, many: string],
) {
  const remainder10 = count % 10;
  const remainder100 = count % 100;

  if (remainder10 === 1 && remainder100 !== 11) {
    return `${count} ${forms[0]}`;
  }

  if (remainder10 >= 2 && remainder10 <= 4 && (remainder100 < 12 || remainder100 > 14)) {
    return `${count} ${forms[1]}`;
  }

  return `${count} ${forms[2]}`;
}

export function formatEventDateRange(startAt: string, endAt: string) {
  const start = new Date(startAt);
  const end = new Date(endAt);

  return {
    day: format(start, "d MMMM", { locale: ru }),
    weekDay: format(start, "EEEE", { locale: ru }),
    time: `${format(start, "HH:mm")} - ${format(end, "HH:mm")}`,
  };
}
