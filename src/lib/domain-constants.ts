export const ROLE = {
  OWNER: "OWNER",
  MODERATOR: "MODERATOR",
  ACTIVIST: "ACTIVIST",
} as const;

export type AppRole = (typeof ROLE)[keyof typeof ROLE];

export const RSVP_STATUS = {
  GOING: "GOING",
  DECLINED: "DECLINED",
} as const;

export type AppRsvpStatus = (typeof RSVP_STATUS)[keyof typeof RSVP_STATUS];
