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

describe("backend step 2 filters", () => {
  it("filters by status", async () => {
    const response = await request("/campaigns?status=active");
    const body = await response.json();
    expect(body.campaigns.map((c: { id: number }) => c.id)).toEqual([1, 5]);
  });

  it("rejects an invalid status filter", async () => {
    const response = await request("/campaigns?status=archived");
    expect(response.status).toBe(400);
    expect((await response.json()).error).toBe("Invalid campaign status");
  });

  it("filters by channel_id and validates it", async () => {
    const response = await request("/campaigns?channel_id=1");
    const body = await response.json();
    expect(body.campaigns.map((c: { id: number }) => c.id)).toEqual([1, 5]);

    const invalid = await request("/campaigns?channel_id=abc");
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).error).toBe("Invalid channel id");

    const missing = await request("/campaigns?channel_id=9999");
    expect(missing.status).toBe(404);
    expect((await missing.json()).error).toBe("Channel not found");
  });

  it("combines status and channel filters", async () => {
    const response = await request("/campaigns?status=paused&channel_id=3");
    const body = await response.json();
    expect(body.campaigns.map((c: { id: number }) => c.id)).toEqual([2]);
  });

  it("validates date filters and their range", async () => {
    const badStart = await request("/campaigns?start_date=not-a-date");
    expect(badStart.status).toBe(400);
    expect((await badStart.json()).error).toBe("Invalid start date");

    const badEnd = await request("/campaigns?end_date=2025-13-40");
    expect(badEnd.status).toBe(400);
    expect((await badEnd.json()).error).toBe("Invalid end date");

    const badRange = await request("/campaigns?start_date=2025-03-01&end_date=2025-01-01");
    expect(badRange.status).toBe(400);
    expect((await badRange.json()).error).toBe("Invalid date range");
  });

  it("keeps campaigns visible with zero metrics when no metrics fall in the date range", async () => {
    const response = await request("/campaigns?start_date=2025-05-01&end_date=2025-05-31");
    const body = await response.json();
    expect(body.campaigns).toHaveLength(8);
    const spring = body.campaigns.find((c: { id: number }) => c.id === 1);
    expect(spring.metrics.impressions).toBe(0);
  });

  it("recomputes campaign detail metrics for a filtered date range", async () => {
    const response = await request("/campaigns/1?start_date=2025-02-01&end_date=2025-02-02");
    const body = await response.json();
    expect(body.daily_metrics).toHaveLength(2);
    expect(body.campaign.metrics).toMatchObject({
      impressions: 8000,
      clicks: 560,
      conversions: 48,
      spend_cents: 60000,
      revenue_cents: 140000,
    });
  });
});

describe("backend step 2 summary", () => {
  it("returns aggregate KPIs across every campaign", async () => {
    const response = await request("/campaigns/summary");
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.summary).toEqual({
      total_campaigns: 8,
      active: 2,
      paused: 2,
      draft: 2,
      completed: 2,
      impressions: 43800,
      clicks: 2790,
      conversions: 246,
      spend_cents: 462000,
      revenue_cents: 968000,
      ctr: 0.0637,
      conversion_rate: 0.0882,
      cpa_cents: 1878,
      roas: 2.0952,
      over_budget: 2,
    });
  });

  it("returns filtered aggregate KPIs", async () => {
    const response = await request("/campaigns/summary?status=completed");
    const body = await response.json();
    expect(body.summary).toEqual({
      total_campaigns: 2,
      active: 0,
      paused: 0,
      draft: 0,
      completed: 2,
      impressions: 17000,
      clicks: 1350,
      conversions: 135,
      spend_cents: 220000,
      revenue_cents: 540000,
      ctr: 0.0794,
      conversion_rate: 0.1,
      cpa_cents: 1630,
      roas: 2.4545,
      over_budget: 1,
    });
  });
});
