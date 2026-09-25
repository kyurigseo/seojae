/**
 * Thin fetch wrapper around the backend1 scoring service
 * (see ../../../backend/app/api/routes.py for the source of truth).
 */

// Vite dev server runs on its own port; point at the FastAPI service via
// VITE_API_BASE_URL, or default to the standard local dev port.
export const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

/* ─── Backend response shapes (mirrors app/schemas.py) ──────────────────── */

export interface BackendPrescriptionItem {
  medicine: string;
  dose_mg: number;
  days_supply: number;
  quantity: number;
}

export interface BackendPrescription {
  id: string;
  patient_id: string;
  patient_name: string;
  institution: string;
  issued_at: string;
  medicines: string[];
  items: BackendPrescriptionItem[];
}

export interface BackendPatient {
  id: string;
  name: string;
  birth_year: number;
  consent_given: boolean;
  context_flags: string[];
}

export type BackendGrade = "safe" | "caution" | "high_risk";

export interface BackendSignalHit {
  signal: string;
  label: string;
  raw_points: number;
  detail: string;
}

export interface BackendRiskScoreResult {
  patient_id: string;
  prescription_id: string;
  score: number;
  grade: BackendGrade;
  rule_score: number;
  isolation_forest_score: number;
  context_adjustment: number;
  signals: BackendSignalHit[];
  explanation: string;
  scored_at: string;
}

export interface BackendTimelineEntry {
  prescription_id: string;
  issued_at: string;
  institution: string;
  items: { medicine: string; dose_mg: number; days_supply: number }[];
  score: BackendRiskScoreResult | null;
  alert_action: string | null;
}

export interface BackendAuditLogEntry {
  prescription_id: string;
  date: string;
  patient_name: string;
  age: number | null;
  score: number;
  grade: BackendGrade;
  grade_label: string;
  action: string;
  action_label: string;
  note: string | null;
}

/* ─── Endpoints ──────────────────────────────────────────────────────────── */

export const getPatients = () => api<BackendPatient[]>("/api/patients");

export const getPrescriptions = () => api<BackendPrescription[]>("/api/prescriptions");

export const scorePrescription = (prescriptionId: string) =>
  api<BackendRiskScoreResult>(`/api/prescriptions/${prescriptionId}/score`, { method: "POST" });

export const getTimeline = (patientId: string) =>
  api<BackendTimelineEntry[]>(`/api/patients/${patientId}/timeline`);

export const getAuditLog = () => api<BackendAuditLogEntry[]>("/api/audit-log");

export type PharmacistActionType = "proceeded" | "held" | "justified" | "reported";

export const postAlertAction = (prescriptionId: string, action: PharmacistActionType, note?: string) =>
  api<{ prescription_id: string; action: string; note: string | null }>(
    `/api/alerts/${prescriptionId}/action`,
    { method: "POST", body: JSON.stringify({ action, note: note || null }) }
  );

export const postConsent = (patientId: string, consent: boolean) =>
  api<{ patient_id: string; consent_given: boolean }>(
    `/api/patients/${patientId}/consent?consent=${consent}`,
    { method: "POST" }
  );
