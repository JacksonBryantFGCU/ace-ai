import { useEffect, useState } from "react";
import { fetchCampaignOptions, fetchCampaigns } from "./api";
import type { Campaign } from "./types";
import "./styles.css";

function formatCents(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function formatPercent(ratio: number) {
  return `${(ratio * 100).toFixed(2)}%`;
}

export function App() {
  // TODO (Step 1): track campaigns, loading, and error state, and fetch
  // campaigns and campaign options on mount (see fetchCampaigns and
  // fetchCampaignOptions in ./api). Also track the selected campaign id and
  // fetch its detail (fetchCampaignDetail) when it changes.

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Marketing</p>
        <h1>Analytics Campaign Dashboard</h1>
      </header>

      {/* TODO (Step 2): render a summary KPI panel (aria-label="Campaign summary")
          using fetchSummary. */}

      {/* TODO (Step 2): render status/channel/start date/end date filter
          controls (aria-label="Campaign filters") that refetch campaigns
          when changed. */}

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"),
          and empty states here. */}

      <section className="layout">
        <div className="campaign-list" aria-label="Campaigns">
          {/* TODO (Step 1): render one card per campaign (a <button> with
              aria-label naming the campaign), showing name, channel, status,
              and key derived metrics (ctr, conversion_rate, roas) from the
              backend response — never compute them in the frontend. */}
        </div>

        <div className="campaign-detail" aria-label="Campaign details">
          {/* TODO (Step 1): render the selected campaign's derived KPIs and
              its daily metrics (date, impressions, clicks, conversions,
              spend, revenue). */}

          {/* TODO (Step 3): add budget and status update controls here,
              display backend validation errors, and update the
              campaign/detail/summary from the saved response. */}
        </div>
      </section>
    </main>
  );
}

export default App;
