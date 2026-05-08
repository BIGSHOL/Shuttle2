import Link from "next/link";
import {
  Bell,
  Bus,
  Check,
  CalendarOff,
  AlertTriangle,
  MapPinOff,
} from "lucide-react";

// W24-D Phase 1 home: refac Parent App.html "최근 알림" 섹션.
// `<div class="card" style="padding:4px 14px">` + dashed border-bottom 구분 list.
// 각 row: 34x34 rounded-full ico(success/bus tone) + body(title+desc) + time
//
// 데이터: Notification 모델 최근 3건. fetch는 page에서 server-side로.

export type NotifRow = {
  id: string;
  category: string;
  title: string;
  body: string;
  url: string | null;
  createdAtISO: string;
};

const ICON_MAP: Record<
  string,
  { Icon: typeof Bell; toneClass: string }
> = {
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
  const diffMs = Date.now() - new Date(iso).getTime();
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
      <div className="mb-2 flex items-end justify-between gap-2">
        <h2 className="text-[13px] font-black tracking-tight">최근 알림</h2>
        <Link
          href="/notifications"
          className="text-info text-[12px] font-extrabold"
        >
          모두 보기
        </Link>
      </div>
      <div className="bg-card rounded-lg border px-3.5 shadow-sm">
        {items.map((n, i) => {
          const meta = ICON_MAP[n.category] ?? {
            Icon: Bell,
            toneClass: "bg-muted text-muted-foreground",
          };
          const { Icon, toneClass } = meta;
          return (
            <div
              key={n.id}
              className={`flex items-start gap-2.5 py-2.5 ${
                i < items.length - 1 ? "border-b border-dashed" : ""
              }`}
            >
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${toneClass}`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-extrabold tracking-tight">
                  {n.title}
                </p>
                <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold leading-snug">
                  {n.body}
                </p>
              </div>
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
