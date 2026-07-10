export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed"] as const;
export type CampaignStatus = (typeof CAMPAIGN_STATUSES)[number];

/** Allowed forward/backward status transitions. Anything not listed (including a no-op) is invalid. */
export const CAMPAIGN_STATUS_TRANSITIONS: Record<CampaignStatus, CampaignStatus[]> = {
  draft: ["active", "paused"],
  active: ["paused", "completed"],
  paused: ["active", "completed"],
  completed: [],
};
