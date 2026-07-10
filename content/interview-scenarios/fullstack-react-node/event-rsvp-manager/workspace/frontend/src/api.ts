import type { EventDetail, EventStatus, EventSummary, Rsvp, RsvpStatus } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface EventsResponse {
  events: EventSummary[];
}

interface EventResponse {
  event: EventDetail;
}

interface RsvpCreateResponse {
  rsvp: Rsvp;
  event: EventSummary;
}

interface RsvpUpdateResponse {
  rsvp: Rsvp;
  event: EventSummary;
}

export interface EventQuery {
  status?: EventStatus | "all";
  availability?: "open" | "full" | "all";
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export async function fetchEvents(query: EventQuery = {}): Promise<EventSummary[]> {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.availability && query.availability !== "all") params.set("availability", query.availability);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await parseJson<EventsResponse>(await fetch(`${API_BASE_URL}/events${suffix}`));
  return data.events;
}

export async function fetchEvent(id: number): Promise<EventDetail> {
  const data = await parseJson<EventResponse>(await fetch(`${API_BASE_URL}/events/${id}`));
  return data.event;
}

export async function createRsvp(
  eventId: number,
  payload: { attendee_name: string; attendee_email: string },
): Promise<RsvpCreateResponse> {
  return parseJson<RsvpCreateResponse>(
    await fetch(`${API_BASE_URL}/events/${eventId}/rsvps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
}

export async function updateRsvpStatus(id: number, status: RsvpStatus): Promise<RsvpUpdateResponse> {
  return parseJson<RsvpUpdateResponse>(
    await fetch(`${API_BASE_URL}/rsvps/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
}
