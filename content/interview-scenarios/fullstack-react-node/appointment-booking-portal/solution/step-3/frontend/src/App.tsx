import { FormEvent, useEffect, useState } from "react";
import { createAppointment, fetchAppointments, fetchBookingOptions, updateAppointmentStatus } from "./api";
import type { Appointment, AppointmentStatus, BookingOptions } from "./types";
import "./styles.css";

const STATUS_OPTIONS: Array<AppointmentStatus | "all"> = ["all", "scheduled", "completed", "cancelled"];

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
  const [staffFilter, setStaffFilter] = useState<number | "all">("all");
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | "all">("all");
  const [dateFilter, setDateFilter] = useState("");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [options, setOptions] = useState<BookingOptions | null>(null);

  const [serviceId, setServiceId] = useState<number | "">("");
  const [staffId, setStaffId] = useState<number | "">("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [notes, setNotes] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [finalizingId, setFinalizingId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchAppointments({ staffId: staffFilter, status: statusFilter, date: dateFilter || "all" })
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
  }, [staffFilter, statusFilter, dateFilter]);

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

  async function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setCreating(true);
    setCreateError(null);
    try {
      const created = await createAppointment({
        service_id: Number(serviceId),
        staff_id: Number(staffId),
        customer_name: customerName,
        customer_email: customerEmail,
        starts_at: startsAt,
        notes,
      });
      setAppointments((current) => [...current, created]);
      setCustomerName("");
      setCustomerEmail("");
      setStartsAt("");
      setNotes("");
    } catch (err) {
      setCreateError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  async function handleFinalize(appointment: Appointment, status: AppointmentStatus) {
    setFinalizingId(appointment.id);
    setItemErrors((current) => ({ ...current, [appointment.id]: "" }));
    try {
      const updated = await updateAppointmentStatus(appointment.id, status);
      setAppointments((current) => current.map((item) => (item.id === updated.id ? updated : item)));
    } catch (err) {
      setItemErrors((current) => ({ ...current, [appointment.id]: (err as Error).message }));
    } finally {
      setFinalizingId(null);
    }
  }

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Front Desk</p>
        <h1>Appointment Booking Portal</h1>
      </header>

      <section className="toolbar" aria-label="Appointment filters">
        <label htmlFor="staff-filter">Staff</label>
        <select
          id="staff-filter"
          value={staffFilter}
          onChange={(event) => setStaffFilter(event.target.value === "all" ? "all" : Number(event.target.value))}
        >
          <option value="all">All</option>
          {options?.staff.map((member) => (
            <option key={member.id} value={member.id}>
              {member.name}
            </option>
          ))}
        </select>

        <label htmlFor="status-filter">Status</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as AppointmentStatus | "all")}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {option === "all" ? "All" : statusLabel(option)}
            </option>
          ))}
        </select>

        <label htmlFor="date-filter">Date</label>
        <input
          id="date-filter"
          type="text"
          placeholder="YYYY-MM-DD"
          value={dateFilter}
          onChange={(event) => setDateFilter(event.target.value)}
        />
      </section>

      {loading ? <p role="status">Loading appointments...</p> : null}
      {error ? <p role="alert" className="error">{error}</p> : null}
      {!loading && !error && appointments.length === 0 ? <p>No appointments match these filters.</p> : null}

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

            <div className="update-form">
              {itemErrors[appointment.id] ? (
                <p role="alert" className="error">{itemErrors[appointment.id]}</p>
              ) : null}
              <button
                type="button"
                disabled={finalizingId === appointment.id}
                onClick={() => handleFinalize(appointment, "completed")}
              >
                {finalizingId === appointment.id ? "Saving..." : `Complete appointment for ${appointment.customer_name}`}
              </button>
              <button
                type="button"
                disabled={finalizingId === appointment.id}
                onClick={() => handleFinalize(appointment, "cancelled")}
              >
                {finalizingId === appointment.id ? "Saving..." : `Cancel appointment for ${appointment.customer_name}`}
              </button>
            </div>
          </article>
        ))}
      </section>

      <form onSubmit={handleCreateSubmit} className="create-form" aria-label="Book appointment">
        <h2>Book Appointment</h2>

        <div className="field-row">
          <div className="field">
            <label htmlFor="create-service">Service</label>
            <select id="create-service" value={serviceId} onChange={(event) => setServiceId(event.target.value === "" ? "" : Number(event.target.value))}>
              <option value="">Select a service</option>
              {options?.services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="create-staff">Staff member</label>
            <select id="create-staff" value={staffId} onChange={(event) => setStaffId(event.target.value === "" ? "" : Number(event.target.value))}>
              <option value="">Select a staff member</option>
              {options?.staff.map((member) => (
                <option key={member.id} value={member.id}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="field-row">
          <div className="field">
            <label htmlFor="customer-name">Customer name</label>
            <input
              id="customer-name"
              type="text"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="customer-email">Customer email</label>
            <input
              id="customer-email"
              type="text"
              value={customerEmail}
              onChange={(event) => setCustomerEmail(event.target.value)}
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="starts-at">Start time</label>
          <input
            id="starts-at"
            type="text"
            placeholder="2025-02-10T15:00:00.000Z"
            value={startsAt}
            onChange={(event) => setStartsAt(event.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </div>

        {createError ? <p role="alert" className="error">{createError}</p> : null}

        <button type="submit" disabled={creating}>
          {creating ? "Booking..." : "Book Appointment"}
        </button>
      </form>
    </main>
  );
}

export default App;
