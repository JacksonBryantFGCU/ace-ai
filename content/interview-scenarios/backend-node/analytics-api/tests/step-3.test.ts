import app from "../workspace/app";

test("GET /analytics/funnel validates shared account and time range query params", async () => {
  const missingAccount = await request(app).get(
    "/analytics/funnel?start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const invalidAccount = await request(app).get(
    "/analytics/funnel?account_id=abc&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const missingAccountRow = await request(app).get(
    "/analytics/funnel?account_id=999&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const missingStart = await request(app).get("/analytics/funnel?account_id=1&end=2025-01-12T23:59:59.999Z");
  const invalidStart = await request(app).get(
    "/analytics/funnel?account_id=1&start=not-a-date&end=2025-01-12T23:59:59.999Z",
  );
  const missingEnd = await request(app).get("/analytics/funnel?account_id=1&start=2025-01-10T00:00:00.000Z");
  const invalidEnd = await request(app).get(
    "/analytics/funnel?account_id=1&start=2025-01-10T00:00:00.000Z&end=not-a-date",
  );
  const invalidRange = await request(app).get(
    "/analytics/funnel?account_id=1&start=2025-01-13T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
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

test("GET /analytics/funnel returns fixed ordered stages with distinct user counts and conversion rates", async () => {
  const res = await request(app).get(
    "/analytics/funnel?account_id=1&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );

  expect(res.status).toBe(200);
  expect(res.body.funnel).toEqual([
    { stage: "signup", users: 3, conversion_rate: 1 },
    { stage: "project_created", users: 2, conversion_rate: 0.67 },
    { stage: "subscription_started", users: 2, conversion_rate: 0.67 },
  ]);
  expect(res.body.funnel.map((stage: { conversion_rate: unknown }) => typeof stage.conversion_rate)).toEqual([
    "number",
    "number",
    "number",
  ]);
});

test("GET /analytics/funnel handles zero signup users with zero conversion rates", async () => {
  const res = await request(app).get(
    "/analytics/funnel?account_id=3&start=2025-01-10T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );

  expect(res.status).toBe(200);
  expect(res.body.funnel).toEqual([
    { stage: "signup", users: 0, conversion_rate: 0 },
    { stage: "project_created", users: 0, conversion_rate: 0 },
    { stage: "subscription_started", users: 0, conversion_rate: 0 },
  ]);
});

test("Step 3 preserves ingestion, event aggregation, and daily active user behavior", async () => {
  const created = await request(app).post("/events").send({
    external_id: "evt_step3_001",
    account_id: 1,
    user_id: "user_step3",
    event_type: "page_view",
    occurred_at: "2025-01-12T12:00:00.000Z",
  });
  const events = await request(app).get(
    "/analytics/events?account_id=1&event_type=page_view&start=2025-01-12T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );
  const dau = await request(app).get(
    "/analytics/daily-active-users?account_id=1&start=2025-01-12T00:00:00.000Z&end=2025-01-12T23:59:59.999Z",
  );

  expect(created.status).toBe(201);
  expect(events.body).toEqual({ total_events: 2, by_type: { page_view: 2 } });
  expect(dau.body).toEqual({ days: [{ date: "2025-01-12", active_users: 4 }] });
});
