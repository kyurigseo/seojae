import { useState } from "react";
import PatientApp from "./PatientApp";
import PharmacistApp from "./PharmacistApp";

type Mode = "patient" | "pharmacist";

/* ─── Medisync Logo Mark ──────────────────────────────────────────────────── */
function MedisyncMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#35A8B5"/>
      <path d="M8 20 L12 11 L16 18 L20 11 L24 20" stroke="#DFF4F5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="22" r="2" fill="#DFF4F5"/>
    </svg>
  );
}

function Selector({ onSelect }: { onSelect: (m: Mode) => void }) {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F5FAFB", fontFamily: "Inter, sans-serif" }}>
      {/* Top bar */}
      <div className="flex items-center gap-3 px-8 py-5 border-b" style={{ borderColor: "#D8EFF2", background: "#fff" }}>
        <MedisyncMark size={28} />
        <span className="text-lg font-600" style={{ color: "#0D2E38", letterSpacing: "-0.02em" }}>Medisync</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-500" style={{ background: "#DFF4F5", color: "#35A8B5" }}>처방의약품 오남용 조기경보</span>
      </div>

      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-700 mb-4" style={{ color: "#0D2E38", lineHeight: 1.2, letterSpacing: "-0.03em" }}>
            처방 순간, 함께 판단합니다
          </h1>
          <p className="text-base" style={{ color: "#5A8A95", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
            환자·약국·의원 사이 의료용 마약류 처방 정보를 실시간으로 동기화(Sync)하여<br/>
            사각지대를 없애는 조기경보 시스템입니다
          </p>
        </div>

        <div className="flex gap-4 w-full" style={{ maxWidth: 560 }}>
          {/* Pharmacist card */}
          <button onClick={() => onSelect("pharmacist")}
            className="flex-1 text-left rounded-2xl p-6 group"
            style={{ background: "#0F3540", border: "1px solid #163D4A" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "rgba(223,244,245,0.12)" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="2" y="3" width="16" height="12" rx="2" stroke="#DFF4F5" strokeWidth="1.5"/>
                <path d="M6 7h8M6 10h5" stroke="#DFF4F5" strokeWidth="1.5" strokeLinecap="round"/>
                <path d="M13 14v3M11 17h4" stroke="#35A8B5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-base font-700 mb-1" style={{ color: "#DFF4F5" }}>약사용 대시보드</p>
            <p className="text-sm leading-relaxed" style={{ color: "#5A8A95" }}>
              조제 접수 시 실시간 리스크 팝업, 처방 타임라인, 확인·소명 액션
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-600" style={{ color: "#35A8B5" }}>
              <span>웹 대시보드</span>
              <span>→</span>
            </div>
          </button>

          {/* Patient card */}
          <button onClick={() => onSelect("patient")}
            className="flex-1 text-left rounded-2xl p-6 group"
            style={{ background: "#fff", border: "1px solid #D8EFF2" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{ background: "#DFF4F5" }}>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <rect x="5" y="1" width="10" height="18" rx="3" stroke="#35A8B5" strokeWidth="1.5"/>
                <path d="M8 5h4M8 8h4M8 11h2" stroke="#35A8B5" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-base font-700 mb-1" style={{ color: "#0D2E38" }}>환자용 앱</p>
            <p className="text-sm leading-relaxed" style={{ color: "#5A8A95" }}>
              본인 처방 이력, 성분·위험 안내, 보호자 공동관리 모바일 플로우
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-600" style={{ color: "#35A8B5" }}>
              <span>모바일 앱</span>
              <span>→</span>
            </div>
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex gap-2 mt-8 flex-wrap justify-center">
          {["설명 가능한 AI 리스크 스코어링", "조제 접수 순간 실시간 팝업", "환자 복약 리터러시 앱", "처방 소프트웨어 연동"].map(f => (
            <span key={f} className="text-xs px-3 py-1.5 rounded-full font-500"
              style={{ background: "#DFF4F5", color: "#35A8B5", border: "1px solid #BFE8ED" }}>
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [mode, setMode] = useState<Mode | null>(null);

  if (!mode) return <Selector onSelect={setMode} />;

  if (mode === "patient") {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#BFE8ED" }}>
        <button onClick={() => setMode(null)}
          className="fixed top-4 left-4 z-50 px-3 py-1.5 rounded-lg text-xs font-600 shadow-sm"
          style={{ background: "#fff", color: "#0D2E38", border: "1px solid #D8EFF2", fontFamily: "Inter, sans-serif" }}>
          ← 화면 전환
        </button>
        <div style={{ width: 390, height: 844 }} className="relative">
          <div className="absolute inset-0 rounded-[44px] shadow-2xl"
            style={{ background: "#1a1a1a", padding: 10 }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-7 rounded-b-2xl z-10"
              style={{ background: "#1a1a1a" }} />
            <div className="w-full h-full rounded-[36px] overflow-hidden">
              <PatientApp />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
      <button onClick={() => setMode(null)}
        className="fixed top-3 right-4 z-50 px-3 py-1.5 rounded-lg text-xs font-600 shadow-sm"
        style={{ background: "#fff", color: "#0D2E38", border: "1px solid #D8EFF2", fontFamily: "Inter, sans-serif" }}>
        ← 화면 전환
      </button>
      <PharmacistApp />
    </div>
  );
}
