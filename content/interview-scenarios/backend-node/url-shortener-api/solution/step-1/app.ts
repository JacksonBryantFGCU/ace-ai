import express from "express";
import type { Request, Response } from "express";
import { db } from "../../workspace/db";

const app = express();
app.use(express.json());

const CODE_RE = /^[A-Za-z0-9_-]+$/;
const ALLOWED_CREATE_FIELDS = new Set(["original_url", "custom_alias", "title", "expires_at"]);
const ALLOWED_UPDATE_FIELDS = new Set(["title", "is_active", "expires_at"]);

type LinkRow = {
  id: number;
  short_code: string;
  original_url: string;
  title: string | null;
  is_active: number;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  click_count: number;
};

function nowIso() {
  return new Date().toISOString();
}

function queryValue(value: unknown) {
  return Array.isArray(value) ? value[0] : value;
}

function isIsoDate(value: string) {
  return !Number.isNaN(Date.parse(value));
}

function isFuture(value: string) {
  return Date.parse(value) > Date.now();
}

function isExpired(row: { expires_at: string | null }) {
  return row.expires_at !== null && Date.parse(row.expires_at) <= Date.now();
}

function validShortCode(value: string) {
  return CODE_RE.test(value);
}

function validAlias(value: string) {
  return value.length >= 3 && value.length <= 32 && validShortCode(value);
}

function parseBooleanFilter(value: unknown) {
  const normalized = queryValue(value);
  if (normalized === undefined) return null;
  if (normalized === "true") return true;
  if (normalized === "false") return false;
  return undefined;
}

function linkSelect() {
  return `SELECT links.id, links.short_code, links.original_url, links.title, links.is_active,
                 links.expires_at, links.created_at, links.updated_at,
                 COUNT(clicks.id) AS click_count
          FROM links
          LEFT JOIN clicks ON clicks.link_id = links.id`;
}

function toLink(row: LinkRow) {
  return {
    id: row.id,
    short_code: row.short_code,
    original_url: row.original_url,
    title: row.title,
    is_active: row.is_active === 1,
    is_expired: isExpired(row),
    expires_at: row.expires_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    click_count: row.click_count,
  };
}

function findLink(shortCode: string) {
  return db.get<LinkRow>(
    `${linkSelect()}
     WHERE links.short_code = ?
     GROUP BY links.id`,
    [shortCode],
  );
}

function shortCodeExists(shortCode: string) {
  return Boolean(db.get("SELECT id FROM links WHERE short_code = ?", [shortCode]));
}

function generateShortCode() {
  for (let i = 1; i <= 9999; i += 1) {
    const candidate = `aa${String(i).padStart(4, "0")}`;
    if (!shortCodeExists(candidate)) return candidate;
  }
  throw new Error("Unable to generate short code");
}

function parseOriginalUrl(value: unknown, res: Response) {
  const originalUrl = typeof value === "string" ? value.trim() : "";
  if (!originalUrl) {
    res.status(400).json({ error: "Original URL is required" });
    return null;
  }

  const protocolMatch = originalUrl.match(/^([A-Za-z][A-Za-z0-9+.-]*):/);
  if (!protocolMatch) {
    res.status(400).json({ error: "Invalid original URL" });
    return null;
  }

  const protocol = protocolMatch[1]?.toLowerCase();
  if (protocol !== "http" && protocol !== "https") {
    res.status(400).json({ error: "Unsupported URL protocol" });
    return null;
  }

  if (!/^https?:\/\/[^\s/]+(?:\/[^\s]*)?$/i.test(originalUrl)) {
    res.status(400).json({ error: "Invalid original URL" });
    return null;
  }

  return originalUrl;
}

function parseTitle(value: unknown, res: Response) {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    res.status(400).json({ error: "Invalid title" });
    return null;
  }
  const title = value.trim() || null;
  if (title && title.length > 120) {
    res.status(400).json({ error: "Title is too long" });
    return null;
  }
  return title;
}

function parseExpiration(value: unknown, res: Response) {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string" || !isIsoDate(value)) {
    res.status(400).json({ error: "Invalid expiration" });
    return undefined;
  }
  if (!isFuture(value)) {
    res.status(400).json({ error: "Expiration must be in the future" });
    return undefined;
  }
  return value;
}

function datesBetween(start: string, end: string) {
  const dates: string[] = [];
  const current = new Date(`${start.slice(0, 10)}T00:00:00.000Z`);
  const last = new Date(`${end.slice(0, 10)}T00:00:00.000Z`);
  while (current.getTime() <= last.getTime()) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

app.post("/links", (req: Request, res: Response) => {
  const body = req.body as Record<string, unknown>;
  for (const key of Object.keys(body)) {
    if (!ALLOWED_CREATE_FIELDS.has(key)) {
      res.status(400).json({ error: "Unknown update field" });
      return;
    }
  }

  const originalUrl = parseOriginalUrl(body.original_url, res);
  if (!originalUrl) return;

  let shortCode: string;
  if (body.custom_alias !== undefined) {
    shortCode = typeof body.custom_alias === "string" ? body.custom_alias.trim() : "";
    if (!validAlias(shortCode)) {
      res.status(400).json({ error: "Invalid custom alias" });
      return;
    }
    if (shortCodeExists(shortCode)) {
      res.status(409).json({ error: "Short code already exists" });
      return;
    }
  } else {
    shortCode = generateShortCode();
  }

  if (body.title !== undefined) {
    if (typeof body.title !== "string") {
      res.status(400).json({ error: "Invalid title" });
      return;
    }
    if (body.title.trim().length > 120) {
      res.status(400).json({ error: "Title is too long" });
      return;
    }
  }
  if (body.expires_at !== undefined && body.expires_at !== null) {
    if (typeof body.expires_at !== "string" || !isIsoDate(body.expires_at)) {
      res.status(400).json({ error: "Invalid expiration" });
      return;
    }
    if (!isFuture(body.expires_at)) {
      res.status(400).json({ error: "Expiration must be in the future" });
      return;
    }
  }
  const title = parseTitle(body.title, res);
  const expiresAt = parseExpiration(body.expires_at, res);

  const timestamp = nowIso();
  const result = db.run(
    "INSERT INTO links (short_code, original_url, title, is_active, expires_at, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?)",
    [shortCode, originalUrl, title ?? null, expiresAt ?? null, timestamp, timestamp],
  );
  const row = db.get<LinkRow>(
    `${linkSelect()}
     WHERE links.id = ?
     GROUP BY links.id`,
    [result.lastInsertRowid],
  )!;

  res.status(201).json({ link: toLink(row) });
});

app.get("/links", (req: Request, res: Response) => {
  const active = parseBooleanFilter(req.query.active);
  if (active === undefined) {
    res.status(400).json({ error: "Invalid active filter" });
    return;
  }

  const expired = parseBooleanFilter(req.query.expired);
  if (expired === undefined) {
    res.status(400).json({ error: "Invalid expired filter" });
    return;
  }

  const rows = db.all<LinkRow>(
    `${linkSelect()}
     GROUP BY links.id
     ORDER BY links.created_at ASC, links.id ASC`,
  );
  const links = rows
    .map(toLink)
    .filter((link) => active === null || link.is_active === active)
    .filter((link) => expired === null || link.is_expired === expired);

  res.status(200).json({ links });
});

app.get("/r/:shortCode", (req: Request, res: Response) => {
  const shortCode = req.params.shortCode;
  if (!validShortCode(shortCode)) {
    res.status(400).json({ error: "Invalid short code" });
    return;
  }

  const link = findLink(shortCode);
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }
  if (link.is_active !== 1) {
    res.status(410).json({ error: "Link is inactive" });
    return;
  }
  if (isExpired(link)) {
    res.status(410).json({ error: "Link has expired" });
    return;
  }

  db.run("INSERT INTO clicks (link_id, referrer, user_agent, clicked_at) VALUES (?, ?, ?, ?)", [
    link.id,
    req.get("referer") ?? req.get("referrer") ?? null,
    req.get("user-agent") ?? null,
    nowIso(),
  ]);
  res.status(302).set("Location", link.original_url).end();
});

app.get("/links/:shortCode/analytics", (req: Request, res: Response) => {
  const shortCode = req.params.shortCode;
  if (!validShortCode(shortCode)) {
    res.status(400).json({ error: "Invalid short code" });
    return;
  }
  const link = findLink(shortCode);
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  const start = queryValue(req.query.start);
  const end = queryValue(req.query.end);
  if (start !== undefined && end === undefined) {
    res.status(400).json({ error: "End is required" });
    return;
  }
  if (end !== undefined && start === undefined) {
    res.status(400).json({ error: "Start is required" });
    return;
  }
  if (start !== undefined && (typeof start !== "string" || !isIsoDate(start))) {
    res.status(400).json({ error: "Invalid start" });
    return;
  }
  if (end !== undefined && (typeof end !== "string" || !isIsoDate(end))) {
    res.status(400).json({ error: "Invalid end" });
    return;
  }
  if (typeof start === "string" && typeof end === "string" && Date.parse(start) > Date.parse(end)) {
    res.status(400).json({ error: "Invalid time range" });
    return;
  }

  const rangeClause = typeof start === "string" && typeof end === "string" ? "AND clicked_at >= ? AND clicked_at <= ?" : "";
  const params = typeof start === "string" && typeof end === "string" ? [link.id, start, end] : [link.id];
  const total =
    db.get<{ count: number }>(`SELECT COUNT(*) AS count FROM clicks WHERE link_id = ? ${rangeClause}`, params)?.count ?? 0;
  const dayRows = db.all<{ date: string; clicks: number }>(
    `SELECT substr(clicked_at, 1, 10) AS date, COUNT(*) AS clicks
     FROM clicks
     WHERE link_id = ? ${rangeClause}
     GROUP BY date
     ORDER BY date ASC`,
    params,
  );
  const byDay =
    typeof start === "string" && typeof end === "string"
      ? datesBetween(start, end).map((date) => ({
          date,
          clicks: dayRows.find((row) => row.date === date)?.clicks ?? 0,
        }))
      : dayRows;
  const byReferrer = db.all<{ referrer: string; clicks: number }>(
    `SELECT CASE WHEN referrer IS NULL OR trim(referrer) = '' THEN 'direct' ELSE referrer END AS referrer,
            COUNT(*) AS clicks
     FROM clicks
     WHERE link_id = ? ${rangeClause}
     GROUP BY CASE WHEN referrer IS NULL OR trim(referrer) = '' THEN 'direct' ELSE referrer END
     ORDER BY clicks DESC, referrer ASC`,
    params,
  );

  res.status(200).json({ short_code: shortCode, total_clicks: total, by_day: byDay, by_referrer: byReferrer });
});

app.patch("/links/:shortCode", (req: Request, res: Response) => {
  const shortCode = req.params.shortCode;
  if (!validShortCode(shortCode)) {
    res.status(400).json({ error: "Invalid short code" });
    return;
  }
  const link = findLink(shortCode);
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }

  const body = req.body as Record<string, unknown>;
  const keys = Object.keys(body);
  if (keys.length === 0) {
    res.status(400).json({ error: "No update fields provided" });
    return;
  }
  if (keys.some((key) => !ALLOWED_UPDATE_FIELDS.has(key))) {
    res.status(400).json({ error: "Unknown update field" });
    return;
  }

  const updates: string[] = [];
  const values: unknown[] = [];
  if (Object.prototype.hasOwnProperty.call(body, "title")) {
    if (typeof body.title !== "string") {
      res.status(400).json({ error: "Invalid title" });
      return;
    }
    if (body.title.trim().length > 120) {
      res.status(400).json({ error: "Title is too long" });
      return;
    }
    const title = parseTitle(body.title, res);
    updates.push("title = ?");
    values.push(title);
  }
  if (Object.prototype.hasOwnProperty.call(body, "is_active")) {
    if (typeof body.is_active !== "boolean") {
      res.status(400).json({ error: "Invalid active value" });
      return;
    }
    updates.push("is_active = ?");
    values.push(body.is_active ? 1 : 0);
  }
  if (Object.prototype.hasOwnProperty.call(body, "expires_at")) {
    if (body.expires_at !== null) {
      if (typeof body.expires_at !== "string" || !isIsoDate(body.expires_at)) {
        res.status(400).json({ error: "Invalid expiration" });
        return;
      }
      if (!isFuture(body.expires_at)) {
        res.status(400).json({ error: "Expiration must be in the future" });
        return;
      }
    }
    const expiresAt = parseExpiration(body.expires_at, res);
    updates.push("expires_at = ?");
    values.push(expiresAt);
  }

  updates.push("updated_at = ?");
  values.push(nowIso(), shortCode);
  db.run(`UPDATE links SET ${updates.join(", ")} WHERE short_code = ?`, values);
  res.status(200).json({ link: toLink(findLink(shortCode)!) });
});

app.get("/links/:shortCode", (req: Request, res: Response) => {
  const shortCode = req.params.shortCode;
  if (!validShortCode(shortCode)) {
    res.status(400).json({ error: "Invalid short code" });
    return;
  }
  const link = findLink(shortCode);
  if (!link) {
    res.status(404).json({ error: "Link not found" });
    return;
  }
  res.status(200).json({ link: toLink(link) });
});

export default app;
