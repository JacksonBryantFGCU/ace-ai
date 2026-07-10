import type { BillingCycle, Plan, SubscriptionPayload } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface PlansResponse {
  plans: Plan[];
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export async function fetchSubscription(): Promise<SubscriptionPayload> {
  return parseJson<SubscriptionPayload>(await fetch(`${API_BASE_URL}/subscription`));
}

export async function fetchPlans(): Promise<Plan[]> {
  const data = await parseJson<PlansResponse>(await fetch(`${API_BASE_URL}/plans`));
  return data.plans;
}

export async function updateSubscription(payload: {
  plan_id: number;
  billing_cycle: BillingCycle;
  seats: number;
}): Promise<SubscriptionPayload> {
  return parseJson<SubscriptionPayload>(
    await fetch(`${API_BASE_URL}/subscription`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function cancelSubscription(): Promise<SubscriptionPayload> {
  return parseJson<SubscriptionPayload>(
    await fetch(`${API_BASE_URL}/subscription/cancel`, { method: "POST" }),
  );
}

export async function reactivateSubscription(): Promise<SubscriptionPayload> {
  return parseJson<SubscriptionPayload>(
    await fetch(`${API_BASE_URL}/subscription/reactivate`, { method: "POST" }),
  );
}
