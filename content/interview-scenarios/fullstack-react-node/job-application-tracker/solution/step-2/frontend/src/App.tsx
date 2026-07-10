import { FormEvent, useEffect, useState } from "react";
import { createApplication, fetchApplications, fetchSummary } from "./api";
import type { Application, ApplicationSource, ApplicationStatus, ApplicationSummary } from "./types";
import "./styles.css";

const STATUS_OPTIONS: Array<ApplicationStatus | "all"> = [
  "all",
  "draft",
  "applied",
  "interviewing",
  "offer",
  "rejected",
];
const SOURCE_OPTIONS: Array<ApplicationSource | "all"> = ["all", "company_site", "linkedin", "referral", "other"];
const CREATE_STATUS_OPTIONS: ApplicationStatus[] = ["draft", "applied", "interviewing", "offer", "rejected"];
const CREATE_SOURCE_OPTIONS: ApplicationSource[] = ["company_site", "linkedin", "referral", "other"];

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
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<ApplicationSource | "all">("all");
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ApplicationSummary | null>(null);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [createStatus, setCreateStatus] = useState<ApplicationStatus>("draft");
  const [createSource, setCreateSource] = useState<ApplicationSource>("other");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  function loadSummary() {
    return fetchSummary()
      .then((next) => setSummary(next))
      .catch(() => setSummary(null));
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchApplications({ status: statusFilter, source: sourceFilter })
      .then((items) => {
        if (!cancelled) setApplications(items);
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
  }, [statusFilter, sourceFilter]);

  useEffect(() => {
    let cancelled = false;
    fetchSummary()
      .then((next) => {
        if (!cancelled) setSummary(next);
      })
      .catch(() => {
        if (!cancelled) setSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createApplication({
        company,
        role,
        location,
        status: createStatus,
        source: createSource,
        notes,
      });
      setApplications((current) => [created, ...current]);
      await loadSummary();
      setCompany("");
      setRole("");
      setLocation("");
      setCreateStatus("draft");
      setCreateSource("other");
      setNotes("");
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Job Search</p>
        <h1>Job Application Tracker</h1>
      </header>

      {summary ? (
        <section className="summary-panel" aria-label="Application summary">
          <span>{`Total ${summary.total}`}</span>
          <span>{`Draft ${summary.draft}`}</span>
          <span>{`Applied ${summary.applied}`}</span>
          <span>{`Interviewing ${summary.interviewing}`}</span>
          <span>{`Offer ${summary.offer}`}</span>
          <span>{`Rejected ${summary.rejected}`}</span>
        </section>
      ) : null}

      <section className="toolbar" aria-label="Application filters">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as ApplicationStatus | "all")}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All" : statusLabel(option)}
            </option>
          ))}
        </select>

        <label htmlFor="source-filter">Source</label>
        <select
          id="source-filter"
          value={sourceFilter}
          onChange={(event) => setSourceFilter(event.target.value as ApplicationSource | "all")}
        >
          {SOURCE_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All" : sourceLabel(option)}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p role="status">Loading applications...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && applications.length === 0 ? <p>No applications match these filters.</p> : null}

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

      <form onSubmit={handleCreateSubmit} className="create-form" aria-label="Create application">
        <h2>Add Application</h2>

        <div className="field-row">
          <div className="field">
            <label htmlFor="company">Company</label>
            <input id="company" type="text" value={company} onChange={(event) => setCompany(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="role">Role</label>
            <input id="role" type="text" value={role} onChange={(event) => setRole(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
            />
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="create-status">Initial status</label>
            <select
              id="create-status"
              value={createStatus}
              onChange={(event) => setCreateStatus(event.target.value as ApplicationStatus)}
            >
              {CREATE_STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="create-source">Initial source</label>
            <select
              id="create-source"
              value={createSource}
              onChange={(event) => setCreateSource(event.target.value as ApplicationSource)}
            >
              {CREATE_SOURCE_OPTIONS.map((source) => (
                <option key={source} value={source}>
                  {sourceLabel(source)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        {createError ? <p role="alert" className="error">{createError}</p> : null}

        <button type="submit" disabled={creating}>
          {creating ? "Adding..." : "Add Application"}
        </button>
      </form>
    </main>
  );
}

export default App;
