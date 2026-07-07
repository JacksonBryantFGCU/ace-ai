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

// Step 1 reference solution: filtering isn't implemented yet -- every caller
// still sees the full event list, regardless of `filters`.
export function filterEvents(events: AnalyticsEvent[], filters: Filters, now: number): AnalyticsEvent[] {
  void filters;
  void now;
  return events;
}

// Step 1 reference solution: totalEvents, uniqueUsers, and eventsByType are
// computed from the given events. Conversion rate, revenue, and the daily
// trend are Step 2 work.
export function computeMetrics(events: AnalyticsEvent[]): Metrics {
  const totalEvents = events.length;
  const uniqueUsers = new Set(events.map((e) => e.userId)).size;

  const eventsByType: Record<EventType, number> = { click: 0, purchase: 0, signup: 0, view: 0 };
  for (const event of events) {
    eventsByType[event.type] += 1;
  }

  return {
    totalEvents,
    uniqueUsers,
    eventsByType,
    conversionRate: 0,
    totalRevenue: 0,
    eventsByDay: [],
  };
}
