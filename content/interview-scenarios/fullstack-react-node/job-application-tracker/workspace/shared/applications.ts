export const APPLICATION_STATUSES = ["draft", "applied", "interviewing", "offer", "rejected"] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_SOURCES = ["company_site", "linkedin", "referral", "other"] as const;

export type ApplicationSource = (typeof APPLICATION_SOURCES)[number];
