import { useEffect, useState } from "react";
import { fetchIncident, fetchIncidentOptions, fetchIncidents } from "./api";
import type { Incident, IncidentEvent, IncidentOptions } from "./types";
import "./styles.css";

function statusLabel(status: string) {
  return status
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function App() {
  // TODO (Step 1): track the incidents list, incident options (services +
  // active responders), the selected incident id, the selected incident's
  // detail (incident + events, via fetchIncident), loading, and error state.
  // Fetch incidents and options on mount (see fetchIncidents and
  // fetchIncidentOptions in ./api), and fetch the selected incident's detail
  // whenever the selection changes.

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">On-call</p>
        <h1>Incident Management Console</h1>
      </header>

      {/* TODO (Step 1): render loading (role="status") and error (role="alert")
          states here. */}

      {/* TODO (Step 1): render a services section (<section aria-label="Services">)
          using the fetched options, an incident list section
          (<section aria-label="Incidents">) with a clickable row per incident
          showing title, severity, and status, an incident details section
          (<section aria-label="Incident details">) for the selected
          incident (service, assigned responder, severity, status), and a
          timeline section (<section aria-label="Timeline">) listing the
          selected incident's events in order. Use statusLabel/formatDate
          above where helpful. */}

      {/* TODO (Step 2): add a filters section (<section aria-label="Filters">)
          for status/severity/service/assigned, a summary section
          (<section aria-label="Summary">), a responder-assignment form
          (<form aria-label="Assign responder">), and a timeline-update form
          (<form aria-label="Add update">), each surfacing backend
          validation errors. */}

      {/* TODO (Step 3): add a status-change form
          (<form aria-label="Change status">) covering transitions and
          resolution, with backend validation error display. */}
    </main>
  );
}

export default App;
