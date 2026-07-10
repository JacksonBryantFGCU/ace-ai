import { useEffect, useState } from "react";
import { fetchPlans, fetchSubscription } from "./api";
import type { Plan, SubscriptionPayload } from "./types";
import "./styles.css";

function statusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

function formatMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function App() {
  // TODO (Step 1): track the subscription payload (customer/subscription/plan),
  // the active plans list, loading, and error state, and fetch both from the
  // backend on mount (see fetchSubscription and fetchPlans in ./api).

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Account</p>
        <h1>Subscription Settings Dashboard</h1>
      </header>

      {/* TODO (Step 1): render loading (role="status") and error (role="alert")
          states here. */}

      {/* TODO (Step 1): render a customer info section
          (<section aria-label="Customer">) and a current plan/status section
          (<section aria-label="Current subscription">) showing plan name,
          tier, price, status (use statusLabel above), billing cycle, seats,
          and current_period_end (use formatDate above). */}

      {/* TODO (Step 1): render an available plans section
          (<section aria-label="Available plans">) listing each active plan's
          name, tier, price (use formatMoney above), and seats included. */}

      {/* TODO (Step 2): add a plan/billing-cycle/seats update form
          (<form aria-label="Update subscription">) with an update action and
          backend validation error display. */}

      {/* TODO (Step 3): add cancel/reactivate actions
          (<section aria-label="Cancellation">) and a scheduled-cancellation
          indicator, with backend validation error display. */}
    </main>
  );
}

export default App;
