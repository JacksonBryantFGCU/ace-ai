import type { Appointment, AppointmentStatus, BookingOptions } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface AppointmentsResponse {
  appointments: Appointment[];
}

interface AppointmentResponse {
  appointment: Appointment;
}

export interface AppointmentQuery {
  staffId?: number | "all";
  status?: AppointmentStatus | "all";
  date?: string | "all";
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export async function fetchAppointments(query: AppointmentQuery = {}): Promise<Appointment[]> {
  const params = new URLSearchParams();
  if (query.staffId !== undefined && query.staffId !== "all") params.set("staff_id", String(query.staffId));
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.date && query.date !== "all") params.set("date", query.date);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await parseJson<AppointmentsResponse>(await fetch(`${API_BASE_URL}/appointments${suffix}`));
  return data.appointments;
}

export async function fetchBookingOptions(): Promise<BookingOptions> {
  return parseJson<BookingOptions>(await fetch(`${API_BASE_URL}/booking-options`));
}

export async function createAppointment(payload: {
  service_id: number;
  staff_id: number;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  notes?: string;
}): Promise<Appointment> {
  const data = await parseJson<AppointmentResponse>(
    await fetch(`${API_BASE_URL}/appointments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.appointment;
}

export async function updateAppointmentStatus(id: number, status: AppointmentStatus): Promise<Appointment> {
  const data = await parseJson<AppointmentResponse>(
    await fetch(`${API_BASE_URL}/appointments/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }),
  );
  return data.appointment;
}
