/**
 * Transforms backend1 API responses into the shapes PatientApp.tsx's mock
 * arrays use (MEDS/VISITS/HISTORY/MEDICINES/ALERTS). Same pattern as
 * ./adapter.ts for the pharmacist dashboard — components stay untouched.
 *
 * Login/onboarding is intentionally NOT wired to a real account system (out
 * of scope per project decision), so this always shows one fixed demo
 * patient. Swap DEMO_PATIENT_ID for a real session's patient id once auth
 * exists.
 */
import { getPatients, getTimeline, scorePrescription, type BackendTimelineEntry } from "./client";

export const DEMO_PATIENT_ID = "patient_c";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function api<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} failed: ${res.status}`);
  return res.json() as Promise<T>;
}

export interface BackendMedicine {
  id: string;
  name: string;
  ingredient: string;
  drug_class: string;
  standard_interval_days: number;
  patient_summary: string;
  common_side_effects: string;
  misuse_warning_signs: string[];
  non_drug_alternatives: string;
}

const CATEGORY_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  opioid: { label: "진통제", color: "#7C3AED", bg: "#F5F3FF" },
  sedative_hypnotic: { label: "수면·진정제", color: "#D97706", bg: "#FFFBEB" },
  benzodiazepine: { label: "항불안제", color: "#35A8B5", bg: "#EBF8FA" },
  stimulant: { label: "ADHD 치료제", color: "#2563EB", bg: "#EFF6FF" },
  anesthetic: { label: "마취제", color: "#DC2626", bg: "#FEF2F2" },
};

/** Ensures every scored-or-not timeline entry has a score, scoring the
 * unscored ones. Returns the enriched list (newest last, same order as
 * the timeline endpoint). */
async function loadScoredTimeline(patientId: string): Promise<BackendTimelineEntry[]> {
  const timeline = await getTimeline(patientId);
  const scored = await Promise.all(
    timeline.map(async (entry) => {
      if (entry.score) return entry;
      const result = await scorePrescription(entry.prescription_id);
      return { ...entry, score: result };
    })
  );
  return scored;
}

export interface PatientProfile {
  id: string;
  name: string;
  consentGiven: boolean;
}

export async function fetchPatientProfile(patientId = DEMO_PATIENT_ID): Promise<PatientProfile> {
  const patients = await getPatients();
  const p = patients.find((x) => x.id === patientId);
  if (!p) throw new Error(`patient ${patientId} not found`);
  return { id: p.id, name: p.name, consentGiven: p.consent_given };
}

export interface CurrentMed {
  name: string;
  active: string;
  dosage: string;
  institution: string;
  pct: number;
  color: string;
}

export interface Visit {
  date: string;
  institution: string;
  medicine: string;
  color: string;
}

export interface HistoryEntry {
  date: string;
  institution: string;
  medicine: string;
  dosage: string;
  days: number;
  color: string;
}

export interface PatientAlert {
  date: string;
  title: string;
  body: string;
  read: boolean;
  level: string;
}

const PALETTE = ["#7C3AED", "#2563EB", "#D97706", "#0F9488", "#DC2626"];
function colorFor(institution: string): string {
  let hash = 0;
  for (let i = 0; i < institution.length; i++) hash = (hash * 31 + institution.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function formatKoreanDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}월 ${d.getDate()}일`;
}

export interface PatientDashboard {
  currentMeds: CurrentMed[];
  recentVisits: Visit[];
  history: HistoryEntry[];
  alerts: PatientAlert[];
  hasUnreadAlert: boolean;
}

/** Gentle, non-clinical rewrite of the pharmacist-facing explanation — the
 * pharmacist dashboard's XAI text is written to justify a hold/refusal
 * (5번 기능 A), which is the wrong tone for a patient notification
 * (proposal's own patient screens read as reassuring, not accusatory). */
function patientFriendlyAlertBody(signalCount: number): string {
  if (signalCount === 0) {
    return "최근 처방 패턴이 평소와 조금 다르게 나타났습니다. 걱정하지 마시고, 약사나 담당 의사와 간단히 이야기 나눠보시면 좋겠습니다.";
  }
  return `최근 ${signalCount}가지 처방 패턴이 평소와 다르게 감지됐습니다. 여러 병원 진료나 치료 계획 변경 등 정당한 이유가 있는 경우가 많으니 걱정하지 마시고, 약사나 담당 의사와 편하게 이야기 나눠보세요.`;
}

export async function fetchPatientDashboard(patientId = DEMO_PATIENT_ID): Promise<PatientDashboard> {
  const timeline = await loadScoredTimeline(patientId);
  const sorted = [...timeline].sort(
    (a, b) => new Date(b.issued_at).getTime() - new Date(a.issued_at).getTime()
  );

  const history: HistoryEntry[] = sorted.map((t) => ({
    date: new Date(t.issued_at).toISOString().slice(0, 10),
    institution: t.institution,
    medicine: t.items.map((i) => i.medicine).join(", "),
    dosage: t.items.map((i) => `${i.dose_mg}mg`).join(", "),
    days: t.items[0]?.days_supply ?? 0,
    color: colorFor(t.institution),
  }));

  const recentVisits: Visit[] = sorted.slice(0, 4).map((t) => ({
    date: formatKoreanDate(t.issued_at),
    institution: t.institution,
    medicine: t.items.map((i) => i.medicine).join(", "),
    color: colorFor(t.institution),
  }));

  // "Currently taking": latest prescription per distinct medicine, with
  // remaining-supply % based on days_supply elapsed since issued_at.
  const latestByMed = new Map<string, BackendTimelineEntry>();
  for (const t of sorted) {
    for (const item of t.items) {
      if (!latestByMed.has(item.medicine)) latestByMed.set(item.medicine, t);
    }
  }
  const now = Date.now();
  const currentMeds: CurrentMed[] = [...latestByMed.entries()].map(([medName, t]) => {
    const item = t.items.find((i) => i.medicine === medName)!;
    const elapsedDays = (now - new Date(t.issued_at).getTime()) / 86_400_000;
    const pct = item.days_supply > 0
      ? Math.max(0, Math.round(100 - (elapsedDays / item.days_supply) * 100))
      : 0;
    return {
      name: medName,
      active: medName,
      dosage: `${item.dose_mg}mg`,
      institution: t.institution,
      pct,
      color: colorFor(t.institution),
    };
  });

  const alerts: PatientAlert[] = sorted
    .filter((t) => t.score && t.score.grade !== "safe")
    .map((t) => ({
      date: new Date(t.issued_at).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" }),
      title:
        t.score!.grade === "high_risk"
          ? "진료팀과 함께 확인해볼 사항이 있습니다"
          : "가볍게 확인해볼 사항이 있습니다",
      body: patientFriendlyAlertBody(t.score!.signals.length),
      read: t.alert_action != null,
      level: t.score!.grade === "high_risk" ? "주의" : "안내",
    }));

  return {
    currentMeds,
    recentVisits,
    history,
    alerts,
    hasUnreadAlert: alerts.some((a) => !a.read),
  };
}

export interface LibraryMedicine {
  name: string;
  category: string;
  categoryColor: string;
  categoryBg: string;
  treats: string;
  effects: string;
  signs: string[];
  alternatives: string;
}

export async function fetchMedicineLibrary(): Promise<LibraryMedicine[]> {
  const medicines = await api<BackendMedicine[]>("/api/medicines");
  return medicines.map((m) => {
    const cat = CATEGORY_LABEL[m.drug_class] ?? { label: m.drug_class, color: "#5A8A95", bg: "#EBF8FA" };
    return {
      name: m.name,
      category: cat.label,
      categoryColor: cat.color,
      categoryBg: cat.bg,
      treats: m.patient_summary,
      effects: m.common_side_effects,
      signs: m.misuse_warning_signs,
      alternatives: m.non_drug_alternatives,
    };
  });
}
