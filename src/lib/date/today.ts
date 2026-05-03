// KST(Asia/Seoul) 기준 "오늘"을 계산하는 공용 헬퍼.
//
// 서버는 보통 UTC. JS getDay()/setUTCHours()를 그대로 쓰면 KST 새벽 0~9시
// 구간에서 day가 어긋난다 (UTC에선 전날). 그래서 KST 기준 오늘 day와
// 자정 UTC 표현을 별도 헬퍼로 통일.
//
// CLAUDE.md "일자/시각은 항상 KST 기준" 규칙 준수.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 비트마스크: 월=1 화=2 수=4 목=8 금=16 토=32 일=64.
// JS getDay()는 일=0 월=1 ... 토=6.
export function todayBitKst(): number {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  const d = kst.getUTCDay(); // KST 시각의 day
  if (d === 0) return 64;
  return 1 << (d - 1);
}

// KST 기준 "오늘"의 자정을 UTC Date로 반환.
// Trip.date(@db.Date)는 UTC 자정으로 저장 — 그 비교 키와 일치.
//
// 예: KST 2026-05-04 03:00 → KST 2026-05-04 00:00 → 동일한 UTC 2026-05-04 00:00 Date.
// 단, Trip.date는 driver가 운행 시작 시 KST 기준 날짜로 만들어야 일치한다 (별도 보장 필요).
export function todayUtcDateKst(): Date {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  // KST 자정의 wall-clock을 UTC Date로 표현
  return new Date(
    Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()),
  );
}
