import app from "../workspace/app";
import { db } from "../workspace/db";

function resetData() {
  db.exec("DELETE FROM clicks;");
  db.exec("DELETE FROM links;");
  db.exec("INSERT INTO links (id, short_code, original_url, title, is_active, expires_at, created_at, updated_at) VALUES (1, 'docs', 'https://example.com/docs', 'Docs', 1, NULL, '2025-01-10T09:00:00.000Z', '2025-01-10T09:00:00.000Z'), (2, 'old', 'https://example.com/old', 'Old Campaign', 1, '2020-01-01T00:00:00.000Z', '2025-01-10T09:05:00.000Z', '2025-01-10T09:05:00.000Z'), (3, 'off', 'https://example.com/off', 'Inactive Link', 0, NULL, '2025-01-10T09:10:00.000Z', '2025-01-10T09:10:00.000Z'), (4, 'aa0001', 'https://example.com/collision', 'Collision Seed', 1, NULL, '2025-01-10T09:15:00.000Z', '2025-01-10T09:15:00.000Z'), (5, 'empty', 'https://example.com/empty', 'No Clicks', 1, NULL, '2025-01-10T09:20:00.000Z', '2025-01-10T09:20:00.000Z'), (6, 'bothbad', 'https://example.com/bothbad', 'Inactive Expired', 0, '2020-01-01T00:00:00.000Z', '2025-01-10T09:25:00.000Z', '2025-01-10T09:25:00.000Z');");
  db.exec("INSERT INTO clicks (id, link_id, referrer, user_agent, clicked_at) VALUES (1, 1, NULL, 'Mozilla/5.0', '2025-01-10T10:00:00.000Z'), (2, 1, 'https://google.com', 'Chrome', '2025-01-10T11:00:00.000Z'), (3, 1, '', 'Safari', '2025-01-10T12:00:00.000Z'), (4, 1, 'https://google.com', 'Chrome', '2025-01-11T10:00:00.000Z'), (5, 1, 'https://news.ycombinator.com', 'Firefox', '2025-01-12T10:00:00.000Z'), (6, 2, 'https://archive.example.com', 'Bot', '2025-01-09T10:00:00.000Z');");
}

beforeEach(() => resetData());

test("POST /links validates URL, alias, title, and expiration inputs", async () => {
  const missingUrl = await request(app).post("/links").send({ title: "Dashboard" });
  const emptyUrl = await request(app).post("/links").send({ original_url: "   " });
  const invalidUrl = await request(app).post("/links").send({ original_url: "not-a-url" });
  const unsupported = await request(app).post("/links").send({ original_url: "ftp://example.com/file" });
  const invalidAlias = await request(app).post("/links").send({ original_url: "https://example.com", custom_alias: "bad alias" });
  const shortAlias = await request(app).post("/links").send({ original_url: "https://example.com", custom_alias: "ab" });
  const longAlias = await request(app).post("/links").send({ original_url: "https://example.com", custom_alias: "x".repeat(33) });
  const duplicateAlias = await request(app).post("/links").send({ original_url: "https://example.com", custom_alias: "docs" });
  const invalidTitle = await request(app).post("/links").send({ original_url: "https://example.com", title: 123 });
  const longTitle = await request(app).post("/links").send({ original_url: "https://example.com", title: "x".repeat(121) });
  const invalidExpiration = await request(app).post("/links").send({ original_url: "https://example.com", expires_at: "not-a-date" });
  const pastExpiration = await request(app).post("/links").send({ original_url: "https://example.com", expires_at: "2020-01-01T00:00:00.000Z" });

  expect(missingUrl.body).toEqual({ error: "Original URL is required" });
  expect(emptyUrl.body).toEqual({ error: "Original URL is required" });
  expect(invalidUrl.body).toEqual({ error: "Invalid original URL" });
  expect(unsupported.body).toEqual({ error: "Unsupported URL protocol" });
  expect(invalidAlias.body).toEqual({ error: "Invalid custom alias" });
  expect(shortAlias.body).toEqual({ error: "Invalid custom alias" });
  expect(longAlias.body).toEqual({ error: "Invalid custom alias" });
  expect(duplicateAlias.status).toBe(409);
  expect(duplicateAlias.body).toEqual({ error: "Short code already exists" });
  expect(invalidTitle.body).toEqual({ error: "Invalid title" });
  expect(longTitle.body).toEqual({ error: "Title is too long" });
  expect(invalidExpiration.body).toEqual({ error: "Invalid expiration" });
  expect(pastExpiration.body).toEqual({ error: "Expiration must be in the future" });
});

test("POST /links creates generated links, handles collisions, and creates custom aliases", async () => {
  const generated = await request(app).post("/links").send({
    original_url: "  https://example.com/dashboard  ",
    title: "  Dashboard  ",
  });
  const custom = await request(app).post("/links").send({
    original_url: "https://example.com/pricing",
    custom_alias: "pricing",
    title: "   ",
    expires_at: "2099-02-10T09:00:00.000Z",
  });

  expect(generated.status).toBe(201);
  expect(generated.body.link.short_code).toBe("aa0002");
  expect(generated.body.link.short_code).toMatch(/^[A-Za-z0-9_-]{6}$/);
  expect(generated.body.link).toMatchObject({
    original_url: "https://example.com/dashboard",
    title: "Dashboard",
    is_active: true,
    is_expired: false,
    expires_at: null,
    click_count: 0,
  });
  expect(custom.status).toBe(201);
  expect(custom.body.link).toMatchObject({
    short_code: "pricing",
    original_url: "https://example.com/pricing",
    title: null,
    is_active: true,
    is_expired: false,
    expires_at: "2099-02-10T09:00:00.000Z",
    click_count: 0,
  });
});

test("GET /links lists links with filters, click counts, and computed state", async () => {
  const all = await request(app).get("/links");
  const active = await request(app).get("/links?active=true");
  const inactive = await request(app).get("/links?active=false");
  const expired = await request(app).get("/links?expired=true");
  const notExpired = await request(app).get("/links?expired=false");
  const combined = await request(app).get("/links?active=true&expired=false");
  const badActive = await request(app).get("/links?active=yes");
  const badExpired = await request(app).get("/links?expired=yes");

  expect(all.status).toBe(200);
  expect(all.body.links.map((link: { short_code: string }) => link.short_code)).toEqual(["docs", "old", "off", "aa0001", "empty", "bothbad"]);
  expect(all.body.links[0]).toMatchObject({ short_code: "docs", is_active: true, is_expired: false, click_count: 5 });
  expect(JSON.stringify(all.body)).not.toContain("user_agent");
  expect(active.body.links.map((link: { short_code: string }) => link.short_code)).toEqual(["docs", "old", "aa0001", "empty"]);
  expect(inactive.body.links.map((link: { short_code: string }) => link.short_code)).toEqual(["off", "bothbad"]);
  expect(expired.body.links.map((link: { short_code: string }) => link.short_code)).toEqual(["old", "bothbad"]);
  expect(notExpired.body.links.map((link: { short_code: string }) => link.short_code)).toEqual(["docs", "off", "aa0001", "empty"]);
  expect(combined.body.links.map((link: { short_code: string }) => link.short_code)).toEqual(["docs", "aa0001", "empty"]);
  expect(badActive.body).toEqual({ error: "Invalid active filter" });
  expect(badExpired.body).toEqual({ error: "Invalid expired filter" });
});

test("GET /links/:shortCode returns one link and validates short codes", async () => {
  const found = await request(app).get("/links/docs");
  const invalid = await request(app).get("/links/bad!");
  const missing = await request(app).get("/links/unknown");

  expect(found.status).toBe(200);
  expect(found.body.link).toMatchObject({
    short_code: "docs",
    original_url: "https://example.com/docs",
    is_active: true,
    is_expired: false,
    click_count: 5,
  });
  expect(invalid.status).toBe(400);
  expect(invalid.body).toEqual({ error: "Invalid short code" });
  expect(missing.status).toBe(404);
  expect(missing.body).toEqual({ error: "Link not found" });
});
