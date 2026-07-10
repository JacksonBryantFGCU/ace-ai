export const EVENT_STATUSES = ["scheduled", "cancelled", "completed"] as const;

export type EventStatus = (typeof EVENT_STATUSES)[number];

export const RSVP_STATUSES = ["going", "waitlisted", "cancelled"] as const;

export type RsvpStatus = (typeof RSVP_STATUSES)[number];
