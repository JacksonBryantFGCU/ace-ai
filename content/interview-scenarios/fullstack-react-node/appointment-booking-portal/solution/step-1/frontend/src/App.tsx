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
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<BookingOptions | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAppointments()
      .then((items) => {
        if (!cancelled) setAppointments(items);
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
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetchBookingOptions()
      .then((next) => {
        if (!cancelled) setOptions(next);
      })
      .catch(() => {
        if (!cancelled) setOptions(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Front Desk</p>
        <h1>Appointment Booking Portal</h1>
      </header>

      {loading ? <p role="status">Loading appointments...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && appointments.length === 0 ? <p>No appointments yet.</p> : null}

      <section className="appointment-list" aria-label="Appointments">
        {appointments.map((appointment) => (
          <article className="appointment-card" key={appointment.id}>
            <div className="card-header">
              <div>
                <h2>{appointment.service.name}</h2>
                <p className="card-meta">{formatPrice(appointment.service.price_cents)}</p>
              </div>
              <span className={`status status-${appointment.status}`}>{statusLabel(appointment.status)}</span>
            </div>

            <p className="card-meta">{appointment.staff.name}</p>
            <p className="card-meta">{appointment.customer_name}</p>
            <p className="card-meta">
              {formatDateTime(appointment.starts_at)} &ndash; {formatDateTime(appointment.ends_at)}
            </p>

            {appointment.notes ? (
              <p className="notes-display">{appointment.notes}</p>
            ) : (
              <p className="muted">No notes yet.</p>
            )}
          </article>
        ))}
      </section>

      {options ? (
        <section aria-label="Booking options">
          <h2>Available Services</h2>
          <ul>
            {options.services.map((service) => (
              <li key={service.id}>
                {service.name} &middot; {service.duration_minutes} min &middot; {formatPrice(service.price_cents)}
              </li>
            ))}
          </ul>
          <h2>Available Staff</h2>
          <ul>
            {options.staff.map((member) => (
              <li key={member.id}>
                {member.name} &middot; {member.role}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}

export default App;
