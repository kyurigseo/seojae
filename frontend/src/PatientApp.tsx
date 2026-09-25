import { useState } from "react";
import { MedisyncChar, CharBubble } from "./MedisyncChar";

type Screen = "onboarding" | "home" | "history" | "library" | "alerts" | "family" | "settings";
type OnboardingStep = "verify" | "consent" | "guardian";

// MedisyncChar and CharBubble imported from ./MedisyncChar

/* ─── Brand Tokens ───────────────────────────────────────────────────────── */
const M = {
  bg:      "#DFF4F5",
  card:    "#FFFFFF",
  teal:    "#35A8B5",
  teal2:   "#2A8A96",
  light:   "#BFE8ED",
  lighter: "#EBF8FA",
  text:    "#0D2E38",
  muted:   "#5A8A95",
  border:  "#BFE8ED",
  amber:   "#F59E0B",
  amberBg: "#FFFBEB",
  safe:    "#16A34A",
  safeBg:  "#F0FDF4",
};

const shadow = "0 2px 12px rgba(13,46,56,0.07)";
const shadowSm = "0 1px 6px rgba(13,46,56,0.06)";


/* ─── Status Bar ─────────────────────────────────────────────────────────── */
function StatusBar({ light = false }: { light?: boolean }) {
  const c = light ? "rgba(255,255,255,0.85)" : M.text;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 20px 4px", flexShrink: 0 }}>
      <span style={{ fontSize: 12, fontWeight: 600, color: c, fontFamily: "Nunito, sans-serif" }}>오전 9:41</span>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {/* signal */}
        <svg width="15" height="11" viewBox="0 0 15 11" fill="none">
          {[0,3,6,9].map((x,i) => (
            <rect key={x} x={x} y={11-(i+1)*2.8} width="2.5" height={(i+1)*2.8} rx="1"
              fill={c} opacity={0.35+i*0.2}/>
          ))}
        </svg>
        {/* wifi */}
        <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
          <path d="M7 9.5 L7 9.5" stroke={c} strokeWidth="2" strokeLinecap="round"/>
          <path d="M4.5 7.5 Q7 5.5 9.5 7.5" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none"/>
          <path d="M2 5 Q7 1 12 5" stroke={c} strokeWidth="1.4" strokeLinecap="round" fill="none" opacity="0.6"/>
        </svg>
        {/* battery */}
        <svg width="22" height="12" viewBox="0 0 22 12" fill="none">
          <rect x="0.5" y="0.5" width="19" height="11" rx="2" stroke={c} strokeWidth="1" opacity="0.8"/>
          <rect x="19.5" y="3.5" width="2" height="5" rx="1" fill={c} opacity="0.5"/>
          <rect x="2" y="2" width="13" height="8" rx="1.2" fill="#16A34A" opacity="0.9"/>
        </svg>
      </div>
    </div>
  );
}

/* ─── Medisync Logo Mark ──────────────────────────────────────────────────── */
function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#35A8B5"/>
      <path d="M8 20 L12 11 L16 18 L20 11 L24 20" stroke="#DFF4F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="22" r="2" fill="#DFF4F5"/>
    </svg>
  );
}

/* ─── Progress Ring ──────────────────────────────────────────────────────── */
function ProgressRing({ pct, size = 44, label }: { pct: number; size?: number; label?: string }) {
  const r = (size - 7) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const col = pct > 40 ? M.teal : pct > 20 ? M.amber : "#EF4444";
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} strokeWidth={5.5} stroke={M.light} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} strokeWidth={5.5} stroke={col} fill="none"
        strokeLinecap="round" strokeDasharray={`${dash} ${circ}`}
        style={{ transform: "rotate(-90deg)", transformOrigin: "50% 50%" }}/>
      <text x={size/2} y={size/2+4} textAnchor="middle" fontSize="9" fontWeight="800"
        fill={col} fontFamily="Nunito, sans-serif">{label || `${pct}%`}</text>
    </svg>
  );
}

/* ─── Card ────────────────────────────────────────────────────────────────── */
function Card({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: M.card, borderRadius: 20, boxShadow: shadow, ...style }}>
      {children}
    </div>
  );
}

/* ─── Onboarding ─────────────────────────────────────────────────────────── */
function OnboardingFlow({ onDone }: { onDone: () => void }) {
  const [step, setStep] = useState<OnboardingStep>("verify");
  const [phone, setPhone] = useState("");
  const [residentId, setResidentId] = useState("");
  const [sharePharmacy, setSharePharmacy] = useState(false);
  const [personalOnly, setPersonalOnly] = useState(false);
  const [guardianName, setGuardianName] = useState("");
  const [guardianPhone, setGuardianPhone] = useState("");

  const steps: OnboardingStep[] = ["verify", "consent", "guardian"];
  const idx = steps.indexOf(step);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />

      {/* Header */}
      <div style={{ padding: "8px 20px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
          <LogoMark size={24} />
          <span style={{ fontSize: 15, fontWeight: 800, color: M.text }}>Medisync</span>
        </div>
        {/* Step pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {steps.map((s, i) => {
            const done = i < idx, active = i === idx;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{
                  display: "flex", alignItems: "center", gap: 5,
                  padding: "4px 10px 4px 6px",
                  borderRadius: 20,
                  background: done ? M.safe + "18" : active ? M.teal : M.light,
                  border: `1.5px solid ${done ? M.safe + "40" : active ? M.teal : M.border}`
                }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    background: done ? M.safe : active ? "#fff" : M.border,
                    color: done ? "#fff" : active ? M.teal : M.muted,
                    fontSize: 10, fontWeight: 800
                  }}>
                    {done ? "✓" : i + 1}
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: done ? M.safe : active ? "#fff" : M.muted }}>
                    {["본인 인증", "동의 설정", "가족 연결"][i]}
                  </span>
                </div>
                {i < 2 && <div style={{ width: 12, height: 1.5, background: i < idx ? M.safe : M.border, borderRadius: 1 }} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px" }} className="hide-scrollbar">
        {step === "verify" && (
          <div>
            {/* Character greeting bubble — default state */}
            <div style={{ marginBottom: 24 }}>
              <CharBubble state="default" size={72}>
                <p style={{ fontSize: 15, fontWeight: 800, color: M.text, margin: "0 0 4px" }}>안녕하세요! 👋</p>
                <p style={{ fontSize: 13, color: M.muted, lineHeight: 1.55, margin: 0 }}>
                  처방 기록을 안전하게 연결할게요. 주민번호 뒷자리는 마스킹되며 저장되지 않습니다.
                </p>
              </CharBubble>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "휴대폰 번호", val: phone, set: setPhone, ph: "010-0000-0000", type: "tel" },
                { label: "주민등록번호", val: residentId, set: setResidentId, ph: "000000-0000000", type: "text" },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: M.text, marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${val ? M.teal : M.border}`,
                      background: M.card, fontFamily: "Nunito, sans-serif", color: M.text, fontSize: 14,
                      outline: "none", boxSizing: "border-box", boxShadow: shadowSm
                    }} />
                </div>
              ))}
              <div style={{ borderRadius: 14, padding: "12px 14px", display: "flex", gap: 10, alignItems: "flex-start", background: M.lighter, border: `1px solid ${M.border}` }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                  <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" fill={M.teal}/>
                </svg>
                <p style={{ fontSize: 12, color: M.teal, lineHeight: 1.55, margin: 0 }}>
                  인증은 건강보험심사평가원(HIRA)을 통해 이루어집니다.
                </p>
              </div>
            </div>
          </div>
        )}

        {step === "consent" && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: M.text, marginBottom: 6 }}>내 정보, 내가 결정합니다</h2>
            <p style={{ fontSize: 13, color: M.muted, lineHeight: 1.6, marginBottom: 20 }}>
              HIRA 처방 내역을 조회할 수 있도록 동의 방식을 선택해 주세요. 언제든지 설정에서 변경할 수 있어요.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}>
              {[
                { checked: sharePharmacy, set: setSharePharmacy, label: "약국과 안전 점검을 위해 공유", desc: "조제 시 약사가 안전 요약 정보를 확인할 수 있습니다.", color: M.teal, icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" stroke={M.teal} strokeWidth="2" strokeLinejoin="round"/>
                    <path d="M9 22V12h6v10" stroke={M.teal} strokeWidth="2" strokeLinejoin="round"/>
                  </svg>
                )},
                { checked: personalOnly, set: setPersonalOnly, label: "내 복약 기록으로만 활용", desc: "처방 데이터는 메디싱크 내 본인 이력 확인에만 사용됩니다.", color: "#7C3AED", icon: (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                    <rect x="3" y="11" width="18" height="11" rx="2" stroke="#7C3AED" strokeWidth="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" stroke="#7C3AED" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )},
              ].map(({ checked, set, label, desc, color, icon }) => (
                <button key={label} onClick={() => set(!checked)} style={{
                  width: "100%", textAlign: "left", borderRadius: 18,
                  padding: "14px 16px",
                  border: `2px solid ${checked ? color : M.border}`,
                  background: checked ? color + "0C" : M.card,
                  boxShadow: checked ? `0 0 0 3px ${color}18` : shadowSm,
                  cursor: "pointer"
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: color + "14", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      {icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 700, color: M.text, marginBottom: 3 }}>{label}</p>
                      <p style={{ fontSize: 12, color: M.muted, lineHeight: 1.5, margin: 0 }}>{desc}</p>
                    </div>
                    <div style={{
                      width: 22, height: 22, borderRadius: "50%", border: `2px solid ${checked ? color : M.border}`,
                      background: checked ? color : "transparent", flexShrink: 0, marginTop: 2,
                      display: "flex", alignItems: "center", justifyContent: "center"
                    }}>
                      {checked && <svg width="11" height="11" viewBox="0 0 12 12"><path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <p style={{ fontSize: 12, textAlign: "center", color: M.muted }}>두 항목 모두 기본값은 꺼짐입니다. 선택하지 않아도 앱을 이용할 수 있어요.</p>
          </div>
        )}

        {step === "guardian" && (
          <div>
            {/* complete state — encouraging before finishing onboarding */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <MedisyncChar size={72} state="complete" />
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: M.text, marginBottom: 6 }}>가족을 연결하세요</h2>
            <p style={{ fontSize: 13, color: M.muted, lineHeight: 1.6, marginBottom: 20 }}>
              미성년자나 부양가족의 복약을 함께 관리할 수 있어요. 이 단계는 선택 사항입니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { label: "가족 이름", val: guardianName, set: setGuardianName, ph: "이름을 입력하세요", type: "text" },
                { label: "가족 휴대폰 번호", val: guardianPhone, set: setGuardianPhone, ph: "010-0000-0000", type: "tel" },
              ].map(({ label, val, set, ph, type }) => (
                <div key={label}>
                  <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: M.text, marginBottom: 6 }}>{label}</label>
                  <input type={type} placeholder={ph} value={val} onChange={e => set(e.target.value)}
                    style={{
                      width: "100%", padding: "13px 16px", borderRadius: 14, border: `1.5px solid ${val ? M.teal : M.border}`,
                      background: M.card, fontFamily: "Nunito, sans-serif", color: M.text, fontSize: 14,
                      outline: "none", boxSizing: "border-box", boxShadow: shadowSm
                    }} />
                </div>
              ))}
              <div style={{ borderRadius: 14, padding: "12px 14px", background: M.safeBg, border: "1px solid #BBF7D0" }}>
                <p style={{ fontSize: 12, color: "#166534", lineHeight: 1.55, margin: 0 }}>
                  연결된 번호로 인증 메시지가 발송됩니다. 양측 모두 동의해야 연결이 완료돼요.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CTA */}
      <div style={{ padding: "8px 20px 28px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
        <button onClick={() => {
          if (step === "guardian") { onDone(); return; }
          const next: Record<OnboardingStep, OnboardingStep> = { verify: "consent", consent: "guardian", guardian: "guardian" };
          setStep(next[step]);
        }} style={{
          width: "100%", padding: "15px", borderRadius: 18,
          background: `linear-gradient(135deg, ${M.teal}, ${M.teal2})`,
          color: "#fff", fontSize: 15, fontWeight: 800, border: "none",
          cursor: "pointer", boxShadow: `0 4px 16px ${M.teal}50`
        }}>
          {step === "guardian" ? "메디싱크 시작하기 →" : "다음"}
        </button>
        {step !== "verify" && (
          <button onClick={() => {
            const prev: Record<OnboardingStep, OnboardingStep> = { verify: "verify", consent: "verify", guardian: "consent" };
            setStep(prev[step]);
          }} style={{ width: "100%", padding: "10px", fontSize: 13, fontWeight: 600, color: M.muted, background: "none", border: "none", cursor: "pointer" }}>
            ← 이전
          </button>
        )}
        {step === "guardian" && (
          <button onClick={onDone} style={{ width: "100%", padding: "8px", fontSize: 12, fontWeight: 500, color: M.muted, background: "none", border: "none", cursor: "pointer" }}>
            나중에 연결하기
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── Data ────────────────────────────────────────────────────────────────── */
const MEDS = [
  { name: "옥시콘틴", active: "옥시코돈 염산염", dosage: "10mg", institution: "세브란스병원", pct: 65, color: "#7C3AED" },
  { name: "리탈린",   active: "메틸페니데이트", dosage: "20mg", institution: "연세의료원",   pct: 40, color: "#2563EB" },
  { name: "졸로프트", active: "설트랄린 염산염", dosage: "50mg", institution: "서울아산병원", pct: 82, color: "#D97706" },
];
const VISITS = [
  { date: "11월 12일", institution: "세브란스병원", medicine: "옥시콘틴 10mg", color: "#7C3AED" },
  { date: "10월 28일", institution: "연세의료원",   medicine: "리탈린 20mg",   color: "#2563EB" },
  { date: "10월 14일", institution: "서울아산병원", medicine: "졸로프트 50mg", color: "#D97706" },
  { date: "9월 30일",  institution: "세브란스병원", medicine: "옥시콘틴 10mg", color: "#7C3AED" },
];

/* ─── Home Screen ────────────────────────────────────────────────────────── */
function HomeScreen({ onNav }: { onNav: (s: Screen) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />

      {/* Topbar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "4px 20px 12px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <LogoMark size={22} />
          <span style={{ fontSize: 14, fontWeight: 800, color: M.text }}>Medisync</span>
        </div>
        <button onClick={() => onNav("settings")} style={{
          width: 34, height: 34, borderRadius: "50%", border: `1.5px solid ${M.border}`,
          background: M.card, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", boxShadow: shadowSm
        }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="3" stroke={M.muted} strokeWidth="1.8"/>
            <path d="M12 2v2M12 20v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M2 12h2M20 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
              stroke={M.muted} strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 16px" }} className="hide-scrollbar">
        {/* Greeting */}
        <div style={{ marginBottom: 14 }}>
          <p style={{ fontSize: 12, fontWeight: 600, color: M.muted, margin: "0 0 1px" }}>2024년 11월 22일 금요일</p>
          <p style={{ fontSize: 26, fontWeight: 900, color: M.text, margin: 0, letterSpacing: "-0.02em" }}>지영님, 안녕하세요</p>
        </div>

        {/* Hero status card */}
        <div style={{
          borderRadius: 24, marginBottom: 20, overflow: "hidden",
          background: `linear-gradient(140deg, #35A8B5 0%, #1A7080 100%)`,
          boxShadow: `0 8px 28px ${M.teal}50`, position: "relative"
        }}>
          {/* Decorative background circles — gives depth, breaks flat gradient */}
          <div style={{ position: "absolute", top: -24, right: 60, width: 90, height: 90, borderRadius: "50%", background: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", bottom: -16, right: -10, width: 70, height: 70, borderRadius: "50%", background: "rgba(255,255,255,0.06)", pointerEvents: "none" }} />
          <div style={{ display: "flex", alignItems: "flex-end", padding: "20px 20px 0 20px", position: "relative" }}>
            <div style={{ flex: 1, paddingBottom: 20 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                padding: "4px 10px", borderRadius: 20,
                background: "rgba(255,255,255,0.18)", marginBottom: 10
              }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#FDE68A" }} />
                <span style={{ fontSize: 11, fontWeight: 700, color: "#FEF3C7" }}>확인 필요</span>
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: "#fff", lineHeight: 1.35, margin: "0 0 12px" }}>
                잠깐 확인해 볼<br/>사항이 있습니다
              </p>
              <button onClick={() => onNav("alerts")} style={{
                padding: "9px 18px", borderRadius: 12,
                background: "rgba(255,255,255,0.22)", backdropFilter: "blur(8px)",
                color: "#fff", fontSize: 12, fontWeight: 700, border: "1px solid rgba(255,255,255,0.28)",
                cursor: "pointer"
              }}>
                알림 확인하기 →
              </button>
            </div>
            {/* Character — attention state: calm concern for "something to check" */}
            <div style={{ flexShrink: 0, marginBottom: -2 }}>
              <MedisyncChar size={88} state="attention" />
            </div>
          </div>
        </div>

        {/* Quick access grid */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: M.text, marginBottom: 10 }}>빠른 메뉴</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            {[
              { label: "처방 이력", sub: "최근 방문 내역", target: "history" as Screen, color: "#2563EB", bgColor: "#EFF6FF",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" stroke="#2563EB" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              },
              { label: "약품 정보", sub: "성분·주의사항 안내", target: "library" as Screen, color: M.teal, bgColor: M.lighter,
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" stroke={M.teal} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              },
              { label: "알림함", sub: "2개의 새 알림", target: "alerts" as Screen, color: "#D97706", bgColor: "#FFFBEB",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" stroke="#D97706" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
                badge: "2"
              },
              { label: "가족 관리", sub: "연결된 가족 2명", target: "family" as Screen, color: "#7C3AED", bgColor: "#F5F3FF",
                icon: <svg width="20" height="20" viewBox="0 0 24 24" fill="none"><path d="M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" stroke="#7C3AED" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
              },
            ].map(({ label, sub, target, color, bgColor, icon, badge }) => (
              <button key={label} onClick={() => onNav(target)} style={{
                background: M.card, borderRadius: 18, padding: "14px",
                border: `1px solid ${M.border}`, textAlign: "left",
                cursor: "pointer", boxShadow: shadowSm, position: "relative"
              }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: bgColor, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 10, position: "relative" }}>
                  {icon}
                  {badge && (
                    <div style={{ position: "absolute", top: -4, right: -4, width: 16, height: 16, borderRadius: "50%", background: color, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: "#fff" }}>{badge}</span>
                    </div>
                  )}
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: M.text, margin: "0 0 2px" }}>{label}</p>
                <p style={{ fontSize: 11, color: M.muted, margin: 0 }}>{sub}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Current medications */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: M.text, margin: 0 }}>현재 복용 중인 약</p>
            <button onClick={() => onNav("history")} style={{ fontSize: 12, fontWeight: 600, color: M.teal, background: "none", border: "none", cursor: "pointer" }}>전체 보기</button>
          </div>
          <div style={{ display: "flex", gap: 10, overflowX: "auto", paddingBottom: 4 }} className="hide-scrollbar">
            {MEDS.map(m => (
              <div key={m.name} style={{
                background: M.card, borderRadius: 18, padding: "14px",
                flexShrink: 0, width: 148, border: `1px solid ${M.border}`, boxShadow: shadowSm
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: 10, background: m.color + "18", display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <rect x="6" y="2" width="12" height="20" rx="3" stroke={m.color} strokeWidth="1.8"/>
                      <path d="M9 8h6M9 12h6M9 16h4" stroke={m.color} strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <ProgressRing pct={m.pct} size={36} />
                </div>
                <p style={{ fontSize: 13, fontWeight: 800, color: M.text, margin: "0 0 2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.name}</p>
                <p style={{ fontSize: 11, color: m.color, fontWeight: 700, margin: "0 0 2px" }}>{m.dosage}</p>
                <p style={{ fontSize: 11, color: M.muted, margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{m.institution}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent visits */}
        <div style={{ marginBottom: 20 }}>
          <p style={{ fontSize: 14, fontWeight: 800, color: M.text, marginBottom: 10 }}>최근 약국 방문</p>
          <Card>
            <div style={{ padding: "16px" }}>
              {VISITS.slice(0, 3).map((v, i) => (
                <div key={i} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: 16 }}>
                    <div style={{
                      width: 12, height: 12, borderRadius: "50%", flexShrink: 0, marginTop: 3,
                      background: i === 0 ? v.color : "#fff",
                      border: `2.5px solid ${v.color}`
                    }} />
                    {i < 2 && <div style={{ width: 2, flex: 1, minHeight: 20, background: M.border, margin: "3px 0", borderRadius: 1 }} />}
                  </div>
                  <div style={{ flex: 1, paddingBottom: i < 2 ? 14 : 0 }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: M.text, margin: 0 }}>{v.medicine}</p>
                      <p style={{ fontSize: 11, color: M.muted, margin: 0 }}>{v.date}</p>
                    </div>
                    <p style={{ fontSize: 11, color: v.color, fontWeight: 600, margin: "2px 0 0" }}>{v.institution}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Daily tip */}
        <div style={{
          borderRadius: 20, padding: "16px",
          background: M.card, border: `1px solid ${M.border}`,
          borderLeft: `4px solid ${M.teal}`,
          boxShadow: shadowSm
        }}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: M.lighter, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
                <path d="M9 21h6M12 3a6 6 0 0 1 6 6c0 2.22-1.21 4.16-3 5.2V17H9v-2.8A6 6 0 0 1 6 9a6 6 0 0 1 6-6z" stroke={M.teal} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 10, fontWeight: 800, color: M.teal, margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.07em" }}>오늘의 복약 팁</p>
              <p style={{ fontSize: 13, fontWeight: 800, color: M.text, margin: "0 0 4px" }}>진통제 복용 중에는 음주를 피하세요</p>
              <p style={{ fontSize: 12, color: M.muted, lineHeight: 1.55, margin: 0 }}>
                오피오이드나 진정제 계열 약물과 음주를 함께 하면 호흡이 느려질 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── History Screen ──────────────────────────────────────────────────────── */
const HISTORY = [
  { date: "2024-11-12", institution: "세브란스병원", medicine: "옥시콘틴", dosage: "10mg × 28정", days: 28, color: "#7C3AED" },
  { date: "2024-10-28", institution: "연세의료원",   medicine: "리탈린",   dosage: "20mg × 30정", days: 30, color: "#2563EB" },
  { date: "2024-10-14", institution: "서울아산병원", medicine: "졸로프트", dosage: "50mg × 30정", days: 30, color: "#D97706" },
  { date: "2024-09-30", institution: "세브란스병원", medicine: "옥시콘틴", dosage: "10mg × 28정", days: 28, color: "#7C3AED" },
  { date: "2024-09-05", institution: "연세의료원",   medicine: "리탈린",   dosage: "20mg × 30정", days: 30, color: "#2563EB" },
  { date: "2024-08-14", institution: "서울아산병원", medicine: "졸로프트", dosage: "50mg × 30정", days: 30, color: "#D97706" },
];

function HistoryScreen({ onNav }: { onNav: (s: Screen) => void }) {
  const [filter, setFilter] = useState("전체");
  const [expanded, setExpanded] = useState<number | null>(null);
  const FILTERS = ["전체", "옥시콘틴", "리탈린", "졸로프트", "세브란스병원"];
  const filtered = filter === "전체" ? HISTORY : HISTORY.filter(h => h.medicine === filter || h.institution === filter);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 12px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: M.text, margin: "0 0 12px" }}>처방 이력</h1>
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }} className="hide-scrollbar">
          {FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)} style={{
              padding: "6px 14px", borderRadius: 20, fontSize: 12, fontWeight: 700, flexShrink: 0,
              background: filter === f ? M.teal : M.card,
              color: filter === f ? "#fff" : M.muted,
              border: `1.5px solid ${filter === f ? M.teal : M.border}`,
              cursor: "pointer", boxShadow: shadowSm
            }}>
              {f}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }} className="hide-scrollbar">
        {filtered.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "40px 20px" }}>
            <MedisyncChar size={80} state="default" />
            <p style={{ fontSize: 16, fontWeight: 700, color: M.text, marginTop: 16, marginBottom: 6 }}>아직 처방 이력이 없어요</p>
            <p style={{ fontSize: 13, color: M.muted, lineHeight: 1.55 }}>연결된 약국에서 조제를 받으면 처방 이력이 여기에 표시돼요.</p>
          </div>
        ) : (
          <div style={{ position: "relative" }}>
            <div style={{ position: "absolute", left: 15, top: 12, bottom: 12, width: 2, background: M.border, borderRadius: 1 }} />
            {filtered.map((h, i) => (
              <div key={i} style={{ position: "relative", paddingLeft: 40, marginBottom: 10 }}>
                <div style={{
                  position: "absolute", left: 9, top: 16,
                  width: 14, height: 14, borderRadius: "50%",
                  background: h.color, border: "2.5px solid #fff",
                  boxShadow: `0 0 0 2px ${h.color}40`
                }} />
                <button onClick={() => setExpanded(expanded === i ? null : i)} style={{
                  width: "100%", textAlign: "left", borderRadius: 18, padding: "14px 16px",
                  background: M.card, border: `1.5px solid ${expanded === i ? h.color : M.border}`,
                  cursor: "pointer", boxShadow: expanded === i ? `0 0 0 3px ${h.color}18` : shadowSm
                }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 14, fontWeight: 800, color: M.text, margin: "0 0 3px" }}>
                        {h.medicine} <span style={{ fontWeight: 500, color: M.muted }}>{h.dosage}</span>
                      </p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: h.color, margin: "0 0 2px" }}>{h.institution}</p>
                      <p style={{ fontSize: 11, color: M.muted, margin: 0 }}>{h.date} · {h.days}일분</p>
                    </div>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: M.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginLeft: 8 }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" style={{ transform: expanded === i ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>
                        <path d="M6 9l6 6 6-6" stroke={M.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>
                  {expanded === i && (
                    <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${M.border}` }}>
                      <p style={{ fontSize: 12, color: M.muted, lineHeight: 1.65, margin: "0 0 8px" }}>
                        이 약은 담당 진료팀의 치료 계획에 따라 조제된 것입니다. 용량이나 상호작용에 대해 궁금한 점이 있으시면 처방 의사 또는 약사에게 문의하세요.
                      </p>
                      <button onClick={e => { e.stopPropagation(); onNav("library"); }}
                        style={{ fontSize: 12, fontWeight: 700, color: M.teal, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                        이 약에 대해 더 알아보기 →
                      </button>
                    </div>
                  )}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Library Screen ─────────────────────────────────────────────────────── */
const MEDICINES = [
  { name: "옥시코돈 (옥시콘틴)", category: "진통제", categoryColor: "#7C3AED", categoryBg: "#F5F3FF",
    treats: "수술·외상·만성 질환으로 인한 중등도 이상의 통증 완화.",
    effects: "졸음, 변비, 구역, 구강 건조가 흔합니다. 고용량에서는 호흡이 느려질 수 있습니다.",
    signs: ["처방된 양보다 더 많이 복용하는 경우", "통증이 아닌 기분 안정을 위해 복용하는 경우", "조기 리필을 반복적으로 요청하는 경우", "음주나 수면제와 함께 복용하는 경우"],
    alternatives: "물리치료, 온열 요법, 비오피오이드 진통제, 침술, 마음챙김 기반 통증 관리." },
  { name: "메틸페니데이트 (리탈린)", category: "ADHD 치료제", categoryColor: "#2563EB", categoryBg: "#EFF6FF",
    treats: "소아 및 성인의 주의력결핍과잉행동장애(ADHD) 치료.",
    effects: "식욕 감소, 수면 장애, 두통, 심박수 증가가 나타날 수 있습니다.",
    signs: ["더 집중하기 위해 처방량보다 많이 복용하는 경우", "장시간 깨어 있기 위해 복용하는 경우", "다른 사람에게 약을 나눠주는 경우"],
    alternatives: "행동 치료, 구조화된 일과 관리, 인지 훈련, 규칙적 운동." },
  { name: "설트랄린 (졸로프트)", category: "정신건강 치료제", categoryColor: "#D97706", categoryBg: "#FFFBEB",
    treats: "우울증, 불안장애, 강박증, 외상 후 스트레스 장애 치료.",
    effects: "복용 초기 약한 구역(보통 몇 주 내 개선), 수면 변화, 두통이 나타날 수 있습니다.",
    signs: ["의사와 상의 없이 갑자기 복용을 중단하는 경우", "기분이 좋지 않을 때 추가로 복용하는 경우"],
    alternatives: "심리치료(인지행동치료), 규칙적인 운동, 마음챙김, 수면 습관 개선." },
  { name: "알프라졸람 (자낙스)", category: "항불안제", categoryColor: M.teal, categoryBg: M.lighter,
    treats: "공황장애 및 단기 불안 완화.",
    effects: "졸음, 집중력 저하, 기억 문제. 장기 복용 시 의존성이 생길 수 있습니다.",
    signs: ["매일 수 주 이상 복용하는 경우", "음주나 오피오이드와 함께 복용하는 경우", "끊을 때 심한 불안감이 느껴지는 경우"],
    alternatives: "불안에 대한 인지행동치료, 호흡 기법, 점진적 근육 이완법." },
];

function LibraryScreen() {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<typeof MEDICINES[0] | null>(null);
  const filtered = MEDICINES.filter(m => m.name.includes(search) || m.category.includes(search));

  if (selected) return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 12px" }}>
        <button onClick={() => setSelected(null)} style={{ fontSize: 13, fontWeight: 600, color: M.teal, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>
          ← 라이브러리
        </button>
        <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: selected.categoryBg, color: selected.categoryColor }}>{selected.category}</span>
        <h1 style={{ fontSize: 20, fontWeight: 800, color: M.text, marginTop: 8 }}>{selected.name}</h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }} className="hide-scrollbar">
        {[
          { label: "어떤 증상에 쓰이나요", content: selected.treats, emoji: "💊", bg: M.card, border: M.border, textColor: M.text },
          { label: "주요 부작용", content: selected.effects, emoji: "📝", bg: M.card, border: M.border, textColor: M.text },
        ].map(({ label, content, emoji, bg, border, textColor }) => (
          <Card key={label} style={{ padding: "16px", border: `1px solid ${border}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: M.muted, marginBottom: 8 }}>{emoji} {label}</p>
            <p style={{ fontSize: 13, color: textColor, lineHeight: 1.65, margin: 0 }}>{content}</p>
          </Card>
        ))}
        <div style={{ borderRadius: 20, padding: "16px", background: M.amberBg, border: "1px solid #FDE68A", boxShadow: shadowSm }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: "#92400E", marginBottom: 10 }}>⚠ 오남용 징후 알기 쉬운 표현</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {selected.signs.map(s => (
              <div key={s} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 16, flexShrink: 0, marginTop: -2 }}>•</span>
                <p style={{ fontSize: 13, color: "#92400E", lineHeight: 1.55, margin: 0 }}>{s}</p>
              </div>
            ))}
          </div>
        </div>
        <Card style={{ padding: "16px", border: `1px solid ${M.border}` }}>
          <p style={{ fontSize: 12, fontWeight: 700, color: M.teal, marginBottom: 8 }}>🌿 비약물·대체 요법</p>
          <p style={{ fontSize: 13, color: M.text, lineHeight: 1.65, margin: 0 }}>{selected.alternatives}</p>
        </Card>
        {/* Medisync guide nudge — guide state (holding prescription card) */}
        <div style={{ borderRadius: 20, padding: "14px 16px", background: M.lighter, border: `1px solid ${M.border}`, boxShadow: shadowSm }}>
          <CharBubble state="guide" size={52} subtext="약사나 담당 의사에게 편하게 물어보세요.">
            <span style={{ fontWeight: 700, color: M.teal }}>궁금한 게 있으신가요?</span>
            {" "}이 약에 대해 더 알고 싶다면, 메디싱크가 함께 도와드릴게요.
          </CharBubble>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 12px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: M.text, margin: "0 0 12px" }}>약품 라이브러리</h1>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 16, background: M.card, border: `1.5px solid ${M.border}`, boxShadow: shadowSm }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="8" stroke={M.muted} strokeWidth="2"/>
            <path d="M21 21l-4.35-4.35" stroke={M.muted} strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <input placeholder="약 이름 또는 증상으로 검색…" value={search} onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, fontSize: 14, outline: "none", background: "transparent", fontFamily: "Nunito, sans-serif", color: M.text, border: "none" }} />
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }} className="hide-scrollbar">
        {filtered.map(m => (
          <button key={m.name} onClick={() => setSelected(m)} style={{
            background: M.card, borderRadius: 18, padding: "14px 16px",
            border: `1px solid ${M.border}`, borderLeft: `3px solid ${m.categoryColor}`,
            textAlign: "left", cursor: "pointer", boxShadow: shadowSm, overflow: "hidden"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 12, background: m.categoryBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <rect x="6" y="2" width="12" height="20" rx="3" stroke={m.categoryColor} strokeWidth="1.8"/>
                  <path d="M9 8h6M9 12h6M9 16h4" stroke={m.categoryColor} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 800, color: M.text, margin: "0 0 3px" }}>{m.name}</p>
                <span style={{ fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: m.categoryBg, color: m.categoryColor }}>{m.category}</span>
              </div>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M9 18l6-6-6-6" stroke={M.border} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─── Alerts Screen ──────────────────────────────────────────────────────── */
const ALERTS = [
  { date: "2024년 11월 12일", title: "진료팀과 함께 확인해볼 사항이 있습니다", body: "최근 처방 패턴이 평소와 조금 다르게 나타났습니다. 짧은 기간 동안 여러 곳에서 조제가 이루어졌는데, 이는 정당한 이유가 있는 경우가 많습니다. 걱정하지 마시고, 약사나 담당 의사와 간단히 이야기 나눠보시면 좋겠습니다.", read: false, level: "주의" },
  { date: "2024년 10월 3일", title: "리필 시기에 대해 가볍게 확인드립니다", body: "직전 조제보다 약 10일 일찍 리필이 이루어졌습니다. 여행, 일정 변경 등 다양한 이유로 이런 경우가 생길 수 있습니다. 궁금한 점이 있으시면 약사에게 편하게 물어보세요.", read: true, level: "안내" },
];

function AlertsScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 12px", flexShrink: 0 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: M.text, margin: "0 0 4px" }}>알림</h1>
        <p style={{ fontSize: 12, color: M.muted, margin: 0 }}>가벼운 안내 메시지입니다 — 문제가 있다는 의미가 아닙니다.</p>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 20px 24px", display: "flex", flexDirection: "column", gap: 14 }} className="hide-scrollbar">
        {ALERTS.map((a, i) => {
          const isNew = !a.read;
          return (
            <Card key={i} style={{ overflow: "hidden", border: `1px solid ${isNew ? "#FDE68A" : M.border}` }}>
              {/* Level strip */}
              <div style={{
                padding: "9px 16px",
                background: isNew ? "#FFFBEB" : M.lighter,
                borderBottom: `1px solid ${isNew ? "#FDE68A" : M.border}`,
                display: "flex", alignItems: "center", gap: 8
              }}>
                <div style={{
                  width: 18, height: 18, borderRadius: "50%", flexShrink: 0,
                  background: isNew ? "#F59E0B" : M.border,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  {isNew
                    ? <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <svg width="9" height="9" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="10" stroke={M.muted} strokeWidth="2.5"/><path d="M12 8v4M12 16h.01" stroke={M.muted} strokeWidth="2.5" strokeLinecap="round"/></svg>
                  }
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: isNew ? "#92400E" : M.muted }}>
                  {isNew ? "새 알림  ·  " : ""}{a.level} · {a.date}
                </span>
              </div>
              <div style={{ padding: "16px" }}>
                {/* Attention character introduces the alert — calm, not alarming */}
                {isNew && (
                  <div style={{ marginBottom: 14 }}>
                    <CharBubble state="attention" size={48}>
                      <span style={{ fontSize: 13, color: "#92400E", fontWeight: 600 }}>잠깐, 확인이 필요한 사항이 있어요.</span>
                      {" "}걱정하지 마세요 — 보통은 이유가 있는 경우가 많아요.
                    </CharBubble>
                  </div>
                )}
                <p style={{ fontSize: 15, fontWeight: 800, color: M.text, margin: "0 0 8px" }}>{a.title}</p>
                <p style={{ fontSize: 13, color: M.muted, lineHeight: 1.65, margin: "0 0 16px" }}>{a.body}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <button style={{
                    width: "100%", padding: "13px", borderRadius: 14,
                    background: `linear-gradient(135deg, ${M.teal}, ${M.teal2})`,
                    color: "#fff", fontSize: 13, fontWeight: 800, border: "none", cursor: "pointer"
                  }}>
                    약사 또는 담당 의사와 상담하기
                  </button>
                  <button style={{
                    width: "100%", padding: "11px", borderRadius: 14,
                    background: M.bg, color: M.muted, fontSize: 13, fontWeight: 600,
                    border: `1.5px solid ${M.border}`, cursor: "pointer"
                  }}>
                    상담 지원 기관 안내
                  </button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Family Screen ──────────────────────────────────────────────────────── */
const FAMILY = [
  { name: "김준서", relation: "아들", age: 15, insight: "steady" as const, initials: "준", color: "#7C3AED" },
  { name: "김혜진", relation: "어머니", age: 68, insight: "look" as const, initials: "혜", color: "#D97706" },
];

function FamilyScreen() {
  const [manageIdx, setManageIdx] = useState<number | null>(null);

  if (manageIdx !== null) {
    const m = FAMILY[manageIdx];
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
        <StatusBar />
        <div style={{ padding: "4px 20px 12px" }}>
          <button onClick={() => setManageIdx(null)} style={{ fontSize: 13, fontWeight: 600, color: M.teal, background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 4, marginBottom: 10 }}>← 뒤로</button>
          <h1 style={{ fontSize: 20, fontWeight: 800, color: M.text, marginBottom: 2 }}>{m.name} 권한 관리</h1>
          <p style={{ fontSize: 12, color: M.muted, margin: 0 }}>{m.relation} · 만 {m.age}세</p>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 10 }} className="hide-scrollbar">
          {[
            { label: "본인의 처방 이력 직접 조회 가능", desc: "메디싱크에서 자신의 복약 기록을 스스로 확인할 수 있도록 허용합니다." },
            { label: "본인에게 발송된 안전 알림 열람 가능", desc: "자신에게 전송된 알림을 앱에서 직접 확인할 수 있습니다." },
            { label: "본인의 동의 설정 직접 변경 가능", desc: "데이터 공유 여부를 본인이 직접 설정할 수 있습니다." },
          ].map(({ label, desc }) => (
            <Card key={label} style={{ padding: "14px 16px", border: `1px solid ${M.border}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 13, fontWeight: 700, color: M.text, margin: "0 0 3px" }}>{label}</p>
                  <p style={{ fontSize: 11, color: M.muted, lineHeight: 1.5, margin: 0 }}>{desc}</p>
                </div>
                <div style={{ width: 44, height: 26, borderRadius: 13, background: M.teal, position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 18, height: 18, background: "#fff", borderRadius: "50%", position: "absolute", right: 4, top: 4, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 12px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: M.text, margin: "0 0 4px" }}>가족</h1>
        <p style={{ fontSize: 12, color: M.muted, margin: 0 }}>연결된 가족 및 부양가족</p>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 12 }} className="hide-scrollbar">
        {FAMILY.map((m, i) => {
          const cfg = m.insight === "steady"
            ? { bg: M.safeBg, border: "#BBF7D0", textColor: "#166534", icon: "✓", label: "이번 달 복약 상태가 안정적입니다" }
            : { bg: M.amberBg, border: "#FDE68A", textColor: "#92400E", icon: "◐", label: "잠깐 확인해 볼 사항이 있습니다" };
          return (
            <Card key={m.name} style={{ padding: "16px", border: `1px solid ${M.border}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: "50%", background: m.color, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 16, fontWeight: 800 }}>{m.initials}</div>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 800, color: M.text, margin: "0 0 2px" }}>{m.name}</p>
                  <p style={{ fontSize: 12, color: M.muted, margin: 0 }}>{m.relation} · 만 {m.age}세</p>
                </div>
              </div>
              <div style={{ borderRadius: 14, padding: "10px 12px", background: cfg.bg, border: `1px solid ${cfg.border}`, marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <span style={{ color: cfg.textColor, fontWeight: 700 }}>{cfg.icon}</span>
                  <p style={{ fontSize: 12, fontWeight: 600, color: cfg.textColor, margin: 0 }}>{cfg.label}</p>
                </div>
              </div>
              <button onClick={() => setManageIdx(i)} style={{ fontSize: 13, fontWeight: 700, color: M.teal, background: "none", border: "none", cursor: "pointer", padding: 0 }}>
                권한 관리 →
              </button>
            </Card>
          );
        })}
        <button style={{
          width: "100%", padding: "16px", borderRadius: 18,
          border: `2px dashed ${M.border}`, background: "transparent",
          color: M.muted, fontSize: 13, fontWeight: 600, cursor: "pointer"
        }}>
          + 가족 추가 연결
        </button>
      </div>
    </div>
  );
}

/* ─── Settings Screen ────────────────────────────────────────────────────── */
function SettingsScreen({ onLogout }: { onLogout: () => void }) {
  const [sharePharmacy, setSharePharmacy] = useState(false);
  const [personalOnly, setPersonalOnly] = useState(true);
  const [pushAlerts, setPushAlerts] = useState(true);
  const [smsAlerts, setSmsAlerts] = useState(false);

  function Toggle({ on, toggle }: { on: boolean; toggle: () => void }) {
    return (
      <button onClick={toggle} style={{
        width: 44, height: 26, borderRadius: 13, flexShrink: 0,
        background: on ? M.teal : M.border, position: "relative", border: "none", cursor: "pointer"
      }}>
        <div style={{
          width: 18, height: 18, background: "#fff", borderRadius: "50%",
          position: "absolute", top: 4, left: on ? "calc(100% - 22px)" : "4px",
          transition: "left 0.18s", boxShadow: "0 1px 4px rgba(0,0,0,0.15)"
        }} />
      </button>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: M.bg, fontFamily: "Nunito, sans-serif" }}>
      <StatusBar />
      <div style={{ padding: "4px 20px 12px" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: M.text, margin: 0 }}>설정</h1>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px", display: "flex", flexDirection: "column", gap: 16 }} className="hide-scrollbar">
        {/* Profile card */}
        <Card style={{ padding: "16px", border: `1px solid ${M.border}`, display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `linear-gradient(135deg, ${M.teal}, ${M.teal2})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 20, fontWeight: 800 }}>지</div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 800, color: M.text, margin: "0 0 2px" }}>김지영</p>
            <p style={{ fontSize: 12, color: M.muted, margin: 0 }}>010-****-5678 · 인증 완료</p>
          </div>
          <div style={{ marginLeft: "auto" }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 20, background: M.safeBg, color: M.safe }}>인증됨 ✓</span>
          </div>
        </Card>

        {[
          { title: "동의 및 정보 공유", items: [
            { label: "약국과 공유", desc: "조제 시 약사가 안전 요약을 확인합니다", on: sharePharmacy, toggle: () => setSharePharmacy(!sharePharmacy) },
            { label: "개인 기록 전용", desc: "데이터가 메디싱크 내에서만 사용됩니다", on: personalOnly, toggle: () => setPersonalOnly(!personalOnly) },
          ]},
          { title: "알림 설정", items: [
            { label: "푸시 알림", desc: "앱 내 안전 알림 수신", on: pushAlerts, toggle: () => setPushAlerts(!pushAlerts) },
            { label: "SMS 알림", desc: "중요 알림을 문자로 수신", on: smsAlerts, toggle: () => setSmsAlerts(!smsAlerts) },
          ]},
        ].map(section => (
          <div key={section.title}>
            <p style={{ fontSize: 11, fontWeight: 700, color: M.muted, margin: "0 0 8px", textTransform: "uppercase", letterSpacing: "0.07em" }}>{section.title}</p>
            <Card style={{ overflow: "hidden", border: `1px solid ${M.border}` }}>
              {section.items.map(({ label, desc, on, toggle }, i) => (
                <div key={label} style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "14px 16px", background: "#fff",
                  borderBottom: i < section.items.length - 1 ? `1px solid ${M.border}` : "none"
                }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: M.text, margin: "0 0 2px" }}>{label}</p>
                    <p style={{ fontSize: 11, color: M.muted, margin: 0 }}>{desc}</p>
                  </div>
                  <Toggle on={on} toggle={toggle} />
                </div>
              ))}
            </Card>
          </div>
        ))}

        <button onClick={onLogout} style={{
          width: "100%", padding: "14px", borderRadius: 18, fontSize: 14, fontWeight: 600,
          color: M.muted, background: M.card, border: `1.5px solid ${M.border}`, cursor: "pointer", boxShadow: shadowSm
        }}>
          로그아웃
        </button>
      </div>
    </div>
  );
}

/* ─── Bottom Navigation ──────────────────────────────────────────────────── */
const TABS: { id: Screen; label: string; iconD: string }[] = [
  { id: "home",    label: "홈",    iconD: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" },
  { id: "history", label: "이력",  iconD: "M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2" },
  { id: "library", label: "약품",  iconD: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
  { id: "alerts",  label: "알림",  iconD: "M15 17h5l-1.405-1.405A2.032 2.032 0 0 1 18 14.158V11a6.002 6.002 0 0 0-4-5.659V5a2 2 0 1 0-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 1 1-6 0v-1m6 0H9" },
  { id: "family",  label: "가족",  iconD: "M17 20h5v-2a3 3 0 0 0-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 0 1 5.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 0 1 9.288 0M15 7a3 3 0 1 1-6 0 3 3 0 0 1 6 0z" },
];

function BottomNav({ screen, onNav }: { screen: Screen; onNav: (s: Screen) => void }) {
  return (
    <div style={{ display: "flex", background: M.card, borderTop: `1px solid ${M.border}`, flexShrink: 0, padding: "6px 4px 10px" }}>
      {TABS.map(t => {
        const active = screen === t.id;
        return (
          <button key={t.id} onClick={() => onNav(t.id)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center",
            gap: 2, padding: "4px 2px", background: "none", border: "none", cursor: "pointer"
          }}>
            <div style={{
              padding: "6px 16px", borderRadius: 20,
              background: active ? M.teal : "transparent",
              transition: "background 0.18s",
              boxShadow: active ? `0 2px 8px ${M.teal}40` : "none"
            }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d={t.iconD}
                  stroke={active ? "#fff" : M.muted}
                  strokeWidth={active ? "2.2" : "1.6"}
                  strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span style={{
              fontSize: 10, fontFamily: "Nunito, sans-serif",
              fontWeight: active ? 800 : 500,
              color: active ? M.teal : M.muted
            }}>
              {t.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ─── Root ───────────────────────────────────────────────────────────────── */
export default function PatientApp() {
  const [screen, setScreen] = useState<Screen>("onboarding");
  const nav = (s: Screen) => setScreen(s);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {screen === "onboarding" && <OnboardingFlow onDone={() => setScreen("home")} />}
      {screen !== "onboarding" && (
        <>
          <div style={{ flex: 1, overflow: "hidden" }}>
            {screen === "home"     && <HomeScreen    onNav={nav} />}
            {screen === "history"  && <HistoryScreen onNav={nav} />}
            {screen === "library"  && <LibraryScreen />}
            {screen === "alerts"   && <AlertsScreen />}
            {screen === "family"   && <FamilyScreen />}
            {screen === "settings" && <SettingsScreen onLogout={() => setScreen("onboarding")} />}
          </div>
          <BottomNav screen={screen} onNav={nav} />
        </>
      )}
    </div>
  );
}
