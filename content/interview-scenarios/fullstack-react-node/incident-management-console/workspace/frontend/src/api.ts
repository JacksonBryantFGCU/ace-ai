import type {
  Incident,
  IncidentEvent,
  IncidentFilters,
  IncidentOptions,
  IncidentStatus,
  IncidentSummary,
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4320";

interface IncidentsResponse {
  incidents: Incident[];
}

interface IncidentDetailResponse {
  incident: Incident;
  events: IncidentEvent[];
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

function buildQuery(filters: IncidentFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.severity) params.set("severity", filters.severity);
  if (filters.service_id !== undefined) params.set("service_id", String(filters.service_id));
  if (filters.assigned !== undefined) params.set("assigned", String(filters.assigned));
  const query = params.toString();
  return query ? `?${query}` : "";
}

export async function fetchIncidents(filters: IncidentFilters = {}): Promise<Incident[]> {
  const data = await parseJson<IncidentsResponse>(await fetch(`${API_BASE_URL}/incidents${buildQuery(filters)}`));
  return data.incidents;
}

export async function fetchIncident(id: number): Promise<IncidentDetailResponse> {
  return parseJson<IncidentDetailResponse>(await fetch(`${API_BASE_URL}/incidents/${id}`));
}

export async function fetchIncidentOptions(): Promise<IncidentOptions> {
  return parseJson<IncidentOptions>(await fetch(`${API_BASE_URL}/incident-options`));
}

export async function fetchIncidentSummary(): Promise<IncidentSummary> {
  const data = await parseJson<{ summary: IncidentSummary }>(await fetch(`${API_BASE_URL}/incidents/summary`));
  return data.summary;
}

export async function assignResponder(
  incidentId: number,
  responderId: number,
): Promise<{ incident: Incident; event: IncidentEvent }> {
  return parseJson<{ incident: Incident; event: IncidentEvent }>(
    await fetch(`${API_BASE_URL}/incidents/${incidentId}/assign`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ responder_id: responderId }),
    }),
  );
}

export async function addIncidentEvent(
  incidentId: number,
  input: { responder_id: number; message: string },
): Promise<{ incident: Incident; event: IncidentEvent }> {
  return parseJson<{ incident: Incident; event: IncidentEvent }>(
    await fetch(`${API_BASE_URL}/incidents/${incidentId}/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}

export async function changeIncidentStatus(
  incidentId: number,
  input: { status: IncidentStatus; responder_id: number; message: string },
): Promise<{ incident: Incident; event: IncidentEvent }> {
  return parseJson<{ incident: Incident; event: IncidentEvent }>(
    await fetch(`${API_BASE_URL}/incidents/${incidentId}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    }),
  );
}
