export type CampaignStatus = "draft" | "active" | "paused" | "completed";

export interface Channel {
  id: number;
  name: string;
  slug: string;
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

export interface Campaign {
  id: number;
  name: string;
  status: CampaignStatus;
  budget_cents: number;
  starts_at: string;
  ends_at: string;
  channel: Channel;
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
  campaign: Campaign;
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
