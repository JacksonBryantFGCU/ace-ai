export type ApplicationStatus = "draft" | "applied" | "interviewing" | "offer" | "rejected";
export type ApplicationSource = "company_site" | "linkedin" | "referral" | "other";

export interface Application {
  id: number;
  company: string;
  role: string;
  location: string;
  status: ApplicationStatus;
  source: ApplicationSource;
  notes: string | null;
  applied_at: string;
  updated_at: string;
}

export type ApplicationSummary = Record<ApplicationStatus, number> & { total: number };
