/**
 * MediCell — Medisync's digital immune cell mascot. 5 functional states.
 * "A friendly digital cell that detects medication safety signals."
 *
 * Sensors: 8 intentional surface receptors (reduced from 14) arranged
 * around the upper body, each with a small signal-tip circle.
 * States: default | analysis | guide | attention | complete
 */

export type CharState = "default" | "analysis" | "guide" | "attention" | "complete";

/*
 * Sensor positions: [x, y, rotation]
 * 8 evenly-spaced receptors around the upper ¾ of the body.
 * Fewer, cleaner, intentional — feels like a cell surface, not random spikes.
 */
const SENSORS: [number, number, number][] = [
  [46, 30, -20],   // upper-left
  [66, 25,   0],   // top-center
  [86, 31,  20],   // upper-right
  [105, 52,  54],  // right-upper
  [107, 74,  80],  // right
  [93, 98,  108],  // lower-right
  [48, 107, 150],  // lower-left (foot)
  [24, 50,  218],  // left
];

export function MedisyncChar({ size = 80, state = "default" }: { size?: number; state?: CharState }) {
  const gid = `cg_${state}`;

  return (
    <svg width={size} height={size} viewBox="0 0 148 148" fill="none" xmlns="http://www.w3.org/2000/svg" overflow="visible">
      <defs>
        <radialGradient id={gid} cx="36%" cy="26%" r="70%">
          <stop offset="0%"   stopColor="#F6F9FF"/>
          <stop offset="55%"  stopColor="#D4E4F6"/>
          <stop offset="100%" stopColor="#A8BBEA"/>
        </radialGradient>
      </defs>

      {/* ── Left cheek — darker blue, behind body ── */}
      <circle cx="20" cy="72" r="22" fill="#4A58D0" opacity="0.90"/>

      {/* ── Sensors: 8 surface receptors, each a pill + signal-tip circle ── */}
      {SENSORS.map(([x, y, rot], i) => (
        <g key={i} transform={`rotate(${rot} ${x} ${y})`}>
          {/* Pill stalk */}
          <rect x={x - 5.5} y={y - 9} width="11" height="9" rx="5.5" fill="#BAD0F0" opacity="0.85"/>
          {/* Signal-tip circle — the "sensing" end */}
          <circle cx={x} cy={y - 9} r="3.5" fill="#A0BFEC" opacity="0.9"/>
        </g>
      ))}

      {/* ── Main body ── */}
      <circle cx="66" cy="74" r="46" fill={`url(#${gid})`}/>

      {/* ── Right cheek — bright sky-blue, in front ── */}
      <circle cx="100" cy="92" r="20" fill="#5598E8" opacity="0.92"/>

      {/* ── Eyes ── */}
      {state === "attention" ? (
        <>
          {/* Calm concern: slight brow crease over left eye */}
          <path d="M43 58 Q50 53 57 57" stroke="#3A3D52" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
          <rect x="44" y="62" width="11" height="12" rx="4.5" fill="#3A3D52"/>
          <rect x="63" y="61" width="11" height="12" rx="4.5" fill="#3A3D52"/>
        </>
      ) : state === "complete" ? (
        <>
          {/* Happy: closed-arc squint */}
          <path d="M43 65 Q50 60 57 65" stroke="#3A3D52" strokeWidth="3" strokeLinecap="round" fill="none"/>
          <path d="M63 64 Q70 59 77 64" stroke="#3A3D52" strokeWidth="3" strokeLinecap="round" fill="none"/>
        </>
      ) : (
        <>
          <rect x="44" y="61" width="11" height="13" rx="4.5" fill="#3A3D52"/>
          <rect x="63" y="61" width="11" height="13" rx="4.5" fill="#3A3D52"/>
        </>
      )}

      {/* ── Mouth ── */}
      {state === "complete" ? (
        <path d="M43 83 Q58 96 73 83" stroke="#3A3D52" strokeWidth="3" strokeLinecap="round" fill="none"/>
      ) : state === "attention" ? (
        <path d="M50 84 Q58 88 66 84" stroke="#3A3D52" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      ) : (
        <path d="M47 83 Q58 91 69 83" stroke="#3A3D52" strokeWidth="2.2" strokeLinecap="round" fill="none"/>
      )}

      {/* ── ANALYSIS: magnifying glass with mini data lines ── */}
      {state === "analysis" && (
        <g transform="translate(96, 36)">
          <circle cx="14" cy="14" r="12" fill="white" fillOpacity="0.96" stroke="#35A8B5" strokeWidth="2.5"/>
          <line x1="23" y1="23" x2="32" y2="32" stroke="#35A8B5" strokeWidth="3" strokeLinecap="round"/>
          <rect x="8"  y="10" width="12" height="2" rx="1" fill="#35A8B5" opacity="0.5"/>
          <rect x="8"  y="14" width="9"  height="2" rx="1" fill="#35A8B5" opacity="0.38"/>
          <rect x="8"  y="18" width="11" height="2" rx="1" fill="#35A8B5" opacity="0.32"/>
        </g>
      )}

      {/* ── GUIDE: compact Rx card ── */}
      {state === "guide" && (
        <g transform="translate(98, 36)">
          <rect x="0" y="0" width="38" height="46" rx="8" fill="white" fillOpacity="0.97" stroke="#BFE8ED" strokeWidth="1.5"/>
          <text x="6" y="14" fontSize="11" fontWeight="800" fill="#35A8B5" fontFamily="Inter, sans-serif">Rx</text>
          <rect x="6" y="19" width="26" height="2.5" rx="1.25" fill="#D8EFF2"/>
          <rect x="6" y="24" width="20" height="2.5" rx="1.25" fill="#D8EFF2"/>
          <rect x="6" y="29" width="23" height="2.5" rx="1.25" fill="#D8EFF2"/>
          <rect x="6" y="36" width="18" height="7"   rx="3.5"  fill="#DFF4F5"/>
          <circle cx="19" cy="39.5" r="3" fill="#35A8B5" opacity="0.72"/>
        </g>
      )}

      {/* ── COMPLETE: green check badge ── */}
      {state === "complete" && (
        <g transform="translate(92, 18)">
          <circle cx="16" cy="16" r="16" fill="#16A34A"/>
          <path d="M8 16 L13 22 L25 9" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
        </g>
      )}
    </svg>
  );
}

/**
 * Character + speech bubble, for AI explanation and guidance panels.
 * The bubble extends to the right of the character.
 */
export function CharBubble({
  state = "default",
  size = 64,
  children,
  subtext,
}: {
  state?: CharState;
  size?: number;
  children: React.ReactNode;
  subtext?: string;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: 10 }}>
      <div style={{ flexShrink: 0, paddingLeft: 6 }}>
        <MedisyncChar size={size} state={state} />
      </div>
      <div style={{
        background: "#fff",
        borderRadius: "18px 18px 18px 5px",
        padding: "12px 14px",
        border: "1.5px solid #D8EFF2",
        boxShadow: "0 2px 10px rgba(13,46,56,0.06)",
        flex: 1,
      }}>
        <div style={{ fontSize: 13, color: "#334155", lineHeight: 1.65 }}>{children}</div>
        {subtext && (
          <p style={{ fontSize: 11, color: "#94A3B8", margin: "6px 0 0" }}>{subtext}</p>
        )}
      </div>
    </div>
  );
}

/* Re-export React so callers don't need to import it separately for JSX */
import React from "react";
void React; // prevent unused import warning
