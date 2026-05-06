// 인사말 — KST 오늘 날짜만. 운행 건수는 trip 카드 위에 별도 렌더 가능했으나
// Suspense 분리 후엔 page에서 즉시 보여줄 수 있는 정보만 쓴다.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstLabel(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const w = WEEKDAYS[kst.getUTCDay()];
  return `${y}. ${m}. ${d} (${w})`;
}

export function GreetingSection() {
  return (
    <section className="bg-background border-b px-5 py-4">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide">
        {todayKstLabel()}
      </p>
      <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight">
        오늘 일정
      </h2>
    </section>
  );
}
