export type StaffRole = "stylist" | "consultant" | "trainer" | "therapist";
export type AppointmentStatus = "scheduled" | "completed" | "cancelled";

export interface Service {
  id: number;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

export interface StaffMember {
  id: number;
  name: string;
  email: string;
  role: StaffRole;
}

export interface Appointment {
  id: number;
  service: Service;
  staff: StaffMember;
  customer_name: string;
  customer_email: string;
  starts_at: string;
  ends_at: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookingOptions {
  services: Service[];
  staff: StaffMember[];
}
