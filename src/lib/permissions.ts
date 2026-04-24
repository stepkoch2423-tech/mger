import { ROLE, type AppRole } from "@/lib/domain-constants";

export function canManageEvents(role?: AppRole | null) {
  return role === ROLE.OWNER || role === ROLE.MODERATOR;
}

export function canManageMembers(role?: AppRole | null) {
  return role === ROLE.OWNER;
}
