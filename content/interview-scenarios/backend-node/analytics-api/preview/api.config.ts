export const config = {
  title: "Analytics API Explorer",
  defaultExampleId: "event-counts",
};

export const apiExamples = [
  {
    id: "ingest-event",
    label: "Ingest event",
    method: "POST",
    path: "/events",
    body: {
      external_id: "evt_preview_001",
      account_id: 1,
      user_id: "user_preview",
      event_type: "page_view",
      occurred_at: "2025-01-12T10:00:00.000Z",
      properties: { path: "/preview" },
    },
  },
  {
    id: "duplicate-event",
    label: "Duplicate event",
    method: "POST",
    path: "/events",
    body: {
      external_id: "evt_001",
      account_id: 1,
      user_id: "ignored",
      event_type: "page_view",
      occurred_at: "2025-01-12T10:00:00.000Z",
      properties: { ignored: true },
    },
  },
  {
    id: "event-counts",
    label: "Event counts",
    method: "GET",
    path: "/analytics/events?account_id=1&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  },
  {
    id: "event-count-filtered",
    label: "Page views",
    method: "GET",
    path: "/analytics/events?account_id=1&event_type=page_view&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  },
  {
    id: "daily-active-users",
    label: "Daily active users",
    method: "GET",
    path: "/analytics/daily-active-users?account_id=1&start=2025-01-10T00:00:00.000Z&end=2025-01-14T23:59:59.999Z",
  },
  {
    id: "funnel",
    label: "Funnel",
    method: "GET",
    path: "/analytics/funnel?account_id=1&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  },
];
