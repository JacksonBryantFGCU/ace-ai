export type PlanTier = "starter" | "pro" | "business";
export type SubscriptionStatus = "active" | "past_due" | "cancelled";
export type BillingCycle = "monthly" | "annual";

export interface Customer {
  id: number;
  name: string;
  email: string;
}

export interface Plan {
  id: number;
  name: string;
  tier: PlanTier;
  price_cents: number;
  seats_included: number;
}

export interface Subscription {
  id: number;
  status: SubscriptionStatus;
  billing_cycle: BillingCycle;
  seats: number;
  cancel_at_period_end: boolean;
  current_period_end: string;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionPayload {
  customer: Customer;
  subscription: Subscription;
  plan: Plan;
}
