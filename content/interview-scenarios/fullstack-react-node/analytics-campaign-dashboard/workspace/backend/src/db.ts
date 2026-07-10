import initSqlJs from "sql.js";
import { CAMPAIGN_STATUSES, type CampaignStatus } from "../../shared/analytics";

export { CAMPAIGN_STATUSES, CAMPAIGN_STATUS_TRANSITIONS } from "../../shared/analytics";
export type { CampaignStatus } from "../../shared/analytics";

export interface ChannelRow {
  id: number;
  name: string;
  slug: string;
  created_at: string;
}

export interface CampaignRow {
  id: number;
  channel_id: number;
  name: string;
  status: CampaignStatus;
  budget_cents: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
}

export interface CampaignMetricRow {
  id: number;
  campaign_id: number;
  metric_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
  created_at: string;
  updated_at: string;
}

export interface DerivedMetrics {
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
  ctr: number;
  conversion_rate: number;
  cpa_cents: number;
  roas: number;
  budget_remaining_cents: number;
  over_budget: boolean;
}

export interface CampaignChannel {
  id: number;
  name: string;
  slug: string;
}

export interface CampaignAnalytics {
  id: number;
  name: string;
  status: CampaignStatus;
  budget_cents: number;
  starts_at: string;
  ends_at: string;
  channel: CampaignChannel;
  metrics: DerivedMetrics;
  created_at: string;
  updated_at: string;
}

export interface DailyMetric {
  id: number;
  campaign_id: number;
  metric_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
  ctr: number;
  conversion_rate: number;
  cpa_cents: number;
  roas: number;
}

export interface CampaignDetail {
  campaign: CampaignAnalytics;
  daily_metrics: DailyMetric[];
}

export interface SummaryMetrics {
  total_campaigns: number;
  active: number;
  paused: number;
  draft: number;
  completed: number;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
  ctr: number;
  conversion_rate: number;
  cpa_cents: number;
  roas: number;
  over_budget: number;
}

/**
 * Deterministic seed data. Four channels; eight campaigns spanning every
 * status, varied date ranges, with and without daily metrics, and both
 * over- and under-budget spend. Campaign ids are NOT pre-sorted by
 * starts_at, so the default ordering (status group, then starts_at DESC,
 * then id ASC) is meaningfully exercised.
 */
const SEED_CHANNELS = [
  { id: 1, name: "Search", slug: "search", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 2, name: "Social", slug: "social", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 3, name: "Display", slug: "display", created_at: "2025-01-01T09:00:00.000Z" },
  { id: 4, name: "Email", slug: "email", created_at: "2025-01-01T09:00:00.000Z" },
] satisfies ChannelRow[];

const SEED_CAMPAIGNS = [
  {
    id: 1,
    channel_id: 1,
    name: "Spring Launch",
    status: "active",
    budget_cents: 250000,
    starts_at: "2025-02-01T00:00:00.000Z",
    ends_at: "2025-02-28T23:59:59.000Z",
    created_at: "2025-01-10T09:00:00.000Z",
    updated_at: "2025-01-10T09:00:00.000Z",
  },
  {
    id: 2,
    channel_id: 3,
    name: "Retargeting Push",
    status: "paused",
    budget_cents: 80000,
    starts_at: "2025-01-15T00:00:00.000Z",
    ends_at: "2025-03-15T23:59:59.000Z",
    created_at: "2025-01-05T09:00:00.000Z",
    updated_at: "2025-01-05T09:00:00.000Z",
  },
  {
    id: 3,
    channel_id: 4,
    name: "Newsletter Promo",
    status: "draft",
    budget_cents: 50000,
    starts_at: "2025-03-01T00:00:00.000Z",
    ends_at: "2025-03-31T23:59:59.000Z",
    created_at: "2025-02-20T09:00:00.000Z",
    updated_at: "2025-02-20T09:00:00.000Z",
  },
  {
    id: 4,
    channel_id: 2,
    name: "Holiday Sale",
    status: "completed",
    budget_cents: 300000,
    starts_at: "2024-11-01T00:00:00.000Z",
    ends_at: "2024-12-31T23:59:59.000Z",
    created_at: "2024-10-15T09:00:00.000Z",
    updated_at: "2025-01-02T09:00:00.000Z",
  },
  {
    id: 5,
    channel_id: 1,
    name: "Brand Awareness",
    status: "active",
    budget_cents: 150000,
    starts_at: "2025-01-01T00:00:00.000Z",
    ends_at: "2025-06-30T23:59:59.000Z",
    created_at: "2024-12-20T09:00:00.000Z",
    updated_at: "2024-12-20T09:00:00.000Z",
  },
  {
    id: 6,
    channel_id: 3,
    name: "Flash Sale",
    status: "completed",
    budget_cents: 60000,
    starts_at: "2025-01-01T00:00:00.000Z",
    ends_at: "2025-01-07T23:59:59.000Z",
    created_at: "2024-12-28T09:00:00.000Z",
    updated_at: "2025-01-08T09:00:00.000Z",
  },
  {
    id: 7,
    channel_id: 2,
    name: "Q1 Push",
    status: "paused",
    budget_cents: 100000,
    starts_at: "2025-01-01T00:00:00.000Z",
    ends_at: "2025-03-31T23:59:59.000Z",
    created_at: "2024-12-15T09:00:00.000Z",
    updated_at: "2024-12-15T09:00:00.000Z",
  },
  {
    id: 8,
    channel_id: 4,
    name: "Test Campaign",
    status: "draft",
    budget_cents: 20000,
    starts_at: "2025-04-01T00:00:00.000Z",
    ends_at: "2025-04-30T23:59:59.000Z",
    created_at: "2025-03-01T09:00:00.000Z",
    updated_at: "2025-03-01T09:00:00.000Z",
  },
] satisfies CampaignRow[];

const SEED_METRICS = [
  // Campaign 1 — Spring Launch: 12000/840/72/95000/210000, under budget.
  { id: 1, campaign_id: 1, metric_date: "2025-02-01", impressions: 4000, clicks: 280, conversions: 24, spend_cents: 30000, revenue_cents: 70000 },
  { id: 2, campaign_id: 1, metric_date: "2025-02-02", impressions: 4000, clicks: 280, conversions: 24, spend_cents: 30000, revenue_cents: 70000 },
  { id: 3, campaign_id: 1, metric_date: "2025-02-03", impressions: 4000, clicks: 280, conversions: 24, spend_cents: 35000, revenue_cents: 70000 },
  // Campaign 2 — Retargeting Push: 3800/190/9/85000/115000, OVER budget (80000).
  { id: 4, campaign_id: 2, metric_date: "2025-01-20", impressions: 2000, clicks: 100, conversions: 5, spend_cents: 45000, revenue_cents: 60000 },
  { id: 5, campaign_id: 2, metric_date: "2025-02-10", impressions: 1800, clicks: 90, conversions: 4, spend_cents: 40000, revenue_cents: 55000 },
  // Campaign 3 — Newsletter Promo: no metrics.
  // Campaign 4 — Holiday Sale: 16000/1230/120/150000/450000, under budget (300000).
  { id: 6, campaign_id: 4, metric_date: "2024-11-15", impressions: 5000, clicks: 400, conversions: 40, spend_cents: 50000, revenue_cents: 150000 },
  { id: 7, campaign_id: 4, metric_date: "2024-12-01", impressions: 6000, clicks: 450, conversions: 42, spend_cents: 55000, revenue_cents: 160000 },
  { id: 8, campaign_id: 4, metric_date: "2024-12-20", impressions: 5000, clicks: 380, conversions: 38, spend_cents: 45000, revenue_cents: 140000 },
  // Campaign 5 — Brand Awareness: 6500/310/22/42000/73000, under budget (150000).
  { id: 9, campaign_id: 5, metric_date: "2025-01-05", impressions: 3000, clicks: 150, conversions: 10, spend_cents: 20000, revenue_cents: 35000 },
  { id: 10, campaign_id: 5, metric_date: "2025-02-15", impressions: 3500, clicks: 160, conversions: 12, spend_cents: 22000, revenue_cents: 38000 },
  // Campaign 6 — Flash Sale: 1000/120/15/70000/90000, OVER budget (60000).
  { id: 11, campaign_id: 6, metric_date: "2025-01-03", impressions: 1000, clicks: 120, conversions: 15, spend_cents: 70000, revenue_cents: 90000 },
  // Campaign 7 — Q1 Push: 4500/100/8/20000/30000, under budget (100000). Day 1 has zero clicks/conversions.
  { id: 12, campaign_id: 7, metric_date: "2025-01-10", impressions: 2000, clicks: 0, conversions: 0, spend_cents: 5000, revenue_cents: 0 },
  { id: 13, campaign_id: 7, metric_date: "2025-02-05", impressions: 2500, clicks: 100, conversions: 8, spend_cents: 15000, revenue_cents: 30000 },
  // Campaign 8 — Test Campaign: no metrics.
];

let sqlModule: Awaited<ReturnType<typeof initSqlJs>> | null = null;
let database: initSqlJs.Database | null = null;
let seededDatabaseBytes: Uint8Array | null = null;

async function getSqlModule() {
  sqlModule ??= await initSqlJs();
  return sqlModule;
}

function rowsFromStatement<T>(statement: initSqlJs.Statement): T[] {
  const rows: T[] = [];
  try {
    while (statement.step()) rows.push(statement.getAsObject() as T);
    return rows;
  } finally {
    statement.free();
  }
}

export async function resetDatabase() {
  const SQL = await getSqlModule();
  if (!seededDatabaseBytes) {
    const seeded = new SQL.Database();
    seeded.run(`
      CREATE TABLE channels (
        id INTEGER PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE campaigns (
        id INTEGER PRIMARY KEY,
        channel_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        status TEXT NOT NULL,
        budget_cents INTEGER NOT NULL,
        starts_at TEXT NOT NULL,
        ends_at TEXT NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (channel_id) REFERENCES channels(id)
      );

      CREATE TABLE campaign_metrics (
        id INTEGER PRIMARY KEY,
        campaign_id INTEGER NOT NULL,
        metric_date TEXT NOT NULL,
        impressions INTEGER NOT NULL,
        clicks INTEGER NOT NULL,
        conversions INTEGER NOT NULL,
        spend_cents INTEGER NOT NULL,
        revenue_cents INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
      );
    `);

    const insertChannel = seeded.prepare(
      "INSERT INTO channels (id, name, slug, created_at) VALUES (?, ?, ?, ?)",
    );
    const insertCampaign = seeded.prepare(`
      INSERT INTO campaigns (id, channel_id, name, status, budget_cents, starts_at, ends_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMetric = seeded.prepare(`
      INSERT INTO campaign_metrics
        (id, campaign_id, metric_date, impressions, clicks, conversions, spend_cents, revenue_cents, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    try {
      seeded.run("BEGIN");
      for (const channel of SEED_CHANNELS) {
        insertChannel.run([channel.id, channel.name, channel.slug, channel.created_at]);
      }
      for (const campaign of SEED_CAMPAIGNS) {
        insertCampaign.run([
          campaign.id,
          campaign.channel_id,
          campaign.name,
          campaign.status,
          campaign.budget_cents,
          campaign.starts_at,
          campaign.ends_at,
          campaign.created_at,
          campaign.updated_at,
        ]);
      }
      for (const metric of SEED_METRICS) {
        const timestamp = `${metric.metric_date}T12:00:00.000Z`;
        insertMetric.run([
          metric.id,
          metric.campaign_id,
          metric.metric_date,
          metric.impressions,
          metric.clicks,
          metric.conversions,
          metric.spend_cents,
          metric.revenue_cents,
          timestamp,
          timestamp,
        ]);
      }
      seeded.run("COMMIT");
      seededDatabaseBytes = seeded.export();
    } finally {
      insertChannel.free();
      insertCampaign.free();
      insertMetric.free();
      seeded.close();
    }
  }

  database?.close();
  database = new SQL.Database(seededDatabaseBytes.slice());
}

export async function getDatabase() {
  if (!database) await resetDatabase();
  return database!;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function computeMetrics(raw: {
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
}, budgetCents: number): DerivedMetrics {
  const ctr = raw.impressions === 0 ? 0 : round4(raw.clicks / raw.impressions);
  const conversionRate = raw.clicks === 0 ? 0 : round4(raw.conversions / raw.clicks);
  const cpaCents = raw.conversions === 0 ? 0 : Math.round(raw.spend_cents / raw.conversions);
  const roas = raw.spend_cents === 0 ? 0 : round4(raw.revenue_cents / raw.spend_cents);
  return {
    impressions: raw.impressions,
    clicks: raw.clicks,
    conversions: raw.conversions,
    spend_cents: raw.spend_cents,
    revenue_cents: raw.revenue_cents,
    ctr,
    conversion_rate: conversionRate,
    cpa_cents: cpaCents,
    roas,
    budget_remaining_cents: budgetCents - raw.spend_cents,
    over_budget: raw.spend_cents > budgetCents,
  };
}

export async function listChannels(): Promise<ChannelRow[]> {
  const db = await getDatabase();
  return rowsFromStatement<ChannelRow>(db.prepare("SELECT * FROM channels ORDER BY id ASC"));
}

export async function getChannelById(id: number): Promise<ChannelRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM channels WHERE id = ?");
  statement.bind([id]);
  return rowsFromStatement<ChannelRow>(statement)[0] ?? null;
}

export async function getCampaignRowById(id: number): Promise<CampaignRow | null> {
  const db = await getDatabase();
  const statement = db.prepare("SELECT * FROM campaigns WHERE id = ?");
  statement.bind([id]);
  return rowsFromStatement<CampaignRow>(statement)[0] ?? null;
}

const DEFAULT_START_DATE = "0000-01-01";
const DEFAULT_END_DATE = "9999-12-31";

interface CampaignAnalyticsRow {
  id: number;
  name: string;
  status: CampaignStatus;
  budget_cents: number;
  starts_at: string;
  ends_at: string;
  created_at: string;
  updated_at: string;
  channel_id: number;
  channel_name: string;
  channel_slug: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
}

function toCampaignAnalytics(row: CampaignAnalyticsRow): CampaignAnalytics {
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    budget_cents: row.budget_cents,
    starts_at: row.starts_at,
    ends_at: row.ends_at,
    channel: { id: row.channel_id, name: row.channel_name, slug: row.channel_slug },
    metrics: computeMetrics(row, row.budget_cents),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const CAMPAIGN_ANALYTICS_SELECT = `
  SELECT
    c.id AS id, c.name AS name, c.status AS status, c.budget_cents AS budget_cents,
    c.starts_at AS starts_at, c.ends_at AS ends_at, c.created_at AS created_at, c.updated_at AS updated_at,
    ch.id AS channel_id, ch.name AS channel_name, ch.slug AS channel_slug,
    COALESCE(SUM(cm.impressions), 0) AS impressions,
    COALESCE(SUM(cm.clicks), 0) AS clicks,
    COALESCE(SUM(cm.conversions), 0) AS conversions,
    COALESCE(SUM(cm.spend_cents), 0) AS spend_cents,
    COALESCE(SUM(cm.revenue_cents), 0) AS revenue_cents
  FROM campaigns c
  JOIN channels ch ON c.channel_id = ch.id
  LEFT JOIN campaign_metrics cm
    ON cm.campaign_id = c.id AND cm.metric_date >= ? AND cm.metric_date <= ?
`;

const CAMPAIGN_ORDER_BY = `
  ORDER BY
    CASE c.status WHEN 'active' THEN 0 WHEN 'paused' THEN 1 WHEN 'draft' THEN 2 WHEN 'completed' THEN 3 ELSE 4 END,
    c.starts_at DESC,
    c.id ASC
`;

export interface CampaignFilters {
  status?: CampaignStatus;
  channelId?: number;
  startDate?: string;
  endDate?: string;
}

export async function listCampaignAnalytics(filters: CampaignFilters = {}): Promise<CampaignAnalytics[]> {
  const db = await getDatabase();
  const clauses: string[] = [];
  const params: Array<string | number> = [filters.startDate ?? DEFAULT_START_DATE, filters.endDate ?? DEFAULT_END_DATE];

  if (filters.status !== undefined) {
    clauses.push("c.status = ?");
    params.push(filters.status);
  }
  if (filters.channelId !== undefined) {
    clauses.push("c.channel_id = ?");
    params.push(filters.channelId);
  }

  const where = clauses.length > 0 ? ` WHERE ${clauses.join(" AND ")}` : "";
  const statement = db.prepare(
    `${CAMPAIGN_ANALYTICS_SELECT}${where} GROUP BY c.id ${CAMPAIGN_ORDER_BY}`,
  );
  statement.bind(params);
  return rowsFromStatement<CampaignAnalyticsRow>(statement).map(toCampaignAnalytics);
}

interface DailyMetricRow {
  id: number;
  campaign_id: number;
  metric_date: string;
  impressions: number;
  clicks: number;
  conversions: number;
  spend_cents: number;
  revenue_cents: number;
}

function toDailyMetric(row: DailyMetricRow): DailyMetric {
  const metrics = computeMetrics(row, 0);
  return {
    id: row.id,
    campaign_id: row.campaign_id,
    metric_date: row.metric_date,
    impressions: row.impressions,
    clicks: row.clicks,
    conversions: row.conversions,
    spend_cents: row.spend_cents,
    revenue_cents: row.revenue_cents,
    ctr: metrics.ctr,
    conversion_rate: metrics.conversion_rate,
    cpa_cents: metrics.cpa_cents,
    roas: metrics.roas,
  };
}

export async function getCampaignDetail(id: number, filters: CampaignFilters = {}): Promise<CampaignDetail | null> {
  const db = await getDatabase();
  const startDate = filters.startDate ?? DEFAULT_START_DATE;
  const endDate = filters.endDate ?? DEFAULT_END_DATE;

  const analyticsStatement = db.prepare(`${CAMPAIGN_ANALYTICS_SELECT} WHERE c.id = ? GROUP BY c.id`);
  analyticsStatement.bind([startDate, endDate, id]);
  const analyticsRow = rowsFromStatement<CampaignAnalyticsRow>(analyticsStatement)[0];
  if (!analyticsRow) return null;

  const metricsStatement = db.prepare(`
    SELECT id, campaign_id, metric_date, impressions, clicks, conversions, spend_cents, revenue_cents
    FROM campaign_metrics
    WHERE campaign_id = ? AND metric_date >= ? AND metric_date <= ?
    ORDER BY metric_date ASC, id ASC
  `);
  metricsStatement.bind([id, startDate, endDate]);
  const dailyMetrics = rowsFromStatement<DailyMetricRow>(metricsStatement).map(toDailyMetric);

  return { campaign: toCampaignAnalytics(analyticsRow), daily_metrics: dailyMetrics };
}

export async function getSummaryMetrics(filters: CampaignFilters = {}): Promise<SummaryMetrics> {
  const campaigns = await listCampaignAnalytics(filters);

  const summary: SummaryMetrics = {
    total_campaigns: campaigns.length,
    active: 0,
    paused: 0,
    draft: 0,
    completed: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    spend_cents: 0,
    revenue_cents: 0,
    ctr: 0,
    conversion_rate: 0,
    cpa_cents: 0,
    roas: 0,
    over_budget: 0,
  };

  for (const status of CAMPAIGN_STATUSES) summary[status] = 0;

  for (const campaign of campaigns) {
    summary[campaign.status] += 1;
    summary.impressions += campaign.metrics.impressions;
    summary.clicks += campaign.metrics.clicks;
    summary.conversions += campaign.metrics.conversions;
    summary.spend_cents += campaign.metrics.spend_cents;
    summary.revenue_cents += campaign.metrics.revenue_cents;
    if (campaign.metrics.over_budget) summary.over_budget += 1;
  }

  summary.ctr = summary.impressions === 0 ? 0 : round4(summary.clicks / summary.impressions);
  summary.conversion_rate = summary.clicks === 0 ? 0 : round4(summary.conversions / summary.clicks);
  summary.cpa_cents = summary.conversions === 0 ? 0 : Math.round(summary.spend_cents / summary.conversions);
  summary.roas = summary.spend_cents === 0 ? 0 : round4(summary.revenue_cents / summary.spend_cents);

  return summary;
}

export async function updateCampaign(input: {
  id: number;
  budget_cents?: number;
  status?: CampaignStatus;
  updated_at: string;
}): Promise<CampaignDetail | null> {
  const db = await getDatabase();
  const sets: string[] = [];
  const params: Array<string | number> = [];

  if (input.budget_cents !== undefined) {
    sets.push("budget_cents = ?");
    params.push(input.budget_cents);
  }
  if (input.status !== undefined) {
    sets.push("status = ?");
    params.push(input.status);
  }
  sets.push("updated_at = ?");
  params.push(input.updated_at);
  params.push(input.id);

  db.run(`UPDATE campaigns SET ${sets.join(", ")} WHERE id = ?`, params);
  return getCampaignDetail(input.id);
}
