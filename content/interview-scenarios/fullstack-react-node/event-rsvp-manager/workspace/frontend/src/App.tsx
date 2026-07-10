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
  // TODO (Step 1): track events, loading, and error state, and fetch events on
  // mount (see fetchEvents in ./api).

  // TODO (Step 1): track a selected event id, its detail, and detail
  // loading/error state, and fetch the detail (see fetchEvent in ./api)
  // whenever the selection changes.

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Community Events</p>
        <h1>Event RSVP Manager</h1>
      </header>

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"),
          and empty states here. */}

      <div className="layout">
        <section className="event-list" aria-label="Events">
          {/* TODO (Step 1): render one button per event (title, location,
              start time, and a spots-remaining/full indicator). Clicking a
              button should select that event. */}
        </section>

        <section className="detail-panel" aria-label="Event details">
          {/* TODO (Step 1): render the selected event's detail (title,
              location, start time, capacity summary) and its Attendees list
              (name, email, status) here. Use statusLabel/formatDate above. */}

          {/* TODO (Step 2): add an "Add RSVP" form here (only for scheduled
              events) with attendee name/email fields and backend error
              display. */}

          {/* TODO (Step 3): add a status control to each attendee row so a
              candidate can move an RSVP between going/waitlisted/cancelled. */}
        </section>
      </div>

      {/* TODO (Step 2): add status and availability filter controls above
          the event list. */}
    </main>
  );
}

export default App;
