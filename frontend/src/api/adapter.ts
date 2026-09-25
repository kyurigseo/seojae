/**
 * Transforms backend1 API responses into the exact shapes the Figma-designed
 * components expect (see ../data/pharmacistData.ts). Keeps the UI components
 * untouched — all backend-specific mapping lives here.
 */
import {
  getAuditLog,
  getPatients,
  getPrescriptions,
  getTimeline,
  scorePrescription,
  type BackendGrade,
  type BackendPrescription,
} from "./client";
import { makeSignals, type DispensingEvent, type Patient, type RiskTier } from "../data/pharmacistData";

const GRADE_TO_TIER: Record<BackendGrade, RiskTier> = {
  safe: "안전",
  caution: "주의",
  high_risk: "고위험",
};

// Backend signal id -> Figma signal id (see backend/app/scoring/signals.py
// and pharmacistData.ts's makeSignals — weights match exactly: 40/30/20/20/10).
const SIGNAL_ID_MAP: Record<string, string> = {
  multi_institution_shopping: "shopping",
  early_refill: "refill",
  dose_spike: "dose",
  drug_switching: "switching",
  contraindicated_combo: "combo",
};

const CONTEXT_FLAG_LABELS: Record<string, string> = {
  cancer_pain: "암성 통증 완화",
  palliative_care: "호스피스·완화의료",
  post_surgery: "수술 후 통증",
  adhd_diagnosed: "ADHD 치료",
};

const STATUS_LABELS: Record<string, Patient["status"]> = {
  proceeded: "확인완료",
  held: "보류",
  justified: "사유기재",
  reported: "신고",
};

const INSTITUTION_COLORS = [
  "#2563eb", "#7c3aed", "#16a34a", "#d97706",
  "#0f9488", "#dc2626", "#0891b2", "#ea580c",
];

function institutionColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return INSTITUTION_COLORS[hash % INSTITUTION_COLORS.length];
}

function formatScanTime(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function formatDosage(items: BackendPrescription["items"]): string {
  return items.map((i) => `${i.dose_mg}mg × ${i.quantity}정`).join(" / ");
}

function isSameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** Picks each patient's most recent prescription — that's the one the
 * pharmacist is scanning "right now" in the reception queue. */
function latestPerPatient(prescriptions: BackendPrescription[]): BackendPrescription[] {
  const latest = new Map<string, BackendPrescription>();
  for (const rx of prescriptions) {
    const current = latest.get(rx.patient_id);
    if (!current || new Date(rx.issued_at) > new Date(current.issued_at)) {
      latest.set(rx.patient_id, rx);
    }
  }
  return [...latest.values()];
}

export async function fetchPharmacistPatients(): Promise<Patient[]> {
  const [prescriptions, backendPatients] = await Promise.all([getPrescriptions(), getPatients()]);
  const patientById = new Map(backendPatients.map((p) => [p.id, p]));
  const targets = latestPerPatient(prescriptions);

  return Promise.all(
    targets.map(async (rx): Promise<Patient> => {
      const [result, timeline] = await Promise.all([
        scorePrescription(rx.id),
        getTimeline(rx.patient_id),
      ]);
      const backendPatient = patientById.get(rx.patient_id);

      const overrides: Record<string, number> = {};
      for (const hit of result.signals) {
        const key = SIGNAL_ID_MAP[hit.signal];
        if (key) overrides[key] = hit.raw_points;
      }

      const age = backendPatient ? new Date(rx.issued_at).getFullYear() - backendPatient.birth_year : 0;

      const justifiedContext =
        result.context_adjustment < 1 && backendPatient
          ? backendPatient.context_flags.map((f) => CONTEXT_FLAG_LABELS[f] ?? f).join(" · ") || undefined
          : undefined;

      const timelineEvents: DispensingEvent[] = timeline.map((t) => ({
        date: new Date(t.issued_at).toLocaleDateString("ko-KR", { month: "long", day: "numeric" }),
        institution: t.institution,
        institutionColor: institutionColor(t.institution),
        medicine: t.items.map((i) => i.medicine).join(", "),
        isToday: isSameDay(t.issued_at, rx.issued_at) && t.prescription_id === rx.id,
      }));

      const currentAction = timeline.find((t) => t.prescription_id === rx.id)?.alert_action;

      return {
        id: rx.id,
        maskedName: rx.patient_name,
        age,
        medicines: rx.medicines,
        dosage: formatDosage(rx.items),
        prescribingInstitution: rx.institution,
        scanTime: formatScanTime(rx.issued_at),
        score: result.score,
        tier: GRADE_TO_TIER[result.grade],
        status: currentAction ? STATUS_LABELS[currentAction] ?? "대기" : "대기",
        pushAlertSent: result.grade === "high_risk",
        explanation: result.explanation,
        justifiedContext,
        signals: makeSignals(overrides),
        timeline: timelineEvents,
      };
    })
  );
}

export interface AuditLogRow {
  date: string;
  patient: string;
  age: number;
  score: number;
  tier: RiskTier;
  action: string;
  note: string;
}

export async function fetchAuditLogRows(): Promise<AuditLogRow[]> {
  const rows = await getAuditLog();
  return rows.map((r) => ({
    date: new Date(r.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" }),
    patient: r.patient_name,
    age: r.age ?? 0,
    score: r.score,
    tier: GRADE_TO_TIER[r.grade],
    action: r.action_label,
    note: r.note ?? "",
  }));
}
