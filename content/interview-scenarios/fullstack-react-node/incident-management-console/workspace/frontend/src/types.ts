export type ServiceStatus = "operational" | "degraded" | "down";
export type ResponderRole = "engineer" | "manager" | "support";
export type IncidentSeverity = "sev1" | "sev2" | "sev3";
export type IncidentStatus = "open" | "investigating" | "monitoring" | "resolved";
export type IncidentEventType = "created" | "assigned" | "status_changed" | "update" | "resolved";

export interface Service {
  id: number;
  name: string;
  slug: string;
  status: ServiceStatus;
}

export interface Responder {
  id: number;
  name: string;
  email: string;
  role: ResponderRole;
}

export interface Incident {
  id: number;
  service: Service;
  assigned_responder: Responder | null;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  started_at: string;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface IncidentEvent {
  id: number;
  incident_id: number;
  responder: Responder | null;
  event_type: IncidentEventType;
  message: string;
  created_at: string;
}

export interface IncidentOptions {
  services: Service[];
  responders: Responder[];
}

export interface IncidentSummary {
  total: number;
  open: number;
  investigating: number;
  monitoring: number;
  resolved: number;
  sev1: number;
  sev2: number;
  sev3: number;
  unassigned: number;
}

export interface IncidentFilters {
  status?: IncidentStatus;
  severity?: IncidentSeverity;
  service_id?: number;
  assigned?: boolean;
}
