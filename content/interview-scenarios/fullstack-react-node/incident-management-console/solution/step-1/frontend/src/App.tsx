import { useEffect, useState } from "react";
import { fetchIncident, fetchIncidentOptions, fetchIncidents } from "./api";
import type { Incident, IncidentEvent, IncidentOptions } from "./types";
import "./styles.css";

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
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detailIncident, setDetailIncident] = useState<Incident | null>(null);
  const [events, setEvents] = useState<IncidentEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([fetchIncidents(), fetchIncidentOptions()])
      .then(([incidentList, incidentOptions]) => {
        if (cancelled) return;
        setIncidents(incidentList);
        setOptions(incidentOptions);
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
    });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

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
                  <span className={`badge status-${service.status === "down" ? "open" : service.status === "degraded" ? "investigating" : "resolved"}`}>
                    {statusLabel(service.status)}
                  </span>
                </p>
              ))}
            </div>
          </section>

          <div className="layout">
          <section className="incident-list" aria-label="Incidents">
            <h2>Incidents</h2>
            {incidents.length === 0 ? (
              <p className="muted">No incidents to show.</p>
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
