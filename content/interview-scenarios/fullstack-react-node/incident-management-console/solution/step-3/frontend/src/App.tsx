import { FormEvent, useEffect, useState } from "react";
import {
  addIncidentEvent,
  assignResponder,
  changeIncidentStatus,
  fetchIncident,
  fetchIncidentOptions,
  fetchIncidentSummary,
  fetchIncidents,
} from "./api";
import type {
  Incident,
  IncidentEvent,
  IncidentFilters,
  IncidentOptions,
  IncidentSeverity,
  IncidentStatus,
  IncidentSummary,
} from "./types";
import "./styles.css";

const STATUS_OPTIONS: IncidentStatus[] = ["open", "investigating", "monitoring", "resolved"];
const SEVERITY_OPTIONS: IncidentSeverity[] = ["sev1", "sev2", "sev3"];

function statusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function App() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [options, setOptions] = useState<IncidentOptions>({ services: [], responders: [] });
  const [summary, setSummary] = useState<IncidentSummary | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [statusFilter, setStatusFilter] = useState<IncidentStatus | "">("");
  const [severityFilter, setSeverityFilter] = useState<IncidentSeverity | "">("");
  const [serviceFilter, setServiceFilter] = useState<string>("");
  const [assignedFilter, setAssignedFilter] = useState<"" | "true" | "false">("");

  const [assignResponderId, setAssignResponderId] = useState<string>("");
  const [assignError, setAssignError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState(false);

  const [updateResponderId, setUpdateResponderId] = useState<string>("");
  const [updateMessage, setUpdateMessage] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);
  const [posting, setPosting] = useState(false);

  const [statusValue, setStatusValue] = useState<IncidentStatus | "">("");
  const [statusResponderId, setStatusResponderId] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusError, setStatusError] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  function currentFilters(): IncidentFilters {
    const filters: IncidentFilters = {};
    if (statusFilter) filters.status = statusFilter;
    if (severityFilter) filters.severity = severityFilter;
    if (serviceFilter) filters.service_id = Number(serviceFilter);
    if (assignedFilter) filters.assigned = assignedFilter === "true";
    return filters;
  }

  async function reloadIncidents(nextSelectedId?: number | null) {
    const incidentList = await fetchIncidents(currentFilters());
    setIncidents(incidentList);
    if (nextSelectedId !== undefined) {
      setSelectedId(nextSelectedId);
    } else if (!incidentList.some((incident) => incident.id === selectedId)) {
      setSelectedId(incidentList[0]?.id ?? null);
    }
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchIncidents(), fetchIncidentOptions(), fetchIncidentSummary()])
      .then(([incidentList, incidentOptions, incidentSummary]) => {
        if (cancelled) return;
        setIncidents(incidentList);
        setOptions(incidentOptions);
        setSummary(incidentSummary);
        setSelectedId(incidentList[0]?.id ?? null);
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

  useEffect(() => {
    if (loading) return;
    let cancelled = false;
    fetchIncidents(currentFilters()).then((incidentList) => {
      if (cancelled) return;
      setIncidents(incidentList);
      setSelectedId((current) => (incidentList.some((incident) => incident.id === current) ? current : incidentList[0]?.id ?? null));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, severityFilter, serviceFilter, assignedFilter]);

  useEffect(() => {
    setAssignError(null);
    setUpdateError(null);
    setStatusError(null);
    if (selectedId === null) {
      setDetailIncident(null);
      setEvents([]);
      return;
    }
    let cancelled = false;
    fetchIncident(selectedId).then((detail) => {
      if (cancelled) return;
      setDetailIncident(detail.incident);
      setEvents(detail.events);
      setAssignResponderId("");
      setUpdateResponderId("");
      setUpdateMessage("");
      setStatusValue("");
      setStatusResponderId("");
      setStatusMessage("");
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function refreshSummary() {
    setSummary(await fetchIncidentSummary());
  }

  async function handleAssignSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || !assignResponderId) return;
    setAssigning(true);
    setAssignError(null);
    try {
      await assignResponder(selectedId, Number(assignResponderId));
      const detail = await fetchIncident(selectedId);
      setDetailIncident(detail.incident);
      setEvents(detail.events);
      setAssignResponderId("");
      await reloadIncidents(selectedId);
      await refreshSummary();
    } catch (err) {
      setAssignError((err as Error).message);
    } finally {
      setAssigning(false);
    }
  }

  async function handleUpdateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || !updateResponderId) return;
    setPosting(true);
    setUpdateError(null);
    try {
      await addIncidentEvent(selectedId, { responder_id: Number(updateResponderId), message: updateMessage });
      const detail = await fetchIncident(selectedId);
      setDetailIncident(detail.incident);
      setEvents(detail.events);
      setUpdateMessage("");
    } catch (err) {
      setUpdateError((err as Error).message);
    } finally {
      setPosting(false);
    }
  }

  async function handleStatusSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedId === null || !statusValue || !statusResponderId) return;
    setChangingStatus(true);
    setStatusError(null);
    try {
      await changeIncidentStatus(selectedId, {
        status: statusValue,
        responder_id: Number(statusResponderId),
        message: statusMessage,
      });
      const detail = await fetchIncident(selectedId);
      setDetailIncident(detail.incident);
      setEvents(detail.events);
      setStatusValue("");
      setStatusMessage("");
      await reloadIncidents(selectedId);
      await refreshSummary();
    } catch (err) {
      setStatusError((err as Error).message);
    } finally {
      setChangingStatus(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">On-call</p>
        <h1>Incident Management Console</h1>
      </header>

      {loading ? <p role="status">Loading incidents...</p> : null}
      {error ? (
        <p role="alert" className="error">
          {error}
        </p>
      ) : null}

      {!loading && !error ? (
        <>
          <section className="summary-panel" aria-label="Services">
            <h2>Services</h2>
            <div className="filters-grid">
              {options.services.map((service) => (
                <p className="card-meta" key={service.id}>
                  <strong>{service.name}</strong>{" "}
                  <span
                    className={`badge status-${service.status === "down" ? "open" : service.status === "degraded" ? "investigating" : "resolved"}`}
                  >
                    {statusLabel(service.status)}
                  </span>
                </p>
              ))}
            </div>
          </section>

          <section className="summary-panel" aria-label="Summary">
            <h2>Summary</h2>
            {summary ? (
              <div className="summary-grid">
                <div className="summary-stat">
                  <strong>{summary.total}</strong>
                  <span className="muted">Total</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.open}</strong>
                  <span className="muted">Open</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.investigating}</strong>
                  <span className="muted">Investigating</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.monitoring}</strong>
                  <span className="muted">Monitoring</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.resolved}</strong>
                  <span className="muted">Resolved</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.sev1}</strong>
                  <span className="muted">Sev1</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.sev2}</strong>
                  <span className="muted">Sev2</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.sev3}</strong>
                  <span className="muted">Sev3</span>
                </div>
                <div className="summary-stat">
                  <strong>{summary.unassigned}</strong>
                  <span className="muted">Unassigned</span>
                </div>
              </div>
            ) : null}
          </section>

          <section className="filters-panel" aria-label="Filters">
            <h2>Filters</h2>
            <div className="filters-grid">
              <div className="field">
                <label htmlFor="status-filter">Status filter</label>
                <select id="status-filter" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as IncidentStatus | "")}>
                  <option value="">All statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {statusLabel(status)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="severity-filter">Severity filter</label>
                <select id="severity-filter" value={severityFilter} onChange={(event) => setSeverityFilter(event.target.value as IncidentSeverity | "")}>
                  <option value="">All severities</option>
                  {SEVERITY_OPTIONS.map((severity) => (
                    <option key={severity} value={severity}>
                      {severity.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="service-filter">Service filter</label>
                <select id="service-filter" value={serviceFilter} onChange={(event) => setServiceFilter(event.target.value)}>
                  <option value="">All services</option>
                  {options.services.map((service) => (
                    <option key={service.id} value={service.id}>
                      {service.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label htmlFor="assigned-filter">Assigned filter</label>
                <select id="assigned-filter" value={assignedFilter} onChange={(event) => setAssignedFilter(event.target.value as "" | "true" | "false")}>
                  <option value="">All incidents</option>
                  <option value="true">Assigned</option>
                  <option value="false">Unassigned</option>
                </select>
              </div>
            </div>
          </section>

          <div className="layout">
            <section className="incident-list" aria-label="Incidents">
              <h2>Incidents</h2>
              {incidents.length === 0 ? (
                <p className="muted">No incidents match the current filters.</p>
              ) : (
                incidents.map((incident) => (
                  <button
                    key={incident.id}
                    type="button"
                    className={`incident-row${selectedId === incident.id ? " selected" : ""}`}
                    onClick={() => setSelectedId(incident.id)}
                  >
                    <span>{incident.title}</span>
                    <span className={`badge severity-${incident.severity}`}>{incident.severity.toUpperCase()}</span>
                    <span className={`badge status-${incident.status}`}>{statusLabel(incident.status)}</span>
                  </button>
                ))
              )}
            </section>

            <div>
              <section className="incident-detail" aria-label="Incident details">
                {detailIncident ? (
                  <>
                    <h2>{detailIncident.title}</h2>
                    <p className="card-meta">{detailIncident.description}</p>
                    <p className="card-meta">
                      <span className={`badge severity-${detailIncident.severity}`}>
                        {detailIncident.severity.toUpperCase()}
                      </span>{" "}
                      <span className={`badge status-${detailIncident.status}`}>
                        {statusLabel(detailIncident.status)}
                      </span>
                    </p>
                    <p className="card-meta">Service: {detailIncident.service.name}</p>
                    <p className="card-meta">
                      Assigned: {detailIncident.assigned_responder ? detailIncident.assigned_responder.name : "Unassigned"}
                    </p>
                    {detailIncident.resolved_at ? (
                      <p className="card-meta">Resolved: {formatDate(detailIncident.resolved_at)}</p>
                    ) : null}

                    {detailIncident.status === "resolved" ? (
                      <p className="muted">This incident is resolved. No further changes are allowed.</p>
                    ) : (
                      <>
                        <form className="assign-form" aria-label="Assign responder" onSubmit={handleAssignSubmit}>
                          <h3>Assign Responder</h3>
                          <div className="field">
                            <label htmlFor="assign-responder">Responder to assign</label>
                            <select
                              id="assign-responder"
                              value={assignResponderId}
                              onChange={(event) => setAssignResponderId(event.target.value)}
                            >
                              <option value="">Select a responder</option>
                              {options.responders.map((responder) => (
                                <option key={responder.id} value={responder.id}>
                                  {responder.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          {assignError ? (
                            <p role="alert" className="error">
                              {assignError}
                            </p>
                          ) : null}
                          <button type="submit" disabled={assigning || !assignResponderId}>
                            {assigning ? "Assigning..." : "Assign responder"}
                          </button>
                        </form>

                        <form className="update-form" aria-label="Add update" onSubmit={handleUpdateSubmit}>
                          <h3>Add Update</h3>
                          <div className="field">
                            <label htmlFor="update-responder">Update responder</label>
                            <select
                              id="update-responder"
                              value={updateResponderId}
                              onChange={(event) => setUpdateResponderId(event.target.value)}
                            >
                              <option value="">Select a responder</option>
                              {options.responders.map((responder) => (
                                <option key={responder.id} value={responder.id}>
                                  {responder.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="update-message">Update message</label>
                            <textarea
                              id="update-message"
                              value={updateMessage}
                              onChange={(event) => setUpdateMessage(event.target.value)}
                            />
                          </div>
                          {updateError ? (
                            <p role="alert" className="error">
                              {updateError}
                            </p>
                          ) : null}
                          <button type="submit" disabled={posting || !updateResponderId}>
                            {posting ? "Posting..." : "Post update"}
                          </button>
                        </form>

                        <form className="status-form" aria-label="Change status" onSubmit={handleStatusSubmit}>
                          <h3>Change Status</h3>
                          <div className="field">
                            <label htmlFor="status-value">New status</label>
                            <select
                              id="status-value"
                              value={statusValue}
                              onChange={(event) => setStatusValue(event.target.value as IncidentStatus | "")}
                            >
                              <option value="">Select a status</option>
                              {STATUS_OPTIONS.filter((status) => status !== detailIncident.status).map((status) => (
                                <option key={status} value={status}>
                                  {statusLabel(status)}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="status-responder">Status responder</label>
                            <select
                              id="status-responder"
                              value={statusResponderId}
                              onChange={(event) => setStatusResponderId(event.target.value)}
                            >
                              <option value="">Select a responder</option>
                              {options.responders.map((responder) => (
                                <option key={responder.id} value={responder.id}>
                                  {responder.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="field">
                            <label htmlFor="status-message">Status message</label>
                            <textarea
                              id="status-message"
                              value={statusMessage}
                              onChange={(event) => setStatusMessage(event.target.value)}
                            />
                          </div>
                          {statusError ? (
                            <p role="alert" className="error">
                              {statusError}
                            </p>
                          ) : null}
                          <button type="submit" disabled={changingStatus || !statusValue || !statusResponderId}>
                            {changingStatus
                              ? "Saving..."
                              : statusValue === "resolved"
                                ? "Resolve incident"
                                : "Save status change"}
                          </button>
                        </form>
                      </>
                    )}
                  </>
                ) : (
                  <p className="muted">Select an incident to view its details.</p>
                )}
              </section>

              <section className="timeline-panel" aria-label="Timeline">
                <h3>Timeline</h3>
                {events.length === 0 ? (
                  <p className="muted">No timeline events yet.</p>
                ) : (
                  events.map((event) => (
                    <div className="timeline-event" key={event.id}>
                      <p>{event.message}</p>
                      <p className="card-meta">
                        <strong>{event.responder ? event.responder.name : "System"}</strong> &middot; {formatDate(event.created_at)}
                      </p>
                    </div>
                  ))
                )}
              </section>
            </div>
          </div>
        </>
      ) : null}
    </main>
  );
}

export default App;
