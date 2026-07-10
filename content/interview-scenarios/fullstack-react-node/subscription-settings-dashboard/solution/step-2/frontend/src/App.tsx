import { FormEvent, useEffect, useState } from "react";
import { fetchPlans, fetchSubscription, updateSubscription } from "./api";
import type { BillingCycle, Plan, SubscriptionPayload } from "./types";
import "./styles.css";

const BILLING_CYCLE_OPTIONS: BillingCycle[] = ["monthly", "annual"];

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

  const [planId, setPlanId] = useState<number | null>(null);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>("monthly");
  const [seats, setSeats] = useState(1);
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchSubscription(), fetchPlans()])
      .then(([subscriptionPayload, planList]) => {
        if (cancelled) return;
        setPayload(subscriptionPayload);
        setPlans(planList);
        setPlanId(subscriptionPayload.plan.id);
        setBillingCycle(subscriptionPayload.subscription.billing_cycle);
        setSeats(subscriptionPayload.subscription.seats);
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

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (planId === null) return;
    setUpdating(true);
    setUpdateError(null);
    try {
      const updated = await updateSubscription({ plan_id: planId, billing_cycle: billingCycle, seats });
      setPayload(updated);
      setPlanId(updated.plan.id);
      setBillingCycle(updated.subscription.billing_cycle);
      setSeats(updated.subscription.seats);
    } catch (err) {
      setUpdateError((err as Error).message);
    } finally {
      setUpdating(false);
    }
  }

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

          {payload.subscription.status === "cancelled" ? (
            <section className="update-form" aria-label="Update subscription">
              <p className="muted">Cancelled subscriptions cannot be changed.</p>
            </section>
          ) : (
            <form className="update-form" aria-label="Update subscription" onSubmit={handleUpdateSubmit}>
              <h2>Update Subscription</h2>

              {payload.subscription.status === "past_due" ? (
                <p className="muted">Past due subscriptions cannot change plans.</p>
              ) : (
                <fieldset className="plan-options">
                  <legend>Plan</legend>
                  {plans.map((plan) => (
                    <label className="plan-option" htmlFor={`plan-${plan.id}`} key={plan.id}>
                      <input
                        type="radio"
                        id={`plan-${plan.id}`}
                        name="plan"
                        value={plan.id}
                        checked={planId === plan.id}
                        onChange={() => setPlanId(plan.id)}
                      />
                      {`Select ${plan.name} plan`}
                    </label>
                  ))}
                </fieldset>
              )}

              <div className="field">
                <label htmlFor="billing-cycle">Billing cycle</label>
                <select
                  id="billing-cycle"
                  value={billingCycle}
                  onChange={(event) => setBillingCycle(event.target.value as BillingCycle)}
                >
                  {BILLING_CYCLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {statusLabel(option)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="seats">Seats</label>
                <input
                  id="seats"
                  type="number"
                  min={1}
                  max={100}
                  value={seats}
                  onChange={(event) => setSeats(Number(event.target.value))}
                />
              </div>

              {updateError ? (
                <p role="alert" className="error">
                  {updateError}
                </p>
              ) : null}

              <button type="submit" disabled={updating}>
                {updating ? "Saving..." : "Save changes"}
              </button>
            </form>
          )}
        </>
      ) : null}
    </main>
  );
}

export default App;
