import { useState, useRef, useEffect } from "react";
import { patients as mockPatients, auditLog as mockAuditLog, type Patient, type RiskTier } from "./data/pharmacistData";
import { MedisyncChar } from "./MedisyncChar";
import { fetchPharmacistPatients, fetchAuditLogRows, type AuditLogRow } from "./api/adapter";
import { postAlertAction, type PharmacistActionType } from "./api/client";

type View = "queue" | "reports" | "history";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const MS = {
  sidebar:  "#0F3540",
  sidebar2: "#163D4A",
  bg:       "#F5FAFB",
  card:     "#FFFFFF",
  border:   "#D8EFF2",
  text:     "#0D2E38",
  muted:    "#5A8A95",
  action:   "#35A8B5",
  brand:    "#DFF4F5",
  brand2:   "#BFE8ED",
};

const RISK: Record<RiskTier, { color: string; bg: string; border: string; track: string }> = {
  "안전":   { color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0", track: "#DCFCE7" },
  "주의":   { color: "#D97706", bg: "#FFFBEB", border: "#FDE68A", track: "#FEF3C7" },
  "고위험": { color: "#DC2626", bg: "#FEF2F2", border: "#FECACA", track: "#FEE2E2" },
};

const STATUS_CFG: Record<string, { bg: string; color: string }> = {
  "대기":    { bg: "#F1F5F9", color: "#64748B" },
  "확인완료":{ bg: "#F0FDF4", color: "#16A34A" },
  "사유기재":{ bg: "#EFF6FF", color: "#2563EB" },
  "보류":    { bg: "#FFFBEB", color: "#D97706" },
  "신고":    { bg: "#FEF2F2", color: "#DC2626" },
};

/* ─── Risk Score Gauge ────────────────────────────────────────────────────── */
function RiskGauge({ score, tier }: { score: number; tier: RiskTier }) {
  const { color, track } = RISK[tier];
  const size = 180;
  const cx = size / 2;
  const cy = size / 2 + 8;
  const r = 68;
  const strokeW = 14;
  const startAngle = 135;
  const totalSweep = 270;
  const sweepAngle = (score / 100) * totalSweep;

  function polarXY(angleDeg: number) {
    const rad = (angleDeg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  const s = polarXY(startAngle);
  const bgEnd = polarXY(startAngle + totalSweep);
  const fgEnd = polarXY(startAngle + sweepAngle);

  const bgD = `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 1 1 ${bgEnd.x.toFixed(2)} ${bgEnd.y.toFixed(2)}`;
  const fgD = score === 0
    ? ""
    : `M ${s.x.toFixed(2)} ${s.y.toFixed(2)} A ${r} ${r} 0 ${sweepAngle > 180 ? 1 : 0} 1 ${fgEnd.x.toFixed(2)} ${fgEnd.y.toFixed(2)}`;

  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} overflow="visible">
        {/* Track labels */}
        <text x={s.x - 6} y={s.y + 4} textAnchor="middle" style={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Inter, sans-serif" }}>0</text>
        <text x={bgEnd.x + 6} y={bgEnd.y + 4} textAnchor="middle" style={{ fontSize: 10, fill: "#94A3B8", fontFamily: "Inter, sans-serif" }}>100</text>
        {/* Background track */}
        <path d={bgD} fill="none" stroke={track} strokeWidth={strokeW} strokeLinecap="round" />
        {/* Score arc */}
        {score > 0 && (
          <path d={fgD} fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round" />
        )}
        {/* Center dot */}
        <circle cx={cx} cy={cy} r={3} fill={color} opacity={0.5} />
      </svg>
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        paddingBottom: 0,
      }}>
        <span className="font-mono-data" style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color: MS.text, letterSpacing: "-0.04em" }}>
          {score}
        </span>
        <span style={{ fontSize: 11, fontWeight: 700, color, marginTop: 4, letterSpacing: "0.02em" }}>{tier}</span>
        <span style={{ fontSize: 10, color: "#94A3B8", marginTop: 2 }}>위험 점수</span>
      </div>
    </div>
  );
}

/* ─── Small inline badge ─────────────────────────────────────────────────── */
function RiskBadge({ score, tier }: { score: number; tier: RiskTier }) {
  const { color, bg, border } = RISK[tier];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-700 font-mono-data"
      style={{ background: bg, color, border: `1px solid ${border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: color, display: "inline-block" }} />
      {score} · {tier}
    </span>
  );
}

function StatusTag({ status }: { status: Patient["status"] }) {
  const { bg, color } = STATUS_CFG[status] ?? STATUS_CFG["대기"];
  return <span className="px-2.5 py-0.5 rounded-md text-xs font-600" style={{ background: bg, color }}>{status}</span>;
}

/* ─── Signal Bar ──────────────────────────────────────────────────────────── */
function SignalBar({ signal }: { signal: Patient["signals"][0] }) {
  const pct = signal.maxPts > 0 ? (signal.pts / signal.maxPts) * 100 : 0;
  const barColor = !signal.triggered ? "#E2E8F0"
    : signal.pts >= 30 ? "#DC2626"
    : signal.pts >= 20 ? "#D97706"
    : "#F59E0B";

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "6px 0" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, width: 148, flexShrink: 0 }}>
        <span style={{
          width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
          background: signal.triggered ? barColor : "#CBD5E1"
        }} />
        <span style={{ fontSize: 12, color: signal.triggered ? MS.text : "#94A3B8", fontFamily: "Inter, sans-serif", lineHeight: 1.3 }}>
          {signal.label}
        </span>
      </div>
      <div style={{ flex: 1, height: 8, borderRadius: 4, background: "#F1F5F9", overflow: "hidden" }}>
        <div style={{
          height: "100%", borderRadius: 4,
          width: `${pct}%`,
          background: barColor,
          transition: "width 0.5s cubic-bezier(.4,0,.2,1)"
        }} />
      </div>
      <span className="font-mono-data" style={{
        width: 42, textAlign: "right", fontSize: 12, fontWeight: 600,
        color: signal.triggered ? barColor : "#CBD5E1"
      }}>
        {signal.triggered ? `+${signal.pts}` : "—"}
      </span>
    </div>
  );
}

/* ─── Dispensing Timeline ─────────────────────────────────────────────────── */
function DispensingTimeline({ events }: { events: Patient["timeline"] }) {
  return (
    <div style={{ overflowX: "auto", paddingBottom: 8 }} className="hide-scrollbar">
      <div style={{ display: "flex", alignItems: "flex-start", minWidth: "max-content", position: "relative" }}>
        {/* Connector line */}
        <div style={{
          position: "absolute",
          top: 10, left: 20, right: 20,
          height: 1,
          background: "linear-gradient(to right, #D8EFF2, #D8EFF2)"
        }} />
        {events.map((ev, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 110, position: "relative" }}>
            {/* Node */}
            <div style={{
              width: ev.isToday ? 20 : 14,
              height: ev.isToday ? 20 : 14,
              borderRadius: "50%",
              background: ev.isToday ? ev.institutionColor : "#fff",
              border: `2.5px solid ${ev.institutionColor}`,
              boxShadow: ev.isToday ? `0 0 0 5px ${ev.institutionColor}22` : "none",
              zIndex: 1,
              position: "relative",
              transition: "all 0.2s"
            }} />
            {/* Label */}
            <div style={{ textAlign: "center", marginTop: 10, padding: "0 4px" }}>
              <p style={{
                fontWeight: ev.isToday ? 700 : 500,
                fontSize: 11,
                color: ev.isToday ? ev.institutionColor : "#94A3B8",
                fontFamily: "Inter, sans-serif"
              }}>
                {ev.isToday ? "오늘" : ev.date}
              </p>
              <p style={{ fontSize: 10, color: MS.muted, marginTop: 2, lineHeight: 1.4 }}>{ev.institution}</p>
              <p style={{ fontSize: 10, color: "#94A3B8", marginTop: 1, lineHeight: 1.3 }}>{ev.medicine}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// MedisyncChar imported from ./MedisyncChar — use state="analysis" in AI explanation panels

/* ─── Risk Detail Modal ───────────────────────────────────────────────────── */
function RiskDetailModal({
  patient,
  onClose,
  onActionRecorded,
}: {
  patient: Patient;
  onClose: () => void;
  onActionRecorded: () => void;
}) {
  const [note, setNote] = useState(patient.pharmacistNote ?? "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [confirmReport, setConfirmReport] = useState(false);
  const [clarifyOpen, setClarifyOpen] = useState(false);
  const [clarifyMsg, setClarifyMsg] = useState("");
  const [action, setAction] = useState<"proceeded" | "held" | "reported" | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submitAction = async (type: PharmacistActionType) => {
    setSubmitting(true);
    try {
      await postAlertAction(patient.id, type, note || undefined);
      onActionRecorded();
    } catch (err) {
      console.error("Failed to record pharmacist action", err);
    } finally {
      setSubmitting(false);
    }
  };

  if (action) {
    const isProceeded = action === "proceeded";
    const isReported = action === "reported";
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: "rgba(13,46,56,0.72)"
      }}>
        <div style={{ background: "#fff", borderRadius: 20, padding: 40, textAlign: "center", maxWidth: 360, width: "90%", boxShadow: "0 24px 60px rgba(0,0,0,0.18)" }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16, margin: "0 auto 20px",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: isProceeded ? "#F0FDF4" : isReported ? "#FEF2F2" : "#FFFBEB"
          }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              {isProceeded
                ? <path d="M5 12l5 5L20 7" stroke="#16A34A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                : isReported
                ? <path d="M12 9v4m0 4h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                : <path d="M10 9v6m4-6v6" stroke="#D97706" strokeWidth="2.5" strokeLinecap="round"/>}
            </svg>
          </div>
          <p style={{ fontSize: 17, fontWeight: 700, color: MS.text, marginBottom: 8 }}>
            {isProceeded ? "조제 완료 처리됨" : isReported ? "신고 접수됨" : "처방전 보류 처리됨"}
          </p>
          <p style={{ fontSize: 13, color: MS.muted, lineHeight: 1.65, marginBottom: 24 }}>
            {isProceeded
              ? "조제 내역이 기록되었습니다. 입력하신 메모가 감사 로그에 저장됩니다."
              : isReported
              ? "공식 신고가 접수되었습니다. 감사 로그에 기록됩니다."
              : "이 처방전이 보류로 표시되었습니다. 처방 의사에게 통보됩니다."}
          </p>
          <button onClick={onClose}
            style={{ padding: "10px 28px", borderRadius: 12, background: MS.action, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>
            대기열로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const tierCfg = RISK[patient.tier];

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(13,46,56,0.72)"
    }}>
      <div style={{
        width: "100%", maxWidth: 900, maxHeight: "92vh", margin: "0 16px",
        background: "#fff", borderRadius: 20, overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "0 32px 80px rgba(0,0,0,0.2)",
        fontFamily: "Inter, sans-serif"
      }}>

        {/* ── Modal header ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: 16,
          padding: "20px 24px 18px", borderBottom: `1px solid ${MS.border}`
        }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <h2 style={{ fontSize: 17, fontWeight: 700, color: MS.text, margin: 0 }}>
                {patient.maskedName}, {patient.age}세
              </h2>
              <RiskBadge score={patient.score} tier={patient.tier} />
              {patient.pushAlertSent && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#FEF2F2", color: "#DC2626", fontWeight: 600 }}>
                  실시간 알림 발송됨
                </span>
              )}
              {!patient.pushAlertSent && patient.tier === "주의" && (
                <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 6, background: "#FFFBEB", color: "#92400E", fontWeight: 600 }}>
                  대시보드 표시 전용
                </span>
              )}
            </div>
            <p style={{ fontSize: 13, color: "#334155", margin: "0 0 2px" }}>{patient.medicines.join(" + ")} · {patient.dosage}</p>
            <p style={{ fontSize: 12, color: "#94A3B8", margin: 0 }}>{patient.prescribingInstitution} · 스캔 {patient.scanTime}</p>
          </div>
          <button onClick={onClose}
            style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: MS.bg, color: MS.muted, cursor: "pointer", flexShrink: 0, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>
            ✕
          </button>
        </div>

        {/* ── Body: 2-column ── */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

          {/* Left: Score + Signals */}
          <div style={{
            width: 320, flexShrink: 0, borderRight: `1px solid ${MS.border}`,
            display: "flex", flexDirection: "column", overflow: "hidden"
          }}>
            {/* Score gauge */}
            <div style={{
              padding: "24px 20px 20px",
              display: "flex", flexDirection: "column", alignItems: "center",
              background: tierCfg.bg, borderBottom: `1px solid ${tierCfg.border}`
            }}>
              <RiskGauge score={patient.score} tier={patient.tier} />
              {patient.justifiedContext && (
                <div style={{
                  display: "flex", alignItems: "center", gap: 6, marginTop: 10,
                  padding: "6px 12px", borderRadius: 10, background: "#F0FDF4", border: "1px solid #BBF7D0"
                }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
                    <path d="M12 2L3 7v5c0 5.25 3.75 10.15 9 11.25C17.25 22.15 21 17.25 21 12V7z" stroke="#16A34A" strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                  <p style={{ fontSize: 11, fontWeight: 600, color: "#16A34A", margin: 0 }}>
                    정당 사유: {patient.justifiedContext}
                  </p>
                </div>
              )}
            </div>

            {/* Signal breakdown */}
            <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px" }} className="hide-scrollbar">
              <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>
                위험 신호 분석
              </p>
              <div style={{ display: "flex", flexDirection: "column" }}>
                {patient.signals.map(s => <SignalBar key={s.id} signal={s} />)}
              </div>
              <div style={{ marginTop: 14, padding: "10px 12px", borderRadius: 10, background: MS.bg, border: `1px solid ${MS.border}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: MS.muted }}>합산 위험 점수</span>
                  <span className="font-mono-data" style={{ fontSize: 18, fontWeight: 700, color: RISK[patient.tier].color }}>
                    {patient.score}점
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: AI explanation + timeline + actions */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }} className="hide-scrollbar">

              {/* AI Explanation */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                  {/* analysis state: character holds magnifying glass — appropriate for AI explanation */}
                  <MedisyncChar size={40} state="analysis" />
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700, color: MS.action, letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
                      Medisync AI 설명
                    </p>
                    <p style={{ fontSize: 10, color: "#94A3B8", margin: "2px 0 0" }}>모델 기반 자동 분석 · 약사 검토 필요</p>
                  </div>
                </div>
                <div style={{ padding: "14px 16px", borderRadius: 12, background: MS.bg, border: `1px solid ${MS.border}` }}>
                  <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.7, margin: 0 }}>{patient.explanation}</p>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "#94A3B8", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0 }}>
                    처방 조제 타임라인
                  </p>
                  <span style={{ fontSize: 10, color: "#CBD5E1" }}>색상 = 기관 구분</span>
                </div>
                <div style={{ padding: "16px", borderRadius: 12, background: MS.bg, border: `1px solid ${MS.border}` }}>
                  <DispensingTimeline events={patient.timeline} />
                </div>
              </div>

              {/* Clarify form */}
              {clarifyOpen && (
                <div style={{ marginBottom: 16, padding: 16, borderRadius: 12, border: `1px solid ${MS.border}` }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: MS.text, marginBottom: 8 }}>처방 의사에게 확인 요청</p>
                  <textarea
                    value={clarifyMsg}
                    onChange={e => setClarifyMsg(e.target.value)}
                    placeholder="팩스/SMS로 처방 의사에게 전송할 문의 내용을 입력하세요…"
                    rows={3}
                    style={{
                      width: "100%", fontSize: 13, padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${MS.border}`, outline: "none", resize: "none",
                      fontFamily: "Inter, sans-serif", color: MS.text, background: MS.bg, boxSizing: "border-box"
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button style={{ padding: "8px 16px", borderRadius: 8, background: MS.action, color: "#fff", fontSize: 13, fontWeight: 600, border: "none", cursor: "pointer" }}>전송</button>
                    <button onClick={() => setClarifyOpen(false)} style={{ padding: "8px 16px", fontSize: 13, fontWeight: 500, color: MS.muted, background: "none", border: "none", cursor: "pointer" }}>취소</button>
                  </div>
                </div>
              )}

              {/* Note */}
              <div>
                <button onClick={() => setNoteOpen(!noteOpen)}
                  style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: MS.muted, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: noteOpen ? "rotate(180deg)" : "none", transition: "transform 0.18s" }}>
                    <path d="M6 9l6 6 6-6" stroke={MS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  메모 추가 (선택)
                </button>
                {noteOpen && (
                  <textarea value={note} onChange={e => setNote(e.target.value)}
                    placeholder="임상적 판단 근거를 기록하세요. 감사 로그에 저장되며 모델 재학습에 반영됩니다."
                    rows={3}
                    style={{
                      width: "100%", marginTop: 8, fontSize: 13, padding: "10px 12px", borderRadius: 10,
                      border: `1px solid ${MS.border}`, outline: "none", resize: "none",
                      fontFamily: "Inter, sans-serif", color: MS.text, background: MS.bg, boxSizing: "border-box"
                    }}
                  />
                )}
              </div>
            </div>

            {/* ── Actions ── */}
            <div style={{
              padding: "14px 24px", borderTop: `1px solid ${MS.border}`,
              display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center",
              background: "#fff"
            }}>
              {confirmReport ? (
                <div style={{
                  width: "100%", padding: "12px 16px", borderRadius: 12,
                  background: "#FEF2F2", border: "1px solid #FECACA",
                  display: "flex", alignItems: "center", gap: 12
                }}>
                  <p style={{ fontSize: 13, flex: 1, color: "#991B1B", margin: 0 }}>공식 신고가 접수됩니다. 계속하시겠습니까?</p>
                  <button disabled={submitting} onClick={async () => { await submitAction("reported"); setAction("reported"); }}
                    style={{ padding: "8px 18px", borderRadius: 8, background: "#DC2626", color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}>신고 확인</button>
                  <button onClick={() => setConfirmReport(false)} style={{ padding: "8px 12px", fontSize: 13, color: MS.muted, background: "none", border: "none", cursor: "pointer" }}>취소</button>
                </div>
              ) : (
                <>
                  <button disabled={submitting} onClick={async () => { await submitAction("proceeded"); setAction("proceeded"); }}
                    style={{ padding: "10px 24px", borderRadius: 10, background: MS.action, color: "#fff", fontSize: 13, fontWeight: 700, border: "none", cursor: submitting ? "default" : "pointer", boxShadow: `0 2px 10px ${MS.action}50`, opacity: submitting ? 0.6 : 1 }}>
                    조제 진행
                  </button>
                  <button disabled={submitting} onClick={async () => { await submitAction("held"); setAction("held"); }}
                    style={{ padding: "10px 22px", borderRadius: 10, background: "#fff", color: MS.text, fontSize: 13, fontWeight: 600, border: `1.5px solid ${MS.border}`, cursor: submitting ? "default" : "pointer", opacity: submitting ? 0.6 : 1 }}>
                    보류
                  </button>
                  <button onClick={() => setClarifyOpen(!clarifyOpen)}
                    style={{ padding: "10px 22px", borderRadius: 10, background: "#fff", color: MS.text, fontSize: 13, fontWeight: 600, border: `1.5px solid ${MS.border}`, cursor: "pointer" }}>
                    처방의에게 확인 요청
                  </button>
                  <button onClick={() => setConfirmReport(true)}
                    style={{ padding: "10px 18px", borderRadius: 10, background: "#FEF2F2", color: "#DC2626", fontSize: 13, fontWeight: 600, border: "1.5px solid #FECACA", cursor: "pointer", marginLeft: "auto" }}>
                    신고
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Reception Queue ────────────────────────────────────────────────────── */
function ReceptionQueue({ patients, onActionRecorded }: { patients: Patient[]; onActionRecorded: () => void }) {
  const [selected, setSelected] = useState<Patient | null>(null);
  const [scan, setScan] = useState("");
  const [scanning, setScanning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scan.trim()) return;
    setScanning(true);
    setTimeout(() => { setScanning(false); setScan(""); }, 1200);
  };

  const counts = {
    total: patients.length,
    high: patients.filter(p => p.tier === "고위험").length,
    caution: patients.filter(p => p.tier === "주의").length,
    safe: patients.filter(p => p.tier === "안전").length,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* Scanner + summary strip */}
      <div style={{
        padding: "12px 24px", borderBottom: `1px solid ${MS.border}`,
        background: MS.card, display: "flex", alignItems: "center", gap: 16
      }}>
        <form onSubmit={handleScan} style={{ flex: 1, maxWidth: 400 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 14px",
            borderRadius: 12, border: `1.5px solid ${scanning ? MS.action : MS.border}`,
            background: MS.bg, transition: "border-color 0.15s"
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="M3 5h2V3a2 2 0 0 1 2-2h1M3 19h2v2a2 2 0 0 0 2 2h1M19 5h-2V3a2 2 0 0 0-2-2h-1M19 19h-2v2a2 2 0 0 1-2 2h-1M7 9h10M7 12h10M7 15h6"
                stroke={scanning ? MS.action : MS.muted} strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input ref={inputRef} value={scan} onChange={e => setScan(e.target.value)}
              placeholder="처방전 바코드를 스캔하세요…" autoFocus
              style={{ flex: 1, fontSize: 13, outline: "none", background: "transparent", fontFamily: "Inter, sans-serif", color: MS.text, border: "none" }} />
            {scanning && <span style={{ fontSize: 12, fontWeight: 600, color: MS.action }}>처리 중…</span>}
          </div>
        </form>

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, marginLeft: "auto" }}>
          {[
            { label: "전체", val: counts.total, color: MS.muted, bg: MS.bg, border: MS.border },
            { label: "안전", val: counts.safe, color: "#16A34A", bg: "#F0FDF4", border: "#BBF7D0" },
            { label: "주의", val: counts.caution, color: "#D97706", bg: "#FFFBEB", border: "#FDE68A" },
            { label: "고위험", val: counts.high, color: "#DC2626", bg: "#FEF2F2", border: "#FECACA" },
          ].map(({ label, val, color, bg, border }) => (
            <div key={label} style={{
              display: "flex", alignItems: "baseline", gap: 4, padding: "6px 14px",
              borderRadius: 10, background: bg, border: `1px solid ${border}`
            }}>
              <span className="font-mono-data" style={{ fontSize: 22, fontWeight: 700, color, lineHeight: 1 }}>{val}</span>
              <span style={{ fontSize: 10, color, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.04em" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: "auto" }} className="hide-scrollbar">
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${MS.border}` }}>
              {["환자", "의약품", "스캔 시각", "위험도", "상태", ""].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  color: MS.muted, background: MS.bg
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {patients.map(p => (
              <tr key={p.id}
                onClick={() => setSelected(p)}
                className="queue-row"
                style={{
                  borderBottom: "1px solid #F1F5F9", cursor: "pointer",
                  borderLeft: `3px solid ${RISK[p.tier].color}`,
                }}>
                <td style={{ padding: "14px 20px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: MS.text, margin: "0 0 2px" }}>{p.maskedName}</p>
                  <p style={{ fontSize: 12, color: MS.muted, margin: 0 }}>{p.age}세</p>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <p style={{ fontSize: 13, color: "#334155", margin: "0 0 2px" }}>{p.medicines.join(", ")}</p>
                  <p style={{ fontSize: 11, color: MS.muted, margin: 0 }}>{p.prescribingInstitution}</p>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span className="font-mono-data" style={{ fontSize: 13, color: MS.muted }}>{p.scanTime}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <div>
                    <RiskBadge score={p.score} tier={p.tier} />
                    {p.pushAlertSent && <p style={{ fontSize: 11, color: "#DC2626", margin: "4px 0 0" }}>알림 발송됨</p>}
                    {p.tier === "주의" && !p.pushAlertSent && <p style={{ fontSize: 11, color: "#D97706", margin: "4px 0 0" }}>대시보드만 표시</p>}
                  </div>
                </td>
                <td style={{ padding: "14px 20px" }}><StatusTag status={p.status} /></td>
                <td style={{ padding: "10px 20px", textAlign: "right" }}>
                  <div style={{
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    width: 30, height: 30, borderRadius: "50%",
                    background: MS.brand, border: `1px solid ${MS.brand2}`
                  }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M9 18l6-6-6-6" stroke={MS.action} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selected && (
        <RiskDetailModal
          patient={selected}
          onClose={() => setSelected(null)}
          onActionRecorded={onActionRecorded}
        />
      )}
    </div>
  );
}

/* ─── Reports View ───────────────────────────────────────────────────────── */
function ReportsView({ patients }: { patients: Patient[] }) {
  const total = patients.length + 14;
  const byTier: Record<RiskTier, number> = {
    "안전":   patients.filter(p => p.tier === "안전").length + 9,
    "주의":   patients.filter(p => p.tier === "주의").length + 2,
    "고위험": patients.filter(p => p.tier === "고위험").length + 3,
  };
  const maxBar = Math.max(...Object.values(byTier));

  return (
    <div style={{ flex: 1, overflowY: "auto", padding: "28px 28px", fontFamily: "Inter, sans-serif" }} className="hide-scrollbar">
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 20, fontWeight: 700, color: MS.text, letterSpacing: "-0.02em", margin: "0 0 4px" }}>월간 요약</h2>
        <p style={{ fontSize: 13, color: MS.muted, margin: 0 }}>2024년 11월 · 한강약국</p>
      </div>

      {/* KPI row */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14, marginBottom: 20 }}>
        {[
          { label: "총 스캔 건수", value: total, unit: "건", sub: "이번 달 전체", accent: MS.action },
          { label: "사유 기재율", value: "18", unit: "%", sub: "고위험 조제 진행", accent: "#DC2626" },
          { label: "가장 많은 신호", value: "조기", unit: "재방", sub: "최다 발생 유형", accent: "#D97706" },
          { label: "평균 리스크 점수", value: "34", unit: "점", sub: "전체 처방전 기준", accent: "#16A34A" },
        ].map(({ label, value, unit, sub, accent }) => (
          <div key={label} style={{ borderRadius: 16, border: `1px solid ${MS.border}`, background: MS.card, overflow: "hidden" }}>
            <div style={{ height: 3, background: accent, borderRadius: "0" }} />
            <div style={{ padding: "18px 20px 20px" }}>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 4, marginBottom: 4 }}>
                <span className="font-mono-data" style={{ fontSize: 32, fontWeight: 700, color: MS.text, letterSpacing: "-0.03em", lineHeight: 1 }}>{value}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: MS.muted, paddingBottom: 2 }}>{unit}</span>
              </div>
              <p style={{ fontSize: 12, fontWeight: 600, color: MS.text, margin: "0 0 2px" }}>{label}</p>
              <p style={{ fontSize: 11, color: MS.muted, margin: 0 }}>{sub}</p>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Bar chart */}
        <div style={{ borderRadius: 16, padding: 20, border: `1px solid ${MS.border}`, background: MS.card }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: MS.text, marginBottom: 20 }}>위험 단계별 처방 건수</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {(["안전", "주의", "고위험"] as RiskTier[]).map(tier => (
              <div key={tier} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 12, width: 48, textAlign: "right", fontWeight: 500, color: MS.muted, flexShrink: 0 }}>{tier}</span>
                <div style={{ flex: 1, height: 32, borderRadius: 8, background: "#F8FAFC", overflow: "hidden" }}>
                  <div style={{
                    height: "100%", borderRadius: 8,
                    width: `${Math.max((byTier[tier] / maxBar) * 100, 10)}%`,
                    background: RISK[tier].bg, border: `1px solid ${RISK[tier].border}`,
                    display: "flex", alignItems: "center", padding: "0 12px",
                    transition: "width 0.6s cubic-bezier(.4,0,.2,1)"
                  }}>
                    <span className="font-mono-data" style={{ fontSize: 13, fontWeight: 700, color: RISK[tier].color }}>{byTier[tier]}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div style={{ borderRadius: 16, padding: 20, border: `1px solid ${MS.border}`, background: MS.card }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: MS.text, marginBottom: 16 }}>연동 및 설정</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {[
              { label: "조제 소프트웨어 연동", status: "연결됨", color: "#16A34A" },
              { label: "HIRA API 연결", status: "활성", color: "#16A34A" },
              { label: "알림 채널", status: "SMS + 앱", color: MS.action },
            ].map(({ label, status, color }) => (
              <div key={label} style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 0", borderBottom: "1px solid #F1F5F9"
              }}>
                <span style={{ fontSize: 13, color: "#334155" }}>{label}</span>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 8, background: color + "18", color }}>{status}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
            <p style={{ fontSize: 11, fontWeight: 600, color: MS.muted, marginBottom: 4 }}>약국 정보</p>
            <p style={{ fontSize: 14, fontWeight: 700, color: MS.text, marginBottom: 2 }}>한강약국</p>
            <p style={{ fontSize: 11, color: MS.muted }}>허가번호: 2406-한강-0042 · 서울특별시 마포구</p>
          </div>
          <button style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: MS.action, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
            HIRA 데이터 동의 설정 관리 →
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Audit Log ──────────────────────────────────────────────────────────── */
function AuditLogView({ auditLog }: { auditLog: AuditLogRow[] }) {
  const [search, setSearch] = useState("");
  const filtered = auditLog.filter(r =>
    r.patient.includes(search) || r.action.includes(search) || r.tier.includes(search)
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      <div style={{
        padding: "12px 24px", borderBottom: `1px solid ${MS.border}`,
        background: MS.card, display: "flex", alignItems: "center", gap: 12
      }}>
        <div style={{
          flex: 1, maxWidth: 400, display: "flex", alignItems: "center", gap: 8,
          padding: "10px 14px", borderRadius: 12, border: `1px solid ${MS.border}`, background: MS.bg
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke={MS.muted} strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke={MS.muted} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="환자명, 처리 결과, 위험 단계로 검색…"
            style={{ flex: 1, fontSize: 13, outline: "none", background: "transparent", fontFamily: "Inter, sans-serif", color: MS.text, border: "none" }} />
        </div>
        <button style={{
          display: "flex", alignItems: "center", gap: 6, padding: "10px 16px",
          borderRadius: 10, fontSize: 13, fontWeight: 600, border: `1px solid ${MS.border}`,
          color: MS.text, background: "#fff", cursor: "pointer"
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"
              stroke={MS.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          내보내기
        </button>
      </div>

      <div style={{ padding: "8px 24px", background: "#FFFBEB", borderBottom: "1px solid #FDE68A" }}>
        <p style={{ fontSize: 11, color: "#92400E", margin: 0 }}>
          모든 조회 내역이 기록됩니다. 데이터는 마약류 관리에 관한 법률에 따라 보관됩니다.
        </p>
      </div>

      <div style={{ flex: 1, overflowY: "auto" }} className="hide-scrollbar">
        <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "Inter, sans-serif" }}>
          <thead>
            <tr style={{ borderBottom: `1px solid ${MS.border}` }}>
              {["날짜", "환자", "점수", "처리 결과", "메모"].map(h => (
                <th key={h} style={{
                  textAlign: "left", padding: "10px 20px", fontSize: 11, fontWeight: 600,
                  textTransform: "uppercase", letterSpacing: "0.07em",
                  color: MS.muted, background: MS.bg
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #F1F5F9" }}>
                <td style={{ padding: "12px 20px" }}>
                  <span className="font-mono-data" style={{ fontSize: 13, color: MS.muted }}>{r.date}</span>
                </td>
                <td style={{ padding: "12px 20px" }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: MS.text, margin: "0 0 2px" }}>{r.patient}</p>
                  <p style={{ fontSize: 12, color: MS.muted, margin: 0 }}>{r.age}세</p>
                </td>
                <td style={{ padding: "12px 20px" }}><RiskBadge score={r.score} tier={r.tier} /></td>
                <td style={{ padding: "12px 20px" }}><StatusTag status={r.action as Patient["status"]} /></td>
                <td style={{ padding: "12px 20px", maxWidth: 260 }}>
                  <p style={{ fontSize: 12, color: MS.muted, margin: 0 }}>{r.note || "—"}</p>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Sidebar Navigation ─────────────────────────────────────────────────── */
const NAV: { id: View; label: string; iconPath: string }[] = [
  { id: "queue",   label: "접수 대기열", iconPath: "M3 5h2V3a2 2 0 0 1 2-2h1M3 19h2v2a2 2 0 0 0 2 2h1M19 5h-2V3a2 2 0 0 0-2-2h-1M19 19h-2v2a2 2 0 0 1-2 2h-1M7 9h10M7 12h10M7 15h6" },
  { id: "reports", label: "통계 및 설정", iconPath: "M3 3v18h18M7 16l4-4 4 4 4-6" },
  { id: "history", label: "감사 로그",   iconPath: "M12 8v4l3 3m6-3a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" },
];

/* ─── Main App ────────────────────────────────────────────────────────────── */
export default function PharmacistApp() {
  const [view, setView] = useState<View>("queue");
  const [patients, setPatients] = useState<Patient[]>(mockPatients);
  const [auditLog, setAuditLog] = useState<AuditLogRow[]>(mockAuditLog);
  const [liveDataError, setLiveDataError] = useState(false);

  const reload = () => {
    Promise.all([fetchPharmacistPatients(), fetchAuditLogRows()])
      .then(([livePatients, liveAuditLog]) => {
        setPatients(livePatients);
        setAuditLog(liveAuditLog);
        setLiveDataError(false);
      })
      .catch((err) => {
        console.error("Falling back to demo data — backend unreachable:", err);
        setLiveDataError(true);
      });
  };

  useEffect(() => {
    reload();
  }, []);

  const highCount = patients.filter(p => p.tier === "고위험").length;

  return (
    <div style={{ display: "flex", height: "100%", fontFamily: "Inter, sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: 220, flexShrink: 0, background: MS.sidebar, display: "flex", flexDirection: "column" }}>
        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          padding: "20px 18px 18px",
          borderBottom: "1px solid rgba(223,244,245,0.08)"
        }}>
          <svg width="26" height="26" viewBox="0 0 32 32" fill="none">
            <rect width="32" height="32" rx="7" fill="#35A8B5"/>
            <path d="M8 20 L12 11 L16 18 L20 11 L24 20" stroke="#DFF4F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="16" cy="22" r="2" fill="#DFF4F5"/>
          </svg>
          <div>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#DFF4F5", letterSpacing: "-0.01em", margin: 0 }}>Medisync</p>
            <p style={{ fontSize: 10, color: "rgba(223,244,245,0.45)", margin: 0, marginTop: 1 }}>약사용 대시보드</p>
          </div>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "12px 10px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => setView(n.id)}
              className="sidebar-item"
              style={{
                display: "flex", alignItems: "center", gap: 10, padding: "10px 12px",
                borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left", width: "100%",
                background: view === n.id ? "rgba(223,244,245,0.14)" : "transparent",
              }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d={n.iconPath}
                  stroke={view === n.id ? "#DFF4F5" : "rgba(223,244,245,0.45)"}
                  strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span style={{
                fontSize: 13, fontWeight: 500,
                color: view === n.id ? "#DFF4F5" : "rgba(223,244,245,0.55)"
              }}>
                {n.label}
              </span>
              {n.id === "queue" && highCount > 0 && (
                <span style={{
                  marginLeft: "auto", fontSize: 10, fontWeight: 700,
                  padding: "2px 6px", borderRadius: 6, background: "#DC2626", color: "#fff"
                }}>{highCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Bottom */}
        <div style={{ padding: "14px 18px 18px", borderTop: "1px solid rgba(223,244,245,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", flexShrink: 0 }} />
            <span style={{ fontSize: 11, color: "rgba(223,244,245,0.45)" }}>스캐너 연결됨</span>
          </div>
          <p style={{ fontSize: 12, fontWeight: 600, color: "rgba(223,244,245,0.65)", marginBottom: 2 }}>한강약국</p>
          <p style={{ fontSize: 10, color: "rgba(223,244,245,0.3)", margin: 0 }}>마포구 · 허가 2406-한강-0042</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: MS.bg }}>
        {/* Top bar */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", background: MS.card, borderBottom: `1px solid ${MS.border}`
        }}>
          <div>
            <h1 style={{ fontSize: 15, fontWeight: 700, color: MS.text, letterSpacing: "-0.01em", margin: "0 0 2px" }}>
              {NAV.find(n => n.id === view)?.label}
            </h1>
            <p style={{ fontSize: 12, color: MS.muted, margin: 0 }}>
              {view === "queue" ? `오늘 ${patients.length}건 스캔됨` : view === "reports" ? "2024년 11월 기준" : "전체 신고 이력"}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {liveDataError && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                borderRadius: 10, background: "#FFFBEB", border: "1px solid #FDE68A"
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#D97706" }}>백엔드 미연결 · 데모 데이터 표시 중</span>
              </div>
            )}
            {highCount > 0 && (
              <div style={{
                display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
                borderRadius: 10, background: "#FEF2F2", border: "1px solid #FECACA"
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#DC2626" }} />
                <span style={{ fontSize: 12, fontWeight: 700, color: "#DC2626" }}>고위험 {highCount}건 대기 중</span>
              </div>
            )}
          </div>
        </div>

        <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
          {view === "queue"   && <ReceptionQueue patients={patients} onActionRecorded={reload} />}
          {view === "reports" && <ReportsView patients={patients} />}
          {view === "history" && <AuditLogView auditLog={auditLog} />}
        </div>
      </main>
    </div>
  );
}
