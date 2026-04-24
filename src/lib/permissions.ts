import { Role } from "@prisma/client";

export function canManageEvents(role?: Role | null) {
  return role === Role.OWNER || role === Role.MODERATOR;
}

export function canManageMembers(role?: Role | null) {
  return role === Role.OWNER;
}
