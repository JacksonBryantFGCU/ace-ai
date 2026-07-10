import { useEffect, useState } from "react";
import { fetchCampaignDetail, fetchCampaignOptions, fetchCampaigns } from "./api";
import type { Campaign, CampaignDetail } from "./types";
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
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchCampaigns()
      .then((data) => {
        if (cancelled) return;
        setCampaigns(data);
        if (data.length > 0) setSelectedId(data[0]!.id);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    fetchCampaignOptions().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    fetchCampaignDetail(selectedId)
      .then((data) => {
        if (!cancelled) setDetail(data);
      })
      .catch((err: Error) => {
        if (!cancelled) setDetailError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Marketing</p>
        <h1>Analytics Campaign Dashboard</h1>
      </header>

      {loading ? <p role="status">Loading campaigns...</p> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {!loading && !error && campaigns.length === 0 ? <p>No campaigns yet.</p> : null}

      <section className="layout">
        <div className="campaign-list" aria-label="Campaigns">
          {campaigns.map((campaign) => (
            <button
              key={campaign.id}
              type="button"
              className={campaign.id === selectedId ? "campaign-card selected" : "campaign-card"}
              aria-label={`Campaign ${campaign.name}`}
              onClick={() => setSelectedId(campaign.id)}
            >
              <h3>{campaign.name}</h3>
              <p className="campaign-meta">{`${campaign.channel.name} · CTR ${formatPercent(campaign.metrics.ctr)} · ROAS ${campaign.metrics.roas.toFixed(2)}`}</p>
              <div className="badge-row">
                <span className={`badge status-${campaign.status}`}>{statusLabel(campaign.status)}</span>
                {campaign.metrics.over_budget ? <span className="badge badge-over-budget">Over budget</span> : null}
              </div>
            </button>
          ))}
        </div>

        <div className="campaign-detail" aria-label="Campaign details">
          {detailError ? (
            <p role="alert" className="error">
              {detailError}
            </p>
          ) : null}
          {!detail ? <p className="muted">Select a campaign to view its details.</p> : null}
          {detail ? (
            <>
              <h2>{detail.campaign.name}</h2>
              <p className="muted">{`${detail.campaign.channel.name} · Budget ${formatCents(detail.campaign.budget_cents)}`}</p>

              <div className="kpi-grid">
                <div className="kpi-tile">
                  <strong>{detail.campaign.metrics.impressions}</strong>
                  Impressions
                </div>
                <div className="kpi-tile">
                  <strong>{detail.campaign.metrics.clicks}</strong>
                  Clicks
                </div>
                <div className="kpi-tile">
                  <strong>{detail.campaign.metrics.conversions}</strong>
                  Conversions
                </div>
                <div className="kpi-tile">
                  <strong>{formatPercent(detail.campaign.metrics.ctr)}</strong>
                  CTR
                </div>
                <div className="kpi-tile">
                  <strong>{formatPercent(detail.campaign.metrics.conversion_rate)}</strong>
                  Conversion rate
                </div>
                <div className="kpi-tile">
                  <strong>{formatCents(detail.campaign.metrics.cpa_cents)}</strong>
                  CPA
                </div>
                <div className="kpi-tile">
                  <strong>{detail.campaign.metrics.roas.toFixed(2)}</strong>
                  ROAS
                </div>
                <div className="kpi-tile">
                  <strong>{formatCents(detail.campaign.metrics.budget_remaining_cents)}</strong>
                  Budget remaining
                </div>
              </div>

              <div className="daily-metrics">
                {detail.daily_metrics.map((metric) => (
                  <div className="daily-metric-row" key={metric.id}>
                    <span>{metric.metric_date}</span>
                    <span>{`${metric.impressions} impr · ${metric.clicks} clicks · ${metric.conversions} conv`}</span>
                    <span>{`${formatCents(metric.spend_cents)} spend / ${formatCents(metric.revenue_cents)} rev`}</span>
                  </div>
                ))}
                {detail.daily_metrics.length === 0 ? <p className="muted">No daily metrics for this campaign.</p> : null}
              </div>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default App;
