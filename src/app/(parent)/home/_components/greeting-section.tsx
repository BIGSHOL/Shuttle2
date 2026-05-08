import Link from "next/link";
import { Bell } from "lucide-react";

// W24-D Phase 1 home: data/refac/screenshots/parent-app.jpg "01 · /home"
// app-bar 영역 reproduce. ParentHeader는 /home에서 hidden(parent-header.tsx
// pathname check)이고 본 컴포넌트가 헤더 역할.
//
// refac Parent App.html .app-bar:
//   <h1>안녕하세요, 김유나님</h1>
//   <div class="greeting">오늘은 <strong>5월 7일 (목)</strong>이에요</div>
//   <div class="actions"><div class="icon-btn"><i bell/><div dot-r/></div></div>

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstParts(): { month: number; day: number; weekday: string } {
  const kst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  return {
    month: kst.getUTCMonth() + 1,
    day: kst.getUTCDate(),
    weekday: WEEKDAYS[kst.getUTCDay()],
  };
}

export function GreetingSection({
  guardianName,
  unreadCount,
}: {
  guardianName: string;
  unreadCount: number;
}) {
  const { month, day, weekday } = todayKstParts();
  return (
    <section className="flex items-start justify-between gap-3 px-4 pt-4 pb-2">
      <div className="min-w-0 flex-1">
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
      </div>
      <Link
        href="/notifications"
        aria-label={
          unreadCount > 0
            ? `알림 (${unreadCount}건 안 읽음)`
            : "알림"
        }
        className="bg-card relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm"
      >
        <Bell className="h-4 w-4" strokeWidth={2.25} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="bg-destructive border-card absolute top-1.5 right-1.5 inline-block h-2 w-2 rounded-full border-[1.5px]"
          />
        ) : null}
      </Link>
    </section>
  );
}
