import type { Campaign, CampaignDetail, CampaignStatus, Channel, SummaryMetrics } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4340";

interface CampaignsResponse {
  campaigns: Campaign[];
}

interface CampaignOptionsResponse {
  channels: Channel[];
}

interface SummaryResponse {
  summary: SummaryMetrics;
}

interface CampaignUpdateResponse {
  campaign: Campaign;
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export interface CampaignFilters {
  status?: CampaignStatus | "all";
  channelId?: number | "all";
  startDate?: string;
  endDate?: string;
}

function queryParams(filters: CampaignFilters): string {
  const params = new URLSearchParams();
  if (filters.status !== undefined && filters.status !== "all") params.set("status", filters.status);
  if (filters.channelId !== undefined && filters.channelId !== "all")
    params.set("channel_id", String(filters.channelId));
  if (filters.startDate) params.set("start_date", filters.startDate);
  if (filters.endDate) params.set("end_date", filters.endDate);
  const suffix = params.toString();
  return suffix ? `?${suffix}` : "";
}

export async function fetchCampaigns(filters: CampaignFilters = {}): Promise<Campaign[]> {
  const data = await parseJson<CampaignsResponse>(await fetch(`${API_BASE_URL}/campaigns${queryParams(filters)}`));
  return data.campaigns;
}

export async function fetchCampaignDetail(
  id: number,
  filters: Pick<CampaignFilters, "startDate" | "endDate"> = {},
): Promise<CampaignDetail> {
  return parseJson<CampaignDetail>(await fetch(`${API_BASE_URL}/campaigns/${id}${queryParams(filters)}`));
}

export async function fetchCampaignOptions(): Promise<CampaignOptionsResponse> {
  return parseJson<CampaignOptionsResponse>(await fetch(`${API_BASE_URL}/campaign-options`));
}

export async function fetchSummary(filters: CampaignFilters = {}): Promise<SummaryMetrics> {
  const data = await parseJson<SummaryResponse>(
    await fetch(`${API_BASE_URL}/campaigns/summary${queryParams(filters)}`),
  );
  return data.summary;
}

export async function updateCampaign(
  id: number,
  payload: { budget_cents?: number; status?: CampaignStatus },
): Promise<Campaign> {
  const data = await parseJson<CampaignUpdateResponse>(
    await fetch(`${API_BASE_URL}/campaigns/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.campaign;
}
