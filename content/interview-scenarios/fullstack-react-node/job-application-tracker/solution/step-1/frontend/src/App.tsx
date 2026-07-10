import { useEffect, useState } from "react";
import { fetchApplications } from "./api";
import type { Application } from "./types";
import "./styles.css";

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function sourceLabel(source: string) {
  return source
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

export function App() {
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApplications()
      .then((items) => {
        if (cancelled) return;
        setApplications(items);
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
        <p className="eyebrow">Job Search</p>
        <h1>Job Application Tracker</h1>
      </header>

      {loading ? <p role="status">Loading applications...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && applications.length === 0 ? <p>No applications yet.</p> : null}

      <section className="application-list" aria-label="Applications">
        {applications.map((application) => (
          <article className="application-card" key={application.id}>
            <div className="card-header">
              <div>
                <h2>{application.company}</h2>
                <p className="role">{application.role}</p>
              </div>
              <span className={`status status-${application.status}`}>{statusLabel(application.status)}</span>
            </div>

            <p className="card-meta">
              {application.location} &middot; {sourceLabel(application.source)}
            </p>

            {application.notes ? (
              <p className="notes-display">{application.notes}</p>
            ) : (
              <p className="muted">No notes yet.</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

export default App;
