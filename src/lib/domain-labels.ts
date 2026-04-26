import { ROLE } from "@/lib/domain-constants";

export const roleLabel = {
  [ROLE.OWNER]: "Владелец",
  [ROLE.MODERATOR]: "Модератор",
  [ROLE.ACTIVIST]: "Активист",
} as const;
