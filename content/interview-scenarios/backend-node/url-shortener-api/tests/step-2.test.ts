import app from "../workspace/app";
import { db } from "../workspace/db";

function resetData() {
  db.exec("DELETE FROM clicks;");
  db.exec("DELETE FROM links;");
  db.exec("INSERT INTO links (id, short_code, original_url, title, is_active, expires_at, created_at, updated_at) VALUES (1, 'docs', 'https://example.com/docs', 'Docs', 1, NULL, '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'), (2, 'old', 'https://example.com/old', 'Old Campaign', 1, '2020-01-01T00:00:00.000Z', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'), (3, 'off', 'https://example.com/off', 'Inactive Link', 0, NULL, '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'), (4, 'aa0001', 'https://example.com/collision', 'Collision Seed', 1, NULL, '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'), (5, 'empty', 'https://example.com/empty', 'No Clicks', 1, NULL, '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'), (6, 'bothbad', 'https://example.com/bothbad', 'Inactive Expired', 0, '2020-01-01T00:00:00.000Z', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z');");
  db.exec("INSERT INTO clicks (id, link_id, referrer, user_agent, clicked_at) VALUES (1, 1, NULL, 'Mozilla/5.0', '2025-01-10T10:00:00.000Z'), (2, 1, 'https://google.com', 'Chrome', '2025-01-10T11:00:00.000Z'), (3, 1, '', 'Safari', '2025-01-10T12:00:00.000Z'), (4, 1, 'https://google.com', 'Chrome', '2025-01-11T10:00:00.000Z'), (5, 1, 'https://news.ycombinator.com', 'Firefox', '2025-01-12T10:00:00.000Z'), (6, 2, 'https://archive.example.com', 'Bot', '2025-01-09T10:00:00.000Z');");
}

beforeEach(() => resetData());

test("GET /r/:shortCode validates and rejects missing, inactive, and expired links without recording clicks", async () => {
  const before = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM clicks")!.count;
  const invalid = await request(app).get("/r/bad!");
  const missing = await request(app).get("/r/unknown");
  const inactiveExpired = await request(app).get("/r/bothbad");
  const expired = await request(app).get("/r/old");

  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid short code" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Link not found" });
  expect(inactiveExpired.status).toBe(410);
  expect(inactiveExpired.body).toEqual({ error: "Link is inactive" });
  expect(expired.status).toBe(410);
  expect(expired.body).toEqual({ error: "Link has expired" });
  expect(db.get<{ count: number }>("SELECT COUNT(*) AS count FROM clicks")!.count).toBe(before);
});

test("GET /r/:shortCode redirects and records exactly one click with request metadata", async () => {
  const before = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM clicks WHERE link_id = 1")!.count;
  const redirected = await request(app).get("/r/docs").set("Referer", "https://google.com").set("User-Agent", "TestAgent/1.0");
  const after = db.get<{ count: number }>("SELECT COUNT(*) AS count FROM clicks WHERE link_id = 1")!.count;
  const newest = db.get<{ referrer: string; user_agent: string; clicked_at: string }>(
    "SELECT referrer, user_agent, clicked_at FROM clicks WHERE link_id = 1 ORDER BY id DESC LIMIT 1",
  )!;
  const detail = await request(app).get("/links/docs");

  expect(redirected.status).toBe(302);
  expect(redirected.headers.location).toBe("https://example.com/docs");
  expect(after).toBe(before + 1);
  expect(newest.referrer).toBe("https://google.com");
  expect(newest.user_agent).toBe("TestAgent/1.0");
  expect(newest.clicked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  expect(detail.body.link.click_count).toBe(6);
});

test("PATCH /links/:shortCode validates update payloads", async () => {
  const invalidCode = await request(app).patch("/links/bad!").send({ title: "Bad" });
  const missing = await request(app).patch("/links/unknown").send({ title: "Bad" });
  const none = await request(app).patch("/links/docs").send({});
  const unknown = await request(app).patch("/links/docs").send({ original_url: "https://evil.example.com" });
  const invalidTitle = await request(app).patch("/links/docs").send({ title: 123 });
  const longTitle = await request(app).patch("/links/docs").send({ title: "x".repeat(121) });
  const invalidActive = await request(app).patch("/links/docs").send({ is_active: "false" });
  const invalidExpiration = await request(app).patch("/links/docs").send({ expires_at: "not-a-date" });
  const pastExpiration = await request(app).patch("/links/docs").send({ expires_at: "2020-01-01T00:00:00.000Z" });

  expect(invalidCode.body).toEqual({ error: "Invalid short code" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Link not found" });
  expect(none.body).toEqual({ error: "No update fields provided" });
  expect(unknown.body).toEqual({ error: "Unknown update field" });
  expect(invalidTitle.body).toEqual({ error: "Invalid title" });
  expect(longTitle.body).toEqual({ error: "Title is too long" });
  expect(invalidActive.body).toEqual({ error: "Invalid active value" });
  expect(invalidExpiration.body).toEqual({ error: "Invalid expiration" });
  expect(pastExpiration.body).toEqual({ error: "Expiration must be in the future" });
});

test("PATCH /links/:shortCode updates metadata while preserving short code and URL", async () => {
  const before = db.get<{ updated_at: string }>("SELECT updated_at FROM links WHERE short_code = ?", ["docs"])!;
  const updated = await request(app).patch("/links/docs").send({
    title: "  Documentation  ",
    is_active: false,
    expires_at: "2099-03-10T09:00:00.000Z",
  });
  const cleared = await request(app).patch("/links/docs").send({ title: "   ", is_active: true, expires_at: null });

  expect(updated.status).toBe(200);
  expect(updated.body.link).toMatchObject({
    short_code: "docs",
    original_url: "https://example.com/docs",
    title: "Documentation",
    is_active: false,
    expires_at: "2099-03-10T09:00:00.000Z",
    click_count: 5,
  });
  expect(updated.body.link.updated_at).not.toBe(before.updated_at);
  expect(cleared.body.link).toMatchObject({ title: null, is_active: true, expires_at: null });
});

test("Step 2 preserves create and list behavior", async () => {
  const created = await request(app).post("/links").send({ original_url: "https://example.com/new", custom_alias: "newlink" });
  const listed = await request(app).get("/links?active=true&expired=false");

  expect(created.status).toBe(201);
  expect(created.body.link.short_code).toBe("newlink");
  expect(listed.body.links.map((link: { short_code: string }) => link.short_code)).toContain("newlink");
});
