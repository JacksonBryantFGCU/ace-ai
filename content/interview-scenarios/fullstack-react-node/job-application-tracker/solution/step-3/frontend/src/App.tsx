import { FormEvent, useEffect, useState } from "react";
import { createApplication, fetchApplications, fetchSummary, updateApplication } from "./api";
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
const UPDATE_STATUS_OPTIONS: ApplicationStatus[] = ["draft", "applied", "interviewing", "offer", "rejected"];

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function sourceLabel(source: string) {
  return source
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

function initDrafts(items: Application[]): { status: Record<number, ApplicationStatus>; notes: Record<number, string> } {
  return {
    status: Object.fromEntries(items.map((item) => [item.id, item.status])),
    notes: Object.fromEntries(items.map((item) => [item.id, item.notes ?? ""])),
  };
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

  const [draftStatus, setDraftStatus] = useState<Record<number, ApplicationStatus>>({});
  const [draftNotes, setDraftNotes] = useState<Record<number, string>>({});
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);

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
        if (cancelled) return;
        setApplications(items);
        const drafts = initDrafts(items);
        setDraftStatus(drafts.status);
        setDraftNotes(drafts.notes);
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
      setDraftStatus((current) => ({ ...current, [created.id]: created.status }));
      setDraftNotes((current) => ({ ...current, [created.id]: created.notes ?? "" }));
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

  async function handleUpdate(application: Application) {
    setSavingId(application.id);
    setItemErrors((current) => ({ ...current, [application.id]: "" }));
    try {
      const nextStatus = draftStatus[application.id] ?? application.status;
      const nextNotes = draftNotes[application.id] ?? (application.notes ?? "");
      const updated = await updateApplication(application.id, { status: nextStatus, notes: nextNotes });
      setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)));
      setDraftStatus((current) => ({ ...current, [updated.id]: updated.status }));
      setDraftNotes((current) => ({ ...current, [updated.id]: updated.notes ?? "" }));
      await loadSummary();
    } catch (err) {
      setItemErrors((current) => ({ ...current, [application.id]: (err as Error).message }));
    } finally {
      setSavingId(null);
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

            <div className="update-form">
              <div className="field">
                <label htmlFor={`status-update-${application.id}`}>Update status for {application.company}</label>
                <select
                  id={`status-update-${application.id}`}
                  value={draftStatus[application.id] ?? application.status}
                  onChange={(event) =>
                    setDraftStatus((current) => ({
                      ...current,
                      [application.id]: event.target.value as ApplicationStatus,
                    }))
                  }
                >
                  {UPDATE_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor={`notes-update-${application.id}`}>Update notes for {application.company}</label>
                <textarea
                  id={`notes-update-${application.id}`}
                  rows={2}
                  value={draftNotes[application.id] ?? (application.notes ?? "")}
                  onChange={(event) =>
                    setDraftNotes((current) => ({ ...current, [application.id]: event.target.value }))
                  }
                />
              </div>

              {itemErrors[application.id] ? (
                <p role="alert" className="error">{itemErrors[application.id]}</p>
              ) : null}

              <button type="button" disabled={savingId === application.id} onClick={() => handleUpdate(application)}>
                {savingId === application.id ? "Saving..." : "Save changes"}
              </button>
            </div>
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
