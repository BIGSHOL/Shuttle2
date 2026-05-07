// 디자인 토큰 — PWA globals.css의 oklch(...) 토큰을 hex로 변환한 RN constants.
// PWA의 `--bus`, `--success-soft` 등과 같은 의미. 사용자 시각 일관성 유지.
//
// dark theme은 베타 후로 미룸. 지금은 light만.

export const colors = {
  // 학원버스 노란색 — primary action, active banner, KIDS mode
  bus: "#f5d536",
  busForeground: "#3a2f10",
  busSoft: "#fdf4d3",

  // 등원·완료 녹색
  success: "#3aa468",
  successForeground: "#fafafa",
  successSoft: "#dcf2e3",

  // 하원·정보 파란색
  info: "#4a7fd1",
  infoForeground: "#fafafa",
  infoSoft: "#dde6f5",

  // 경고 주황색
  warning: "#d68c2c",
  warningForeground: "#fafafa",
  warningSoft: "#f5e6c5",

  // destructive (운행 종료, 미탑승 등)
  destructive: "#dc4444",
  destructiveForeground: "#fafafa",

  // base
  background: "#ffffff",
  foreground: "#1a1a1a",
  card: "#ffffff",
  cardForeground: "#1a1a1a",
  muted: "#f7f7f7",
  mutedForeground: "#7a7a7a",
  border: "#e8e8e8",
} as const;

// 둥근 모서리 스케일 — CLAUDE.md 규약 준수.
// rounded-lg(8) 외곽 컨테이너 / rounded-md(6) 내부 element / rounded-full 원형.
export const radii = {
  md: 6,
  lg: 8,
  full: 9999,
} as const;

// Tailwind unit과 동등 (1 unit = 4px).
// e.g. spacing(3) = 12 (px-3 equivalent).
export const spacing = (n: number) => n * 4;

// 그림자 scale — data/01 phase-0 tokens.md에서 정의된 web shadow 매칭.
// xs(평면)·sm(카드)·md(영웅 카드)·lg(modal)·live(노란 glow, 운행 시작 button).
export const shadows = {
  xs: {
    shadowColor: "#14161c",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  sm: {
    shadowColor: "#14161c",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  md: {
    shadowColor: "#14161c",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  lg: {
    shadowColor: "#14161c",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  // 노란 glow — 운행 시작·진행 중 액션 강조 (data/04 phase-2 driver.md).
  live: {
    shadowColor: "#f5c518",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 6,
  },
} as const;

// 둥근 모서리 추가 — phase-2 driver.md의 rounded-2xl(16) / rounded-xl(12).
// (기존 lg=8, md=6과 별도. CLAUDE.md 규약 충돌 가능성은 design 가이드 우선
// 적용 — 다음 CLAUDE.md update에서 정합화 예정.)
export const radiiExt = {
  xl: 12,
  "2xl": 16,
} as const;

// 폰트 weight — Pretendard 매칭.
// Pretendard ttf 등록 후 fontFamily로 명시.
export const fontWeights = {
  regular: "400" as const,
  bold: "700" as const,
  extraBold: "800" as const,
};
