export const STAFF_ROLES = ["stylist", "consultant", "trainer", "therapist"] as const;
export type StaffRole = (typeof STAFF_ROLES)[number];

export const APPOINTMENT_STATUSES = ["scheduled", "completed", "cancelled"] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];
