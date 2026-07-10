import { FormEvent, useEffect, useState } from "react";
import { createRsvp, fetchEvent, fetchEvents } from "./api";
import type { EventDetail, EventStatus, EventSummary } from "./types";
import "./styles.css";

const STATUS_OPTIONS: Array<EventStatus | "all"> = ["all", "scheduled", "cancelled", "completed"];
const AVAILABILITY_OPTIONS: Array<"all" | "open" | "full"> = ["all", "open", "full"];

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function mergeEventSummary(list: EventSummary[], updated: EventSummary): EventSummary[] {
  return list.map((event) => (event.id === updated.id ? updated : event));
}

export function App() {
  const [statusFilter, setStatusFilter] = useState<EventStatus | "all">("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<"all" | "open" | "full">("all");
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<EventDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [rsvpError, setRsvpError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchEvents({ status: statusFilter, availability: availabilityFilter })
      .then((items) => {
        if (cancelled) return;
        setEvents(items);
        setSelectedId((current) => current ?? (items.length > 0 ? items[0]!.id : null));
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
  }, [statusFilter, availabilityFilter]);

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

  async function handleRsvpSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    setRsvpError(null);
    try {
      const result = await createRsvp(detail.id, { attendee_name: attendeeName, attendee_email: attendeeEmail });
      setDetail((current) => (current ? { ...result.event, rsvps: [...current.rsvps, result.rsvp] } : current));
      setEvents((current) => mergeEventSummary(current, result.event));
      setAttendeeName("");
      setAttendeeEmail("");
    } catch (err) {
      setRsvpError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Community Events</p>
        <h1>Event RSVP Manager</h1>
      </header>

      <section className="toolbar" aria-label="Event filters">
        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as EventStatus | "all")}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All" : statusLabel(option)}
            </option>
          ))}
        </select>

        <label htmlFor="availability-filter">Availability</label>
        <select
          id="availability-filter"
          value={availabilityFilter}
          onChange={(event) => setAvailabilityFilter(event.target.value as "all" | "open" | "full")}
        >
          {AVAILABILITY_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All" : statusLabel(option)}
            </option>
          ))}
        </select>
      </section>

      {loading ? <p role="status">Loading events...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && events.length === 0 ? <p>No events match these filters.</p> : null}

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

              {detail.status === "scheduled" ? (
                <form onSubmit={handleRsvpSubmit} className="rsvp-form" aria-label="Add RSVP">
                  <div className="field">
                    <label htmlFor="attendee-name">Attendee name</label>
                    <input
                      id="attendee-name"
                      type="text"
                      value={attendeeName}
                      onChange={(event) => setAttendeeName(event.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="attendee-email">Attendee email</label>
                    <input
                      id="attendee-email"
                      type="text"
                      value={attendeeEmail}
                      onChange={(event) => setAttendeeEmail(event.target.value)}
                    />
                  </div>

                  {rsvpError ? <p role="alert" className="error">{rsvpError}</p> : null}

                  <button type="submit" disabled={submitting}>
                    {submitting ? "Adding..." : "Add RSVP"}
                  </button>
                </form>
              ) : (
                <p className="muted">This event is not accepting RSVPs.</p>
              )}
            </>
          ) : null}
        </section>
      </div>
    </main>
  );
}

export default App;
