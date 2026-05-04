// 분기 시작·종료 일자 계산 (KST 기준).
// 도로교통법 안전운행기록은 분기 단위 작성·제출.
// Q1 1-3월, Q2 4-6월, Q3 7-9월, Q4 10-12월.

export type Quarter = 1 | 2 | 3 | 4;

export function isQuarter(n: unknown): n is Quarter {
  return n === 1 || n === 2 || n === 3 || n === 4;
}

// KST 기준 현재 분기.
export function currentKstQuarter(): { year: number; quarter: Quarter } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const year = kst.getUTCFullYear();
  const month = kst.getUTCMonth() + 1; // 1-12
  const quarter = Math.ceil(month / 3) as Quarter;
  return { year, quarter };
}

// 분기의 [시작, 종료] UTC date. DB Trip.date가 UTC 자정으로 저장되니 그대로 비교 가능.
// 종료는 다음 분기 시작 직전 — exclusive end (lt).
export function quarterRangeUtc(
  year: number,
  quarter: Quarter,
): { start: Date; endExclusive: Date } {
  const startMonth = (quarter - 1) * 3; // 0, 3, 6, 9 (UTC month 0-index)
  const start = new Date(Date.UTC(year, startMonth, 1));
  const endExclusive = new Date(Date.UTC(year, startMonth + 3, 1));
  return { start, endExclusive };
}

export function quarterLabel(year: number, quarter: Quarter): string {
  return `${year}년 ${quarter}분기`;
}

export function quarterMonthsLabel(year: number, quarter: Quarter): string {
  const start = (quarter - 1) * 3 + 1;
  const end = start + 2;
  return `${year}년 ${start}월 ~ ${end}월`;
}
