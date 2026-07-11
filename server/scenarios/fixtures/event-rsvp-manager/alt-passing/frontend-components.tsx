// ALT-PASSING fixture: presentational subcomponents for event-rsvp-manager
// step 2. The reference solution renders everything inline inside `App`;
// this fixture decomposes into named components with the same accessible
// roles/labels/text so the authored tests (which query by label/role/text)
// can't tell the difference.

import { FormEvent } from "react";
import type { EventDetail, EventStatus, EventSummary, RsvpStatus } from "./types";
import type { AvailabilityFilterValue, StatusFilterValue } from "./use-event-catalog";

const EVENT_STATUS_OPTIONS: StatusFilterValue[] = ["all", "scheduled", "cancelled", "completed"];
const AVAILABILITY_OPTIONS: AvailabilityFilterValue[] = ["all", "open", "full"];

export function titleCase(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function formatWhen(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function EventFilters(props: {
  statusFilter: StatusFilterValue;
  availabilityFilter: AvailabilityFilterValue;
  onStatusChange: (value: StatusFilterValue) => void;
  onAvailabilityChange: (value: AvailabilityFilterValue) => void;
}) {
  return (
    <section className="toolbar" aria-label="Event filters">
      <label htmlFor="status-filter">Status</label>
      <select
        id="status-filter"
        value={props.statusFilter}
        onChange={(event) => props.onStatusChange(event.target.value as StatusFilterValue)}
      >
        {EVENT_STATUS_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : titleCase(option)}
          </option>
        ))}
      </select>

      <label htmlFor="availability-filter">Availability</label>
      <select
        id="availability-filter"
        value={props.availabilityFilter}
        onChange={(event) => props.onAvailabilityChange(event.target.value as AvailabilityFilterValue)}
      >
        {AVAILABILITY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option === "all" ? "All" : titleCase(option)}
          </option>
        ))}
      </select>
    </section>
  );
}

export function EventCard(props: { event: EventSummary; selected: boolean; onSelect: () => void }) {
  const { event } = props;
  return (
    <button
      type="button"
      className={`event-card${props.selected ? " selected" : ""}`}
      onClick={props.onSelect}
    >
      <div className="card-header">
        <h2>{event.title}</h2>
        <span className={`status status-${event.status}`}>{titleCase(event.status)}</span>
      </div>
      <p className="event-meta">
        {event.location} &middot; {formatWhen(event.starts_at)}
      </p>
      <p className={`availability${event.is_full ? " full" : ""}`}>
        {event.is_full ? "Full" : `${event.spots_remaining} spots remaining`}
      </p>
    </button>
  );
}

export function EventListPanel(props: { events: EventSummary[]; selectedId: number | null; onSelect: (id: number) => void }) {
  return (
    <section className="event-list" aria-label="Events">
      {props.events.map((event) => (
        <EventCard
          key={event.id}
          event={event}
          selected={props.selectedId === event.id}
          onSelect={() => props.onSelect(event.id)}
        />
      ))}
    </section>
  );
}

export function RsvpList(props: { rsvps: EventDetail["rsvps"] }) {
  if (props.rsvps.length === 0) {
    return <p className="muted">No RSVPs yet.</p>;
  }
  return (
    <ul className="rsvp-list">
      {props.rsvps.map((rsvp) => (
        <li className="rsvp-row" key={rsvp.id}>
          <div className="rsvp-row-info">
            <p>
              <strong>{rsvp.attendee_name}</strong>
            </p>
            <p>{rsvp.attendee_email}</p>
          </div>
          <span className={`status status-${rsvp.status}`}>{titleCase(rsvp.status)}</span>
        </li>
      ))}
    </ul>
  );
}

export function RsvpForm(props: {
  attendeeName: string;
  attendeeEmail: string;
  submitting: boolean;
  submitError: string | null;
  onNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={props.onSubmit} className="rsvp-form" aria-label="Add RSVP">
      <div className="field">
        <label htmlFor="attendee-name">Attendee name</label>
        <input
          id="attendee-name"
          type="text"
          value={props.attendeeName}
          onChange={(event) => props.onNameChange(event.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="attendee-email">Attendee email</label>
        <input
          id="attendee-email"
          type="text"
          value={props.attendeeEmail}
          onChange={(event) => props.onEmailChange(event.target.value)}
        />
      </div>

      {props.submitError ? (
        <p role="alert" className="error">
          {props.submitError}
        </p>
      ) : null}

      <button type="submit" disabled={props.submitting}>
        {props.submitting ? "Adding..." : "Add RSVP"}
      </button>
    </form>
  );
}

export function EventDetailPanel(props: {
  detail: EventDetail | null;
  loading: boolean;
  error: string | null;
  formState: {
    attendeeName: string;
    attendeeEmail: string;
    submitting: boolean;
    submitError: string | null;
    onNameChange: (value: string) => void;
    onEmailChange: (value: string) => void;
    onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  };
}) {
  const { detail } = props;
  return (
    <section className="detail-panel" aria-label="Event details">
      {props.loading ? <p role="status">Loading event...</p> : null}
      {props.error ? (
        <p role="alert" className="error">
          {props.error}
        </p>
      ) : null}

      {detail ? (
        <>
          <h2>{detail.title}</h2>
          <p className="event-meta">
            {detail.location} &middot; {formatWhen(detail.starts_at)}
          </p>
          <p className={`availability${detail.is_full ? " full" : ""}`}>
            {detail.is_full ? "Full" : `${detail.spots_remaining} spots remaining`}
            {` — ${detail.going_count} going, ${detail.waitlisted_count} waitlisted`}
          </p>

          <h3>Attendees</h3>
          <RsvpList rsvps={detail.rsvps} />

          {detail.status === "scheduled" ? (
            <RsvpForm
              attendeeName={props.formState.attendeeName}
              attendeeEmail={props.formState.attendeeEmail}
              submitting={props.formState.submitting}
              submitError={props.formState.submitError}
              onNameChange={props.formState.onNameChange}
              onEmailChange={props.formState.onEmailChange}
              onSubmit={props.formState.onSubmit}
            />
          ) : (
            <p className="muted">This event is not accepting RSVPs.</p>
          )}
        </>
      ) : null}
    </section>
  );
}

export type { EventStatus, RsvpStatus };
