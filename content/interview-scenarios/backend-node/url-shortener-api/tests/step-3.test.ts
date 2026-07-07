import app from "../workspace/app";
import { db } from "../workspace/db";

function resetData() {
  db.exec("DELETE FROM clicks;");
  db.exec("DELETE FROM links;");
  db.exec("INSERT INTO links (id, short_code, original_url, title, is_active, expires_at, created_at, updated_at) VALUES (1, 'docs', 'https://example.com/docs', 'Docs', 1, NULL, '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'), (2, 'old', 'https://example.com/old', 'Old Campaign', 1, '2020-01-01T00:00:00.000Z', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'), (3, 'off', 'https://example.com/off', 'Inactive Link', 0, NULL, '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'), (4, 'aa0001', 'https://example.com/collision', 'Collision Seed', 1, NULL, '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'), (5, 'empty', 'https://example.com/empty', 'No Clicks', 1, NULL, '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'), (6, 'bothbad', 'https://example.com/bothbad', 'Inactive Expired', 0, '2020-01-01T00:00:00.000Z', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z');");
  db.exec("INSERT INTO clicks (id, link_id, referrer, user_agent, clicked_at) VALUES (1, 1, NULL, 'Mozilla/5.0', '2025-01-10T10:00:00.000Z'), (2, 1, 'https://google.com', 'Chrome', '2025-01-10T11:00:00.000Z'), (3, 1, '', 'Safari', '2025-01-10T12:00:00.000Z'), (4, 1, 'https://google.com', 'Chrome', '2025-01-11T10:00:00.000Z'), (5, 1, 'https://news.ycombinator.com', 'Firefox', '2025-01-12T10:00:00.000Z'), (6, 2, 'https://archive.example.com', 'Bot', '2025-01-09T10:00:00.000Z');");
}

beforeEach(() => resetData());

test("GET /links/:shortCode/analytics validates short code and time range", async () => {
  const invalid = await request(app).get("/links/bad!/analytics");
  const missing = await request(app).get("/links/unknown/analytics");
  const missingEnd = await request(app).get("/links/docs/analytics?start=2025-01-10T00:00:00.000Z");
  const missingStart = await request(app).get("/links/docs/analytics?end=2025-01-12T23:59:59.999Z");
  const invalidStart = await request(app).get("/links/docs/analytics?start=not-a-date&end=2025-01-12T23:59:59.999Z");
  const invalidEnd = await request(app).get("/links/docs/analytics?start=2025-01-10T00:00:00.000Z&end=not-a-date");
  const invalidRange = await request(app).get("/links/docs/analytics?start=2025-01-13T00:00:00.000Z&end=2025-01-12T23:59:59.999Z");

  expect(invalid.body).toEqual({ error: "Invalid short code" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Link not found" });
  expect(missingEnd.body).toEqual({ error: "End is required" });
  expect(missingStart.body).toEqual({ error: "Start is required" });
  expect(invalidStart.body).toEqual({ error: "Invalid start" });
  expect(invalidEnd.body).toEqual({ error: "Invalid end" });
  expect(invalidRange.body).toEqual({ error: "Invalid time range" });
});

test("GET /links/:shortCode/analytics aggregates all clicks by day and referrer", async () => {
  const res = await request(app).get("/links/docs/analytics");

  expect(res.status).toBe(200);
  expect(res.body).toEqual({
    short_code: "docs",
    total_clicks: 5,
    by_day: [
      { date: "2025-01-10", clicks: 3 },
      { date: "2025-01-11", clicks: 1 },
      { date: "2025-01-12", clicks: 1 },
    ],
    by_referrer: [
      { referrer: "direct", clicks: 2 },
      { referrer: "https://google.com", clicks: 2 },
      { referrer: "https://news.ycombinator.com", clicks: 1 },
    ],
  });
});

test("GET /links/:shortCode/analytics respects inclusive ranges and zero-fills days", async () => {
  const res = await request(app).get(
    "/links/docs/analytics?start=2025-01-10T00:00:00.000Z&end=2025-01-13T23:59:59.999Z",
  );

  expect(res.status).toBe(200);
  expect(res.body.total_clicks).toBe(5);
  expect(res.body.by_day).toEqual([
    { date: "2025-01-10", clicks: 3 },
    { date: "2025-01-11", clicks: 1 },
    { date: "2025-01-12", clicks: 1 },
    { date: "2025-01-13", clicks: 0 },
  ]);
});

test("redirect-created clicks appear in analytics and previous behavior still works", async () => {
  await request(app).get("/r/docs").set("Referer", "https://google.com").set("User-Agent", "Agent");
  const analytics = await request(app).get("/links/docs/analytics");
  const updated = await request(app).patch("/links/docs").send({ title: "Docs Updated" });
  const detail = await request(app).get("/links/docs");

  expect(analytics.body.total_clicks).toBe(6);
  expect(analytics.body.by_referrer[0]).toEqual({ referrer: "https://google.com", clicks: 3 });
  expect(updated.status).toBe(200);
  expect(detail.body.link.title).toBe("Docs Updated");
  expect(detail.body.link.click_count).toBe(6);
});
