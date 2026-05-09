import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Bus,
  CalendarOff,
  Check,
  MapPinOff,
} from "lucide-react";

// W24-D Phase 1 home: refac Parent App.html "최근 알림" 섹션.
// 픽셀 단위 align — refac CSS:
//
//   .card{background:var(--card);border:1px solid var(--border);
//         border-radius:14px;padding:14px}
//   .notif{display:flex;gap:10px;padding:10px 0;border-bottom:1px dashed var(--border);
//          align-items:flex-start}
//   .notif:last-child{border-bottom:0}
//   .notif-ico{width:34px;height:34px;border-radius:999px;display:grid;place-items:center;
//              flex-shrink:0}
//   .notif-ico.success{background:var(--success-soft);color:var(--success)}
//   .notif-ico.bus{background:var(--bus-soft);color:var(--bus-foreground)}
//   .notif-ico svg{width:16px;height:16px}
//   .notif-title{font-size:13px;font-weight:800}
//   .notif-desc{font-size:11px;color:var(--muted-foreground);font-weight:600;
//               margin-top:2px;line-height:1.4}
//   .notif-time{font-size:10px;color:var(--muted-foreground);font-weight:800}

export type NotifRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string | null;
  createdAtISO: string;
};

const ICON_MAP: Record<string, { Icon: typeof Bell; toneClass: string }> = {
  TRIP_STARTED: { Icon: Bus, toneClass: "bg-bus-soft text-bus-foreground" },
  STUDENT_BOARDED: { Icon: Check, toneClass: "bg-success-soft text-success" },
  STUDENT_DROPPED_OFF: {
    Icon: Check,
    toneClass: "bg-success-soft text-success",
  },
  STUDENT_NO_SHOW: {
    Icon: AlertTriangle,
    toneClass: "bg-destructive/10 text-destructive",
  },
  STUDENT_NO_DROPOFF: {
    Icon: AlertTriangle,
    toneClass: "bg-destructive/10 text-destructive",
  },
  TRIP_DELAYED: {
    Icon: AlertTriangle,
    toneClass: "bg-warning-soft text-warning",
  },
  TRIP_ENDED: { Icon: Check, toneClass: "bg-success-soft text-success" },
  ABSENCE_APPROVED: {
    Icon: CalendarOff,
    toneClass: "bg-warning-soft text-warning",
  },
  ABSENCE_REJECTED: {
    Icon: CalendarOff,
    toneClass: "bg-destructive/10 text-destructive",
  },
  STOP_CHANGE_APPROVED: {
    Icon: MapPinOff,
    toneClass: "bg-info-soft text-info",
  },
  STOP_CHANGE_REJECTED: {
    Icon: MapPinOff,
    toneClass: "bg-destructive/10 text-destructive",
  },
  SHUTTLE_NEAR_CHILD: {
    Icon: Bus,
    toneClass: "bg-bus-soft text-bus-foreground",
  },
};

function fmtAgoKst(iso: string): string {
  const diffMs = new Date().getTime() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  if (day === 1) return "어제";
  if (day < 7) return `${day}일 전`;
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    timeZone: "Asia/Seoul",
  }).format(new Date(iso));
}

export function RecentNotifications({ items }: { items: NotifRow[] }) {
  if (items.length === 0) return null;

  return (
    <section className="px-4">
      <div className="mt-[18px] flex items-center justify-between">
        <h3 className="text-[13px] font-black tracking-[-0.01em]">최근 알림</h3>
        <Link
          href="/notifications"
          className="text-info text-[12px] font-extrabold"
        >
          모두 보기
        </Link>
      </div>
      {/* refac .card: 14px radius + 14px padding (수직은 row가 padding:10px 0이라 외곽 padding 줄여 4px 14px) */}
      <div className="bg-card border-border mt-2 rounded-[14px] border px-[14px]">
        {items.map((n, i) => {
          const meta = ICON_MAP[n.category] ?? {
            Icon: Bell,
            toneClass: "bg-muted text-muted-foreground",
          };
          const { Icon, toneClass } = meta;
          const isLast = i === items.length - 1;
          return (
            <div
              key={n.id}
              className={`flex items-start gap-[10px] py-[10px] ${
                isLast ? "" : "border-border border-b border-dashed"
              }`}
            >
              {/* refac .notif-ico: 34x34 round, svg 16px */}
              <span
                className={`grid h-[34px] w-[34px] shrink-0 place-items-center rounded-full ${toneClass}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                {/* refac .notif-title: 13px font-800 */}
                <p className="text-[13px] font-extrabold">{n.title}</p>
                {/* refac .notif-desc: 11px font-600 mt-2px line-height-1.4 */}
                <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold leading-[1.4]">
                  {n.body}
                </p>
              </div>
              {/* refac .notif-time: 10px font-800 muted */}
              <span className="text-muted-foreground shrink-0 text-[10px] font-extrabold tabular-nums">
                {fmtAgoKst(n.createdAtISO)}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
