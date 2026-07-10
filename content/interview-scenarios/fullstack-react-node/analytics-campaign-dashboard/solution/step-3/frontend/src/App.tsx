import { FormEvent, useEffect, useState } from "react";
import { fetchCampaignDetail, fetchCampaignOptions, fetchCampaigns, fetchSummary, updateCampaign } from "./api";
import type { Campaign, CampaignDetail, CampaignStatus, Channel, SummaryMetrics } from "./types";
import "./styles.css";

const STATUS_OPTIONS: CampaignStatus[] = ["draft", "active", "paused", "completed"];

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

  const [channels, setChannels] = useState<Channel[]>([]);
  const [summary, setSummary] = useState<SummaryMetrics | null>(null);

  const [statusFilter, setStatusFilter] = useState<CampaignStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState<number | "all">("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [filterError, setFilterError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<CampaignDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [budgetDraft, setBudgetDraft] = useState("");
  const [statusDraft, setStatusDraft] = useState<CampaignStatus | "">("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  function currentFilters() {
    return { status: statusFilter, channelId: channelFilter, startDate: startDate || undefined, endDate: endDate || undefined };
  }

  function loadSummary() {
    return fetchSummary(currentFilters())
      .then((next) => {
        setSummary(next);
        setFilterError(null);
      })
      .catch((err: Error) => {
        setSummary(null);
        setFilterError(err.message);
      });
  }

  function loadCampaigns() {
    setLoading(true);
    setError(null);
    return fetchCampaigns(currentFilters())
      .then((data) => {
        setCampaigns(data);
        if (data.length > 0 && !data.some((campaign) => campaign.id === selectedId)) {
          setSelectedId(data[0]!.id);
        } else if (data.length === 0) {
          setSelectedId(null);
        }
      })
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    fetchCampaignOptions()
      .then((data) => setChannels(data.channels))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    loadCampaigns();
    loadSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, channelFilter, startDate, endDate]);

  useEffect(() => {
    if (selectedId === null) {
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailError(null);
    setUpdateError(null);
    fetchCampaignDetail(selectedId, { startDate: startDate || undefined, endDate: endDate || undefined })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setBudgetDraft(String(data.campaign.budget_cents));
        setStatusDraft(data.campaign.status);
      })
      .catch((err: Error) => {
        if (!cancelled) setDetailError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId, startDate, endDate]);

  function applyUpdatedCampaign(updated: Campaign) {
    setCampaigns((current) => current.map((campaign) => (campaign.id === updated.id ? updated : campaign)));
    setDetail((current) => (current ? { ...current, campaign: updated } : current));
    setBudgetDraft(String(updated.budget_cents));
    setStatusDraft(updated.status);
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const payload: { budget_cents?: number; status?: CampaignStatus } = {};
      const budgetValue = Number(budgetDraft);
      if (budgetValue !== detail.campaign.budget_cents) payload.budget_cents = budgetValue;
      if (statusDraft && statusDraft !== detail.campaign.status) payload.status = statusDraft;

      const updated = await updateCampaign(detail.campaign.id, payload);
      applyUpdatedCampaign(updated);
      await loadSummary();
    } catch (err) {
      setUpdateError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Marketing</p>
        <h1>Analytics Campaign Dashboard</h1>
      </header>

      {summary ? (
        <section className="summary-panel" aria-label="Campaign summary">
          <span>{`Total ${summary.total_campaigns}`}</span>
          <span>{`Active ${summary.active}`}</span>
          <span>{`Paused ${summary.paused}`}</span>
          <span>{`Draft ${summary.draft}`}</span>
          <span>{`Completed ${summary.completed}`}</span>
          <span>{`CTR ${formatPercent(summary.ctr)}`}</span>
          <span>{`Conversion rate ${formatPercent(summary.conversion_rate)}`}</span>
          <span>{`ROAS ${summary.roas.toFixed(2)}`}</span>
          <span>{`Over budget ${summary.over_budget}`}</span>
        </section>
      ) : null}

      <section className="toolbar" aria-label="Campaign filters">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value === "all" ? "all" : (event.target.value as CampaignStatus))}
        >
          <option value="all">All</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>

        <label htmlFor="channel-filter">Channel</label>
        <select
          id="channel-filter"
          value={channelFilter}
          onChange={(event) => setChannelFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">All</option>
          {channels.map((channel) => (
            <option key={channel.id} value={channel.id}>
              {channel.name}
            </option>
          ))}
        </select>

        <label htmlFor="start-date">Start date</label>
        <input id="start-date" type="text" placeholder="YYYY-MM-DD" value={startDate} onChange={(event) => setStartDate(event.target.value)} />

        <label htmlFor="end-date">End date</label>
        <input id="end-date" type="text" placeholder="YYYY-MM-DD" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
      </section>

      {filterError ? (
        <p role="alert" className="error">
          {filterError}
        </p>
      ) : null}
      {loading ? <p role="status">Loading campaigns...</p> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}
      {!loading && !error && campaigns.length === 0 ? <p>No campaigns match these filters.</p> : null}

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

              <form onSubmit={handleUpdateSubmit} className="update-form" aria-label="Update campaign">
                <div className="field-row">
                  <div className="field">
                    <label htmlFor="budget-input">Budget (cents)</label>
                    <input
                      id="budget-input"
                      type="number"
                      min={0}
                      value={budgetDraft}
                      onChange={(event) => setBudgetDraft(event.target.value)}
                      disabled={detail.campaign.status === "completed"}
                    />
                  </div>

                  <div className="field">
                    <label htmlFor="status-input">Campaign status</label>
                    <select
                      id="status-input"
                      value={statusDraft}
                      onChange={(event) => setStatusDraft(event.target.value as CampaignStatus)}
                      disabled={detail.campaign.status === "completed"}
                    >
                      {STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>
                          {statusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {updateError ? (
                  <p role="alert" className="error">
                    {updateError}
                  </p>
                ) : null}

                <button type="submit" disabled={updating || detail.campaign.status === "completed"}>
                  {updating ? "Saving..." : "Save changes"}
                </button>
              </form>
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}

export default App;
