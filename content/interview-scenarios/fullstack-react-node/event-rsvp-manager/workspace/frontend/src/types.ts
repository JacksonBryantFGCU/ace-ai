export type EventStatus = "scheduled" | "cancelled" | "completed";
export type RsvpStatus = "going" | "waitlisted" | "cancelled";

export interface EventSummary {
  id: number;
  title: string;
  location: string;
  starts_at: string;
  capacity: number;
  status: EventStatus;
  going_count: number;
  waitlisted_count: number;
  spots_remaining: number;
  is_full: boolean;
  created_at: string;
  updated_at: string;
}

export interface Rsvp {
  id: number;
  event_id: number;
  attendee_name: string;
  attendee_email: string;
  status: RsvpStatus;
  created_at: string;
  updated_at: string;
}

export interface EventDetail extends EventSummary {
  rsvps: Rsvp[];
}
