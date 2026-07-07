import app from "../workspace/app";
import { db } from "../workspace/db";

test("POST /events validates required identity fields", async () => {
  const missingExternal = await request(app).post("/events").send({
    account_id: 1,
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });
  const emptyExternal = await request(app).post("/events").send({
    external_id: "   ",
    account_id: 1,
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });
  const missingAccount = await request(app).post("/events").send({
    external_id: "evt_new_001",
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });
  const invalidAccount = await request(app).post("/events").send({
    external_id: "evt_new_001",
    account_id: "abc",
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });

  expect(missingExternal.body).toEqual({ error: "External id is required" });
  expect(emptyExternal.body).toEqual({ error: "External id is required" });
  expect(missingAccount.body).toEqual({ error: "Account id is required" });
  expect(invalidAccount.body).toEqual({ error: "Invalid account id" });
});

test("POST /events validates account, user, event type, timestamp, and properties", async () => {
  const missingAccount = await request(app).post("/events").send({
    external_id: "evt_new_002",
    account_id: 999,
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });
  const missingUser = await request(app).post("/events").send({
    external_id: "evt_new_002",
    account_id: 1,
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });
  const invalidType = await request(app).post("/events").send({
    external_id: "evt_new_002",
    account_id: 1,
    user_id: "user_100",
    event_type: "login",
    occurred_at: "2025-01-12T10:00:00.000Z",
  });
  const missingOccurred = await request(app).post("/events").send({
    external_id: "evt_new_002",
    account_id: 1,
    user_id: "user_100",
    event_type: "page_view",
  });
  const invalidOccurred = await request(app).post("/events").send({
    external_id: "evt_new_002",
    account_id: 1,
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "not-a-date",
  });
  const invalidProperties = await request(app).post("/events").send({
    external_id: "evt_new_002",
    account_id: 1,
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
    properties: "not-an-object",
  });

  expect(missingAccount.status).toBe(404);
  expect(missingAccount.body).toEqual({ error: "Account not found" });
  expect(missingUser.body).toEqual({ error: "User id is required" });
  expect(invalidType.body).toEqual({ error: "Invalid event type" });
  expect(missingOccurred.body).toEqual({ error: "Occurred at is required" });
  expect(invalidOccurred.body).toEqual({ error: "Invalid occurred at" });
  expect(invalidProperties.body).toEqual({ error: "Invalid properties" });
});

test("POST /events creates events with JSON properties and safe response shape", async () => {
  const withProperties = await request(app).post("/events").send({
    external_id: "  evt_new_003  ",
    account_id: 1,
    user_id: "  user_100  ",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
    properties: { path: "/reports", nested: { tab: "events" } },
  });
  const withoutProperties = await request(app).post("/events").send({
    external_id: "evt_new_004",
    account_id: 1,
    user_id: "user_101",
    event_type: "invite_sent",
    occurred_at: "2025-01-12T10:05:00.000Z",
  });

  expect(withProperties.status).toBe(201);
  expect(withProperties.body.event).toMatchObject({
    external_id: "evt_new_003",
    account_id: 1,
    user_id: "user_100",
    event_type: "page_view",
    occurred_at: "2025-01-12T10:00:00.000Z",
    properties: { path: "/reports", nested: { tab: "events" } },
  });
  expect(withProperties.body.event.created_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(JSON.stringify(withProperties.body)).not.toContain("properties_json");
  expect(withoutProperties.status).toBe(201);
  expect(withoutProperties.body.event.properties).toEqual({});

  const stored = db.get<{ properties_json: string; user_id: string }>(
    "SELECT properties_json, user_id FROM events WHERE external_id = ?",
    ["evt_new_003"],
  );
  expect(JSON.parse(stored!.properties_json)).toEqual({ path: "/reports", nested: { tab: "events" } });
  expect(stored!.user_id).toBe("user_100");
});

test("POST /events is idempotent by external_id", async () => {
  const before = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM events WHERE external_id = ?", ["evt_001"])!;
  const duplicate = await request(app).post("/events").send({
    external_id: "evt_001",
    account_id: 1,
    user_id: "different_user",
    event_type: "signup",
    occurred_at: "2025-01-12T10:00:00.000Z",
    properties: { ignored: true },
  });
  const after = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM events WHERE external_id = ?", ["evt_001"])!;

  expect(duplicate.status).toBe(200);
  expect(duplicate.body.duplicate).toBe(true);
  expect(duplicate.body.event).toMatchObject({
    id: 1,
    external_id: "evt_001",
    account_id: 1,
    user_id: "user_1",
    event_type: "page_view",
    properties: { path: "/landing" },
  });
  expect(JSON.stringify(duplicate.body)).not.toContain("properties_json");
  expect(after.count).toBe(before.count);
});
