import Link from "next/link";
import { Bell } from "lucide-react";

// W24-D Phase 1 home: data/refac/screenshots/parent-app.jpg "01 · /home"
// app-bar 영역. 픽셀 단위 align — refac CSS:
//
//   .app-bar{padding:8px 16px 12px;display:flex;justify-content:space-between;
//            align-items:center}
//   .app-bar h1{font-size:18px;font-weight:900;letter-spacing:-0.025em}
//   .greeting{font-size:13px;color:var(--muted-foreground);font-weight:700;
//             margin-top:8px}
//   .greeting strong{color:var(--foreground);font-weight:900}
//   .icon-btn{width:36px;height:36px;border-radius:999px;background:var(--card);
//             border:1px solid var(--border)}
//   .icon-btn svg{width:16px;height:16px}
//   .icon-btn .dot-r{position:absolute;top:7px;right:8px;width:7px;height:7px;
//                    border-radius:999px;background:var(--destructive);
//                    border:1.5px solid var(--card)}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"] as const;

function todayKstParts(): { month: number; day: number; weekday: string } {
  const now = new Date();
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
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
    <section className="flex items-center justify-between px-4 pt-2 pb-3">
      <div className="min-w-0 flex-1">
        {/* refac .app-bar h1: 18px font-900 tracking -0.025em */}
        <h1 className="text-[18px] font-black tracking-[-0.025em]">
          안녕하세요, {guardianName}님
        </h1>
        {/* refac .greeting: 13px font-700 mt-8px, strong: foreground 900 */}
        <p className="text-muted-foreground mt-2 text-[13px] font-bold">
          오늘은{" "}
          <span className="text-foreground font-black">
            {month}월 {day}일 ({weekday})
          </span>
          이에요
        </p>
      </div>
      {/* refac .icon-btn: 36x36 rounded-full bg-card border, dot-r: 7x7 destructive */}
      <Link
        href="/notifications"
        aria-label={
          unreadCount > 0 ? `알림 (${unreadCount}건 안 읽음)` : "알림"
        }
        className="bg-card border-border relative grid h-9 w-9 shrink-0 place-items-center rounded-full border"
      >
        <Bell className="h-4 w-4" strokeWidth={2.25} />
        {unreadCount > 0 ? (
          <span
            aria-hidden
            className="bg-destructive border-card absolute top-[7px] right-[8px] inline-block h-[7px] w-[7px] rounded-full border-[1.5px]"
          />
        ) : null}
      </Link>
    </section>
  );
}
