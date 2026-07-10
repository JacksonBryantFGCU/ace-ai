import { useEffect, useState } from "react";
import { fetchEvent, fetchEvents } from "./api";
import type { EventDetail, EventSummary } from "./types";
import "./styles.css";

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function App() {
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEvents()
      .then((items) => {
        if (cancelled) return;
        setEvents(items);
        if (items.length > 0) setSelectedId((current) => current ?? items[0]!.id);
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
      setDetail(null);
      return;
    }
    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);
    fetchEvent(selectedId)
      .then((event) => {
        if (!cancelled) setDetail(event);
      })
      .catch((err: Error) => {
        if (!cancelled) setDetailError(err.message);
      })
      .finally(() => {
        if (!cancelled) setDetailLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Community Events</p>
        <h1>Event RSVP Manager</h1>
      </header>

      {loading ? <p role="status">Loading events...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && events.length === 0 ? <p>No events found.</p> : null}

      <div className="layout">
        <section className="event-list" aria-label="Events">
          {events.map((event) => (
            <button
              key={event.id}
              type="button"
              className={`event-card${selectedId === event.id ? " selected" : ""}`}
              onClick={() => setSelectedId(event.id)}
            >
              <div className="card-header">
                <h2>{event.title}</h2>
                <span className={`status status-${event.status}`}>{statusLabel(event.status)}</span>
              </div>
              <p className="event-meta">
                {event.location} &middot; {formatDate(event.starts_at)}
              </p>
              <p className={`availability${event.is_full ? " full" : ""}`}>
                {event.is_full ? "Full" : `${event.spots_remaining} spots remaining`}
              </p>
            </button>
          ))}
        </section>

        <section className="detail-panel" aria-label="Event details">
          {detailLoading ? <p role="status">Loading event...</p> : null}
          {detailError ? <p role="alert" className="error">{detailError}</p> : null}

          {detail ? (
            <>
              <h2>{detail.title}</h2>
              <p className="event-meta">
                {detail.location} &middot; {formatDate(detail.starts_at)}
              </p>
              <p className={`availability${detail.is_full ? " full" : ""}`}>
                {detail.is_full ? "Full" : `${detail.spots_remaining} spots remaining`}
                {` — ${detail.going_count} going, ${detail.waitlisted_count} waitlisted`}
              </p>

              <h3>Attendees</h3>
              {detail.rsvps.length === 0 ? (
                <p className="muted">No RSVPs yet.</p>
              ) : (
                <ul className="rsvp-list">
                  {detail.rsvps.map((rsvp) => (
                    <li className="rsvp-row" key={rsvp.id}>
                      <div className="rsvp-row-info">
                        <p>
                          <strong>{rsvp.attendee_name}</strong>
                        </p>
                        <p>{rsvp.attendee_email}</p>
                      </div>
                      <span className={`status status-${rsvp.status}`}>{statusLabel(rsvp.status)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default App;
