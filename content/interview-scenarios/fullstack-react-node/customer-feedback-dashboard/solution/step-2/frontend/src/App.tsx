import { useEffect, useMemo, useState } from "react";
import { fetchFeedback } from "./api";
import type { FeedbackItem, FeedbackStatus } from "./types";
import "./styles.css";

const STATUS_OPTIONS: Array<FeedbackStatus | "all"> = ["all", "new", "reviewing", "resolved"];

function statusLabel(status: FeedbackStatus | "all") {
  return status === "all" ? "All" : status[0]!.toUpperCase() + status.slice(1);
}

export function App() {
  const [filter, setFilter] = useState<FeedbackStatus | "all">("all");
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchFeedback(filter)
      .then((items) => {
        if (cancelled) return;
        setFeedback(items);
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
  }, [filter]);

  const counts = useMemo(() => {
    return feedback.reduce<Record<FeedbackStatus, number>>(
      (acc, item) => {
        acc[item.status] += 1;
        return acc;
      },
      { new: 0, reviewing: 0, resolved: 0 },
    );
  }, [feedback]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <div>
          <p className="eyebrow">Customer Success</p>
          <h1>Customer Feedback Dashboard</h1>
        </div>
        <div className="summary" aria-label="Visible feedback summary">
          <span>New {counts.new}</span>
          <span>Reviewing {counts.reviewing}</span>
          <span>Resolved {counts.resolved}</span>
        </div>
      </header>

      <section className="toolbar" aria-label="Feedback filters">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value as FeedbackStatus | "all")}
        >
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p role="status">Loading feedback...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && feedback.length === 0 ? <p>No feedback matches this filter.</p> : null}

      <section className="feedback-list" aria-label="Feedback items">
        {feedback.map((item) => (
          <article className="feedback-card" key={item.id}>
            <div className="card-header">
              <div>
                <h2>{item.customer_name}</h2>
                <p>{item.message}</p>
              </div>
              <span className={`status status-${item.status}`}>{statusLabel(item.status)}</span>
            </div>

            {item.response ? <p className="response">Response: {item.response}</p> : <p className="muted">No response yet.</p>}
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
