// W24-D Phase 1 home: data/refac/screenshots/parent-app.jpg "01 · /home"
// app-bar 영역 reproduce. ParentHeader는 parent 화면 공유 컴포넌트라 시각 유지하되
// page 안 hero에 보호자 이름 인사 + 오늘 날짜 표기.
//
// refac Parent App.html .app-bar:
//   <h1>안녕하세요, 김유나님</h1>
//   <div class="greeting">오늘은 <strong>5월 7일 (목)</strong>이에요</div>

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstParts(): { month: number; day: number; weekday: string } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return {
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    weekday: WEEKDAYS[kst.getUTCDay()],
  };
}

export function GreetingSection({ guardianName }: { guardianName: string }) {
  const { month, day, weekday } = todayKstParts();
  return (
    <section className="px-4 pt-4 pb-2">
      <h1 className="text-lg font-black tracking-tight leading-tight">
        안녕하세요, {guardianName}님
      </h1>
      <p className="text-muted-foreground mt-1.5 text-[13px] font-bold">
        오늘은{" "}
        <span className="text-foreground font-black">
          {month}월 {day}일 ({weekday})
        </span>
        이에요
      </p>
    </section>
  );
}
