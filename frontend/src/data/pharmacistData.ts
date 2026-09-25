export type RiskTier = "안전" | "주의" | "고위험";

export interface Signal {
  id: string;
  label: string;
  maxPts: number;
  pts: number;
  triggered: boolean;
}

export interface DispensingEvent {
  date: string;
  institution: string;
  institutionColor: string;
  medicine: string;
  isToday?: boolean;
}

export interface Patient {
  id: string;
  maskedName: string;
  age: number;
  medicines: string[];
  dosage: string;
  prescribingInstitution: string;
  scanTime: string;
  score: number;
  tier: RiskTier;
  status: "대기" | "확인완료" | "사유기재" | "보류" | "신고";
  pushAlertSent: boolean;
  explanation: string;
  justifiedContext?: string;
  signals: Signal[];
  timeline: DispensingEvent[];
  pharmacistNote?: string;
}

export const makeSignals = (overrides: Partial<Record<string, number>>): Signal[] => [
  {
    id: "shopping",
    label: "중복 처방(의료쇼핑)",
    maxPts: 40,
    pts: overrides.shopping ?? 0,
    triggered: (overrides.shopping ?? 0) > 0,
  },
  {
    id: "refill",
    label: "조기 조제",
    maxPts: 30,
    pts: overrides.refill ?? 0,
    triggered: (overrides.refill ?? 0) > 0,
  },
  {
    id: "dose",
    label: "용량·빈도 급증",
    maxPts: 20,
    pts: overrides.dose ?? 0,
    triggered: (overrides.dose ?? 0) > 0,
  },
  {
    id: "switching",
    label: "약물 계열 전환",
    maxPts: 20,
    pts: overrides.switching ?? 0,
    triggered: (overrides.switching ?? 0) > 0,
  },
  {
    id: "combo",
    label: "금기 병용",
    maxPts: 10,
    pts: overrides.combo ?? 0,
    triggered: (overrides.combo ?? 0) > 0,
  },
];

/** Static demo data — used only as a fallback if the backend is unreachable. */
export const patients: Patient[] = [
  {
    id: "A",
    maskedName: "박○○",
    age: 32,
    medicines: ["트라마돌 염산염"],
    dosage: "50mg × 30정",
    prescribingInstitution: "서울대학교병원",
    scanTime: "09:14",
    score: 0,
    tier: "안전",
    status: "확인완료",
    pushAlertSent: false,
    explanation:
      "위험 신호가 감지되지 않았습니다. 이 처방전은 단일 기관에서 발행된 표준 30일 주기 처방을 따르고 있으며, 용량은 직전 세 건의 처방과 동일합니다.",
    signals: makeSignals({}),
    timeline: [
      { date: "8월 12일", institution: "서울대병원", institutionColor: "#2563eb", medicine: "트라마돌 50mg" },
      { date: "9월 11일", institution: "서울대병원", institutionColor: "#2563eb", medicine: "트라마돌 50mg" },
      { date: "10월 12일", institution: "서울대병원", institutionColor: "#2563eb", medicine: "트라마돌 50mg" },
      { date: "11월 12일", institution: "서울대병원", institutionColor: "#2563eb", medicine: "트라마돌 50mg", isToday: true },
    ],
  },
  {
    id: "B",
    maskedName: "최○○",
    age: 58,
    medicines: ["옥시코돈 염산염"],
    dosage: "10mg × 28정",
    prescribingInstitution: "세브란스병원",
    scanTime: "10:02",
    score: 30,
    tier: "안전",
    status: "대기",
    pushAlertSent: false,
    explanation:
      "조기 조제 1건 감지: 직전 조제 후 19일 만에 처방 발행(표준 주기 28일 대비 32% 빠름). 지난 6개월 중 첫 번째 조기 조제이며 동일 기관에서 발행되었습니다. 다른 위험 신호는 없습니다.",
    signals: makeSignals({ refill: 30 }),
    timeline: [
      { date: "8월 28일", institution: "세브란스", institutionColor: "#7c3aed", medicine: "옥시코돈 10mg" },
      { date: "9월 25일", institution: "세브란스", institutionColor: "#7c3aed", medicine: "옥시코돈 10mg" },
      { date: "10월 24일", institution: "세브란스", institutionColor: "#7c3aed", medicine: "옥시코돈 10mg" },
      { date: "11월 12일", institution: "세브란스", institutionColor: "#7c3aed", medicine: "옥시코돈 10mg", isToday: true },
    ],
  },
  {
    id: "C",
    maskedName: "김○○",
    age: 45,
    medicines: ["히드로코돈/아세트아미노펜", "알프라졸람"],
    dosage: "10mg-325mg × 60정 / 1mg × 30정",
    prescribingInstitution: "분당제생병원",
    scanTime: "11:47",
    score: 100,
    tier: "고위험",
    status: "대기",
    pushAlertSent: true,
    explanation:
      "최근 30일 이내 3개 의료기관에서 동일 성분 처방전 4건 확인. 평균 조제 간격 5.2일(표준 28일 대비 81% 단축). 2개월 전 대비 용량 2.4배 증가. 벤조디아제핀(알프라졸람)과 오피오이드 병용 — 호흡 억제 위험이 있는 금기 조합입니다.",
    signals: makeSignals({ shopping: 40, refill: 30, dose: 20, combo: 10 }),
    timeline: [
      { date: "10월 14일", institution: "서울아산병원", institutionColor: "#2563eb", medicine: "히드로코돈 5mg" },
      { date: "10월 21일", institution: "분당제생병원", institutionColor: "#16a34a", medicine: "히드로코돈 10mg" },
      { date: "10월 28일", institution: "강남세브란스", institutionColor: "#d97706", medicine: "히드로코돈 10mg" },
      { date: "11월 4일", institution: "분당제생병원", institutionColor: "#16a34a", medicine: "히드로코돈 10mg" },
      { date: "11월 12일", institution: "분당제생병원", institutionColor: "#16a34a", medicine: "히드로코돈 10mg", isToday: true },
    ],
  },
  {
    id: "D",
    maskedName: "이○○",
    age: 61,
    medicines: ["황산모르핀 서방정"],
    dosage: "30mg × 60정",
    prescribingInstitution: "국립암센터",
    scanTime: "13:05",
    score: 47,
    tier: "안전",
    status: "확인완료",
    pushAlertSent: false,
    justifiedContext: "종양학 / 완화의료",
    explanation:
      "원시 패턴은 복수 기관 조제 및 용량 증가를 보여 정황 보정 없이 87점에 해당합니다. 처방 기관이 등록된 종양학·완화의료 기관(국립암센터)임을 확인하여 점수를 47점으로 하향 조정했습니다. 완화의료 환경에서 오피오이드 용량 증가는 임상적으로 예상되는 경과입니다. 푸시 알림 미발송.",
    signals: makeSignals({ shopping: 40, dose: 20 }),
    timeline: [
      { date: "9월 1일", institution: "국립암센터", institutionColor: "#0f9488", medicine: "모르핀 15mg" },
      { date: "10월 1일", institution: "국립암센터", institutionColor: "#0f9488", medicine: "모르핀 20mg" },
      { date: "10월 20일", institution: "국립암센터", institutionColor: "#0f9488", medicine: "모르핀 30mg" },
      { date: "11월 12일", institution: "국립암센터", institutionColor: "#0f9488", medicine: "모르핀 30mg", isToday: true },
    ],
  },
  {
    id: "E",
    maskedName: "정○○",
    age: 39,
    medicines: ["부프레노르핀/날록손"],
    dosage: "8mg-2mg × 30필름",
    prescribingInstitution: "경희대학교병원",
    scanTime: "14:30",
    score: 75,
    tier: "주의",
    status: "대기",
    pushAlertSent: false,
    explanation:
      "60일간 세 가지 서로 다른 오피오이드 계열 약물 간 전환 감지: 코데인(10월 1일, 경희대), 트라마돌(10월 22일, 보라매병원), 부프레노르핀/날록손(경희대). 각 성분은 오피오이드의 서로 다른 하위 계열에 해당합니다. 단독 조기 조제 사례는 없으나, 복수 기관에 걸친 전환 패턴이 관찰됩니다. 대시보드 표시만 — 푸시 알림 미발송.",
    signals: makeSignals({ shopping: 30, switching: 20, refill: 25 }),
    timeline: [
      { date: "10월 1일", institution: "경희대병원", institutionColor: "#7c3aed", medicine: "코데인 30mg" },
      { date: "10월 22일", institution: "보라매병원", institutionColor: "#d97706", medicine: "트라마돌 100mg" },
      { date: "11월 5일", institution: "경희대병원", institutionColor: "#7c3aed", medicine: "부프레노르핀 8mg" },
      { date: "11월 12일", institution: "경희대병원", institutionColor: "#7c3aed", medicine: "부프레노르핀 8mg", isToday: true },
    ],
  },
];

export const auditLog = [
  { date: "11/12", patient: "김○○", age: 45, score: 100, tier: "고위험" as RiskTier, action: "보류", note: "복수 기관 조제 이유 설명 불가. 처방 의사에게 연락 중." },
  { date: "11/11", patient: "오○○", age: 53, score: 82, tier: "고위험" as RiskTier, action: "사유기재", note: "만성 통증 관리 확인 — 정형외과 전문의 공동 서명." },
  { date: "11/10", patient: "윤○○", age: 29, score: 68, tier: "주의" as RiskTier, action: "확인완료", note: "" },
  { date: "11/9", patient: "한○○", age: 67, score: 91, tier: "고위험" as RiskTier, action: "신고", note: "7일 내 3개 기관, 질문에 무응답." },
  { date: "11/8", patient: "신○○", age: 41, score: 60, tier: "주의" as RiskTier, action: "확인완료", note: "" },
  { date: "11/7", patient: "임○○", age: 35, score: 88, tier: "고위험" as RiskTier, action: "사유기재", note: "수술 후 통증 — 퇴원 서류 확인 완료." },
];
