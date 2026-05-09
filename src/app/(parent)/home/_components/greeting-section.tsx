// W25 P0-A: ground truth Parent App.html app-bar 패턴 — "안녕하세요, {이름}님" + 날짜.
// 보호자 이름은 학원 데이터 기준 me.guardian.name. 알림 종은 부모 헤더가 담당.
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstShort(): string {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const d = kst.getUTCDate();
  const w = WEEKDAYS[kst.getUTCDay()];
  return `${m}월 ${d}일 (${w})`;
}

export function GreetingSection({ guardianName }: { guardianName: string }) {
  return (
    <section className="px-5 pt-5 pb-2">
      <h2 className="text-2xl font-black tracking-tight leading-tight">
        안녕하세요, {guardianName}님
      </h2>
      <p className="text-muted-foreground mt-1 text-sm font-bold">
        오늘은{" "}
        <span className="text-foreground font-black">{todayKstShort()}</span>
        이에요
      </p>
    </section>
  );
}
