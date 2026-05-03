// 인사말 — KST 오늘 날짜 + 헤드라인.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstLabel(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const w = WEEKDAYS[kst.getUTCDay()];
  return `${y}. ${m}. ${d} (${w})`;
}

export function GreetingSection({
  todayCount,
}: {
  todayCount: number;
}) {
  const summary =
    todayCount === 0
      ? "오늘 예정된 운행이 없어요"
      : `오늘 ${todayCount}건 운행이 있어요`;

  return (
    <section className="bg-background border-b px-5 py-4">
      <p className="text-muted-foreground text-[11px] font-semibold tracking-wide">
        {todayKstLabel()}
      </p>
      <h2 className="mt-0.5 text-2xl font-extrabold tracking-tight">
        {summary}
      </h2>
    </section>
  );
}
