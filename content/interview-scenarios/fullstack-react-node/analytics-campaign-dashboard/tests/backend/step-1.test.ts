import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { Server } from "node:http";
import app from "../../src/app";
import { resetDatabase } from "../../src/db";

let server: Server;
let baseUrl: string;

async function request(path: string, init?: RequestInit) {
  return fetch(`${baseUrl}${path}`, init);
}

beforeEach(async () => {
  await resetDatabase();
  await new Promise<void>((resolve) => {
    server = app.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") throw new Error("Expected TCP test server");
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

afterEach(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

describe("backend step 1", () => {
  it("returns campaigns with channel and aggregated metrics in default order", async () => {
    const response = await request("/campaigns");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.campaigns).toHaveLength(8);
    expect(body.campaigns.map((c: { id: number }) => c.id)).toEqual([1, 5, 2, 7, 8, 3, 6, 4]);

    const spring = body.campaigns[0];
    expect(spring).toMatchObject({
      id: 1,
      name: "Spring Launch",
      status: "active",
      budget_cents: 250000,
      channel: { id: 1, name: "Search", slug: "search" },
      metrics: {
        impressions: 12000,
        clicks: 840,
        conversions: 72,
        spend_cents: 95000,
        revenue_cents: 210000,
        ctr: 0.07,
        conversion_rate: 0.0857,
        cpa_cents: 1319,
        roas: 2.2105,
        budget_remaining_cents: 155000,
        over_budget: false,
      },
    });
  });

  it("returns zero metrics for a campaign with no metric rows", async () => {
    const response = await request("/campaigns");
    const body = await response.json();
    const newsletter = body.campaigns.find((c: { id: number }) => c.id === 3);

    expect(newsletter).toMatchObject({
      id: 3,
      metrics: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        spend_cents: 0,
        revenue_cents: 0,
        ctr: 0,
        conversion_rate: 0,
        cpa_cents: 0,
        roas: 0,
        budget_remaining_cents: 50000,
        over_budget: false,
      },
    });
  });

  it("flags an over-budget campaign", async () => {
    const response = await request("/campaigns");
    const body = await response.json();
    const retargeting = body.campaigns.find((c: { id: number }) => c.id === 2);

    expect(retargeting.metrics.spend_cents).toBe(85000);
    expect(retargeting.metrics.over_budget).toBe(true);
    expect(retargeting.metrics.budget_remaining_cents).toBe(-5000);
  });

  it("returns campaign detail with ordered daily metrics", async () => {
    const response = await request("/campaigns/1");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.campaign).toMatchObject({ id: 1, name: "Spring Launch" });
    expect(body.daily_metrics).toHaveLength(3);
    expect(body.daily_metrics.map((m: { metric_date: string }) => m.metric_date)).toEqual([
      "2025-02-01",
      "2025-02-02",
      "2025-02-03",
    ]);
    expect(body.daily_metrics[0]).toMatchObject({
      metric_date: "2025-02-01",
      impressions: 4000,
      clicks: 280,
      conversions: 24,
      spend_cents: 30000,
      revenue_cents: 70000,
      ctr: 0.07,
      conversion_rate: 0.0857,
      cpa_cents: 1250,
      roas: 2.3333,
    });
  });

  it("applies zero-denominator rules on a daily metric with zero clicks", async () => {
    const response = await request("/campaigns/7");
    const body = await response.json();
    const zeroClickDay = body.daily_metrics.find((m: { metric_date: string }) => m.metric_date === "2025-01-10");

    expect(zeroClickDay).toMatchObject({
      impressions: 2000,
      clicks: 0,
      conversions: 0,
      ctr: 0,
      conversion_rate: 0,
      cpa_cents: 0,
    });
  });

  it("returns 400 for an invalid campaign id and 404 for a missing campaign", async () => {
    const invalid = await request("/campaigns/not-a-number");
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid campaign id");

    const missing = await request("/campaigns/9999");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Campaign not found");
  });

  it("returns every channel from campaign-options", async () => {
    const response = await request("/campaign-options");
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.channels).toHaveLength(4);
    expect(body.channels.map((c: { id: number }) => c.id)).toEqual([1, 2, 3, 4]);
  });
});
