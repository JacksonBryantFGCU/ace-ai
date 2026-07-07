export type EventType = "click" | "purchase" | "signup" | "view";

export interface AnalyticsEvent {
  id: string;
  type: EventType;
  timestamp: number; // ms epoch
  userId: string;
  value?: number;
}

// A fixed reference "now" the seed data (and the tests) are built around, so
// date-range filtering is deterministic regardless of when this runs.
export const NOW = new Date("2026-06-15T12:00:00.000Z").getTime();

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

export const EVENTS: AnalyticsEvent[] = [
  // Within the last 24 hours.
  { id: "e1", type: "view", timestamp: NOW - 1 * HOUR, userId: "u1" },
  { id: "e2", type: "click", timestamp: NOW - 2 * HOUR, userId: "u1" },
  { id: "e3", type: "signup", timestamp: NOW - 3 * HOUR, userId: "u2" },
  { id: "e4", type: "purchase", timestamp: NOW - 4 * HOUR, userId: "u2", value: 49.99 },
  // 2-5 days ago: within the last 7 days, outside the last 24 hours.
  { id: "e5", type: "view", timestamp: NOW - 2 * DAY, userId: "u3" },
  { id: "e6", type: "signup", timestamp: NOW - 3 * DAY, userId: "u3" },
  { id: "e7", type: "click", timestamp: NOW - 4 * DAY, userId: "u1" },
  { id: "e8", type: "purchase", timestamp: NOW - 5 * DAY, userId: "u4", value: 19.99 },
  // 10-20 days ago: within the last 30 days, outside the last 7 days.
  { id: "e9", type: "signup", timestamp: NOW - 10 * DAY, userId: "u5" },
  { id: "e10", type: "view", timestamp: NOW - 15 * DAY, userId: "u5" },
  { id: "e11", type: "purchase", timestamp: NOW - 20 * DAY, userId: "u5", value: 99.0 },
  // Older than 30 days: only visible under "all time".
  { id: "e12", type: "signup", timestamp: NOW - 45 * DAY, userId: "u6" },
  { id: "e13", type: "click", timestamp: NOW - 60 * DAY, userId: "u6" },
];
