import type { AnalyticsEvent, EventType } from "../../workspace/events";

export type DateRange = "24h" | "7d" | "30d" | "all";

export interface Filters {
  range: DateRange;
  types: EventType[];
}

export interface Metrics {
  totalEvents: number;
  uniqueUsers: number;
  eventsByType: Record<EventType, number>;
  conversionRate: number;
  totalRevenue: number;
  eventsByDay: { date: string; count: number }[];
}

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;
const RANGE_MS: Record<Exclude<DateRange, "all">, number> = { "24h": DAY, "7d": 7 * DAY, "30d": 30 * DAY };

// Step 2 reference solution: events are kept when they're at or after the
// range's cutoff AND their type is one of the selected types.
export function filterEvents(events: AnalyticsEvent[], filters: Filters, now: number): AnalyticsEvent[] {
  const cutoff = filters.range === "all" ? -Infinity : now - RANGE_MS[filters.range];
  return events.filter((event) => event.timestamp >= cutoff && filters.types.includes(event.type));
}

// Step 2 reference solution: adds conversionRate (share of users who signed
// up that also purchased, within the given events), totalRevenue (sum of
// purchase values), and eventsByDay (counts grouped by calendar day, oldest
// first). Every field is computed fresh from `events` -- there's no stored
// total anywhere for these to drift out of sync with.
export function computeMetrics(events: AnalyticsEvent[]): Metrics {
  const totalEvents = events.length;
  const uniqueUsers = new Set(events.map((e) => e.userId)).size;

  const eventsByType: Record<EventType, number> = { click: 0, purchase: 0, signup: 0, view: 0 };
  for (const event of events) {
    eventsByType[event.type] += 1;
  }

  const signupUsers = new Set(events.filter((e) => e.type === "signup").map((e) => e.userId));
  const purchaseUsers = new Set(events.filter((e) => e.type === "purchase").map((e) => e.userId));
  const convertedUsers = [...signupUsers].filter((userId) => purchaseUsers.has(userId));
  const conversionRate = signupUsers.size > 0 ? Math.round((convertedUsers.length / signupUsers.size) * 100) : 0;

  const totalRevenue = Math.round(
    events.filter((e) => e.type === "purchase").reduce((sum, e) => sum + (e.value ?? 0), 0) * 100,
  ) / 100;

  const byDay = new Map<string, number>();
  for (const event of events) {
    const day = new Date(event.timestamp).toISOString().slice(0, 10);
    byDay.set(day, (byDay.get(day) ?? 0) + 1);
  }
  const eventsByDay = Array.from(byDay.entries())
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalEvents, uniqueUsers, eventsByType, conversionRate, totalRevenue, eventsByDay };
}
