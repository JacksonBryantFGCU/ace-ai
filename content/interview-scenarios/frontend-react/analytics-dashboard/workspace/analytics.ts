import type { AnalyticsEvent, EventType } from "./events";

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

const EMPTY_BY_TYPE: Record<EventType, number> = { click: 0, purchase: 0, signup: 0, view: 0 };

// `now` is required rather than defaulted to `Date.now()` -- the seed data
// in `events.ts` is anchored to a fixed reference time (`NOW`), so every
// caller must be explicit about what "now" means for the range it's asking
// for, instead of silently drifting against the real wall clock.
//
// TODO (Step 2): return only the events matching `filters.range` (relative
// to `now`) and `filters.types`.
export function filterEvents(events: AnalyticsEvent[], filters: Filters, now: number): AnalyticsEvent[] {
  void filters;
  void now;
  return events;
}

// TODO (Step 1): compute totalEvents, uniqueUsers, and eventsByType from the
// given events.
// TODO (Step 2): compute conversionRate (share of signed-up users who also
// purchased), totalRevenue (sum of purchase values), and eventsByDay (event
// counts grouped by calendar day) too.
export function computeMetrics(events: AnalyticsEvent[]): Metrics {
  void events;
  return {
    totalEvents: 0,
    uniqueUsers: 0,
    eventsByType: EMPTY_BY_TYPE,
    conversionRate: 0,
    totalRevenue: 0,
    eventsByDay: [],
  };
}
