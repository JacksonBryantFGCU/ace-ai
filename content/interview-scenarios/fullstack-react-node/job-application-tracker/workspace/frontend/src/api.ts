import type { Application, ApplicationSource, ApplicationStatus, ApplicationSummary } from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:4310";

interface ApplicationsResponse {
  applications: Application[];
}

interface ApplicationResponse {
  application: Application;
}

interface SummaryResponse {
  summary: ApplicationSummary;
}

export interface ApplicationQuery {
  status?: ApplicationStatus | "all";
  source?: ApplicationSource | "all";
}

async function parseJson<T>(response: Response): Promise<T> {
  const body = await response.json();
  if (!response.ok) {
    throw new Error(body.error ?? "Request failed");
  }
  return body as T;
}

export async function fetchApplications(query: ApplicationQuery = {}): Promise<Application[]> {
  const params = new URLSearchParams();
  if (query.status && query.status !== "all") params.set("status", query.status);
  if (query.source && query.source !== "all") params.set("source", query.source);
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const data = await parseJson<ApplicationsResponse>(await fetch(`${API_BASE_URL}/applications${suffix}`));
  return data.applications;
}

export async function fetchSummary(): Promise<ApplicationSummary> {
  const data = await parseJson<SummaryResponse>(await fetch(`${API_BASE_URL}/applications/summary`));
  return data.summary;
}

export async function createApplication(payload: {
  company: string;
  role: string;
  location: string;
  status?: ApplicationStatus;
  source?: ApplicationSource;
  notes?: string;
}): Promise<Application> {
  const data = await parseJson<ApplicationResponse>(
    await fetch(`${API_BASE_URL}/applications`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.application;
}

export async function updateApplication(
  id: number,
  payload: { status?: ApplicationStatus; notes?: string },
): Promise<Application> {
  const data = await parseJson<ApplicationResponse>(
    await fetch(`${API_BASE_URL}/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }),
  );
  return data.application;
}
