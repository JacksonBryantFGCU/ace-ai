import app from "../workspace/app";

const RANGE = "account_id=1&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z";

test("reporting endpoints validate shared account and time range query params", async () => {
  const missingAccount = await request(app).get(
    "/analytics/events?start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const invalidAccount = await request(app).get(
    "/analytics/events?account_id=abc&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const missingAccountRow = await request(app).get(
    "/analytics/events?account_id=999&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const missingStart = await request(app).get("/analytics/events?account_id=1&end=2025-01-12T23:59:59.999Z");
  const invalidStart = await request(app).get(
    "/analytics/events?account_id=1&start=not-a-date&end=2025-01-12T23:59:59.999Z",
  );
  const missingEnd = await request(app).get("/analytics/events?account_id=1&start=2025-01-10T00:00:00.000Z");
  const invalidEnd = await request(app).get(
    "/analytics/events?account_id=1&start=2025-01-10T00:00:00.000Z&end=not-a-date",
  );
  const invalidRange = await request(app).get(
    "/analytics/events?account_id=1&start=2025-01-13T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );

  expect(missingAccount.body).toEqual({ error: "Invalid account id" });
  expect(invalidAccount.body).toEqual({ error: "Invalid account id" });
  expect(missingAccountRow.status).toBe(404);
  expect(missingAccountRow.body).toEqual({ error: "Account not found" });
  expect(missingStart.body).toEqual({ error: "Invalid start" });
  expect(invalidStart.body).toEqual({ error: "Invalid start" });
  expect(missingEnd.body).toEqual({ error: "Invalid end" });
  expect(invalidEnd.body).toEqual({ error: "Invalid end" });
  expect(invalidRange.body).toEqual({ error: "Invalid time range" });
});

test("GET /analytics/events aggregates totals and zero-filled event type counts", async () => {
  const res = await request(app).get(`/analytics/events?${RANGE}`);

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    total_events: 14,
    by_type: {
      page_view: 4,
      signup: 3,
      project_created: 2,
      invite_sent: 2,
      subscription_started: 2,
      subscription_cancelled: 1,
    },
  });
});

test("GET /analytics/events filters by event_type and validates invalid filters", async () => {
  const filtered = await request(app).get(`/analytics/events?${RANGE}&event_type=page_view`);
  const emptyFiltered = await request(app).get(
    "/analytics/events?account_id=3&event_type=page_view&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const invalid = await request(app).get(`/analytics/events?${RANGE}&event_type=login`);

  expect(filtered.status).toBe(200);
  expect(filtered.body).toEqual({ total_events: 4, by_type: { page_view: 4 } });
  expect(emptyFiltered.body).toEqual({ total_events: 0, by_type: { page_view: 0 } });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid event type" });
});

test("GET /analytics/daily-active-users counts distinct users and fills missing days", async () => {
  const res = await request(app).get(
    "/analytics/daily-active-users?account_id=1&start=2025-01-10T00:00:00.000Z&end=2025-01-14T23:59:59.999Z",
  );

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    days: [
      { date: "2025-01-10", active_users: 2 },
      { date: "2025-01-11", active_users: 2 },
      { date: "2025-01-12", active_users: 3 },
      { date: "2025-01-13", active_users: 1 },
      { date: "2025-01-14", active_users: 0 },
    ],
  });
});

test("Step 2 preserves event ingestion behavior", async () => {
  const created = await request(app).post("/events").send({
    external_id: "evt_step2_001",
    account_id: 1,
    user_id: "user_step2",
    event_type: "signup",
    occurred_at: "2025-01-12T12:00:00.000Z",
  });

  expect(created.status).toBe(201);
  expect(created.body.event.properties).toEqual({});
});
