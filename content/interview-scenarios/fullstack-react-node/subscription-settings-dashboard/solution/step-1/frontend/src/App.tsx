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
  const [payload, setPayload] = useState<SubscriptionPayload | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchSubscription(), fetchPlans()])
      .then(([subscriptionPayload, planList]) => {
        if (cancelled) return;
        setPayload(subscriptionPayload);
        setPlans(planList);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Account</p>
        <h1>Subscription Settings Dashboard</h1>
      </header>

      {loading ? <p role="status">Loading subscription...</p> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      {payload ? (
        <>
          <section className="customer-card" aria-label="Customer">
            <h2>{payload.customer.name}</h2>
            <p className="card-meta">{payload.customer.email}</p>
          </section>

          <section className="plan-card" aria-label="Current subscription">
            <div className="plan-card-header">
              <div>
                <h2>{payload.plan.name}</h2>
                <p className="card-meta">
                  {statusLabel(payload.plan.tier)} plan &middot; {formatMoney(payload.plan.price_cents)}/
                  {payload.subscription.billing_cycle === "monthly" ? "mo" : "yr"}
                </p>
              </div>
              <span className={`status status-${payload.subscription.status}`}>
                {statusLabel(payload.subscription.status)}
              </span>
            </div>
            <p className="card-meta">
              {statusLabel(payload.subscription.billing_cycle)} billing &middot; {payload.subscription.seats} seats
            </p>
            <p className="card-meta">Renews {formatDate(payload.subscription.current_period_end)}</p>
          </section>

          <section className="plans-panel" aria-label="Available plans">
            <h2>Available Plans</h2>
            {plans.map((plan) => (
              <div className="plan-option" key={plan.id}>
                <div>
                  <strong>{plan.name}</strong>
                  <p className="card-meta">
                    {statusLabel(plan.tier)} &middot; {formatMoney(plan.price_cents)}/mo &middot; {plan.seats_included}{" "}
                    seats included
                  </p>
                </div>
              </div>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}

export default App;
