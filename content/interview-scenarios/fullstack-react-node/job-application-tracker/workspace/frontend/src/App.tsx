import { useEffect, useState } from "react";
import { fetchApplications } from "./api";
import type { Application } from "./types";
import "./styles.css";

function statusLabel(status: string) {
  return status[0]!.toUpperCase() + status.slice(1);
}

function sourceLabel(source: string) {
  return source
    .split("_")
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join(" ");
}

export function App() {
  // TODO (Step 1): track applications, loading, and error state, and fetch
  // applications on mount (see fetchApplications in ./api).

  return (
    <main className="app-shell">
      <header className="page-header">
        <p className="eyebrow">Job Search</p>
        <h1>Job Application Tracker</h1>
      </header>

      {/* TODO (Step 1): render loading (role="status"), error (role="alert"),
          and empty states here. */}

      {/* TODO (Step 1): render the application list here (a
          <section aria-label="Applications"> containing one card per
          application). Each card should show company, role, location, status
          (use statusLabel above), source (use sourceLabel above), and notes
          (or a muted "No notes yet." placeholder). */}

      {/* TODO (Step 2): add status and source filter controls, a summary
          panel, and a create-application form above/below the list. */}

      {/* TODO (Step 3): add status and notes update controls to each card,
          and display backend validation errors from failed updates. */}
    </main>
  );
}

export default App;
