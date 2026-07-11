// ALT-PASSING fixture App.tsx for event-rsvp-manager step 2
// (filter-and-create-rsvp). Behaviorally equivalent to
// solution/step-2/frontend/src/App.tsx (same routes it calls, same
// accessible labels/roles/text) but composed from `use-event-catalog`
// (data hooks) and `components` (presentational pieces) instead of one
// monolithic function component.

import { FormEvent, useState } from "react";
import { createRsvp } from "./api";
import { EventDetailPanel, EventFilters, EventListPanel } from "./components";
import { useEventCatalog, useEventDetail } from "./use-event-catalog";
import "./styles.css";

export function App() {
  const catalog = useEventCatalog();
  const { detail, setDetail, detailLoading, detailError } = useEventDetail(catalog.selectedId);

  const [attendeeName, setAttendeeName] = useState("");
  const [attendeeEmail, setAttendeeEmail] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function submitRsvp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!detail) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const result = await createRsvp(detail.id, { attendee_name: attendeeName, attendee_email: attendeeEmail });
      setDetail((current) => (current ? { ...result.event, rsvps: [...current.rsvps, result.rsvp] } : current));
      catalog.applyUpdatedEvent(result.event);
      setAttendeeName("");
      setAttendeeEmail("");
    } catch (err) {
      setSubmitError((err as Error).message);
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

      <EventFilters
        statusFilter={catalog.statusFilter}
        availabilityFilter={catalog.availabilityFilter}
        onStatusChange={catalog.setStatusFilter}
        onAvailabilityChange={catalog.setAvailabilityFilter}
      />

      {catalog.eventsLoading ? <p role="status">Loading events...</p> : null}
      {catalog.eventsError ? (
        <p role="alert" className="error">
          {catalog.eventsError}
        </p>
      ) : null}
      {!catalog.eventsLoading && !catalog.eventsError && catalog.events.length === 0 ? (
        <p>No events match these filters.</p>
      ) : null}

      <div className="layout">
        <EventListPanel events={catalog.events} selectedId={catalog.selectedId} onSelect={catalog.setSelectedId} />
        <EventDetailPanel
          detail={detail}
          loading={detailLoading}
          error={detailError}
          formState={{
            attendeeName,
            attendeeEmail,
            submitting,
            submitError,
            onNameChange: setAttendeeName,
            onEmailChange: setAttendeeEmail,
            onSubmit: submitRsvp,
          }}
        />
      </div>
    </main>
  );
}

export default App;
