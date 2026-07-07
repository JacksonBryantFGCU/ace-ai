export type PlanType = "starter" | "team" | "enterprise";

export interface FormData {
  fullName: string;
  email: string;
  companyName: string;
  teamSize: string;
  planType: PlanType | "";
  billingEmail: string;
}
