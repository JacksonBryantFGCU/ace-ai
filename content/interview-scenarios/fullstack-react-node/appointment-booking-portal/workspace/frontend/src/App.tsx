import { useEffect, useState } from "react";
import { fetchAppointments, fetchBookingOptions } from "./api";
import type { Appointment, BookingOptions } from "./types";
import "./styles.css";

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function App() {
  // TODO (Step 1): track appointments, loading, and error state, and fetch
  // appointments on mount (see fetchAppointments in ./api).

  // TODO (Step 1): track booking options (services + staff) and fetch them on
  // mount (see fetchBookingOptions in ./api). These populate the create-appointment
  // form's dropdowns added in Step 2.

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Front Desk</p>
        <h1>Appointment Booking Portal</h1>
      </header>

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"),
          and empty states here. */}

      <section className="appointment-list" aria-label="Appointments">
        {/* TODO (Step 1): render one card per appointment (a
            <article className="appointment-card">). Each card should show the
            service name and price (use formatPrice above), staff name, customer
            name, status (use statusLabel above), and start/end time (use
            formatDateTime above). */}
      </section>

      {/* TODO (Step 2): add staff/status/date filter controls, and a create-
          appointment form using the booking options fetched above. Display
          backend validation errors (including booking conflicts). */}

      {/* TODO (Step 3): add a finalize control (complete/cancel) to each
          scheduled appointment card, and display backend validation errors from
          failed updates. */}
    </main>
  );
}

export default App;
