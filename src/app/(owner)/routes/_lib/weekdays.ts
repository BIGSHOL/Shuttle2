// 비트마스크: 월=1 화=2 수=4 목=8 금=16 토=32 일=64
export const WEEKDAYS = [
  { bit: 1, label: "월" },
  { bit: 2, label: "화" },
  { bit: 4, label: "수" },
  { bit: 8, label: "목" },
  { bit: 16, label: "금" },
  { bit: 32, label: "토" },
  { bit: 64, label: "일" },
] as const;

export function formatWeekdays(mask: number): string {
  if (mask === 0) return "—";
  if (mask === 31) return "월~금";
  if (mask === 127) return "매일";
  return WEEKDAYS.filter((d) => mask & d.bit)
    .map((d) => d.label)
    .join("·");
}

export function formatDirection(d: "PICKUP" | "DROPOFF"): string {
  return d === "PICKUP" ? "등원" : "하원";
}
