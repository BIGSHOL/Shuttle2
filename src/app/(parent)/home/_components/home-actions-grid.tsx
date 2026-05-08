import Link from "next/link";
import { MapPinOff, UserX } from "lucide-react";

// W24-D Phase 1 home: refac Parent App.html "빠른 처리" quick-btn.
// 픽셀 단위 align — refac CSS:
//
//   .quick{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px}
//   .quick-btn{padding:14px;background:var(--card);border:1px solid var(--border);
//              border-radius:12px;display:flex;flex-direction:column;gap:6px}
//   .quick-btn .ico{width:32px;height:32px;border-radius:8px;
//                   background:var(--bus-soft);display:grid;place-items:center}
//   .quick-btn .ico svg{width:16px;height:16px}
//   .quick-btn .ico.warn{background:var(--warning-soft);color:var(--warning)}
//   .quick-btn .ico.info{background:var(--info-soft);color:var(--info)}
//   .quick-btn .name{font-size:13px;font-weight:900}
//   .quick-btn .desc{font-size:11px;color:var(--muted-foreground);
//                    font-weight:700;line-height:1.4}

export function HomeActionsGrid({
  pendingAbsenceCount,
  pendingStopChangeCount,
}: {
  pendingAbsenceCount: number;
  pendingStopChangeCount: number;
}) {
  return (
    <section className="px-4">
      <div className="mt-[18px] flex items-center justify-between">
        <h3 className="text-[13px] font-black tracking-[-0.01em]">빠른 처리</h3>
      </div>
      <div className="mt-[10px] grid grid-cols-2 gap-[10px]">
        <ActionCard
          href="/my-absences/new"
          icon={UserX}
          iconClass="bg-warning-soft text-warning"
          title="결석 신청"
          description="오늘 또는 이후 날짜 결석 등록"
          badge={pendingAbsenceCount}
        />
        <ActionCard
          href="/my-stop-changes/new"
          icon={MapPinOff}
          iconClass="bg-info-soft text-info"
          title="정류장 변경"
          description="평소와 다른 정류장 신청"
          badge={pendingStopChangeCount}
        />
      </div>
    </section>
  );
}

function ActionCard({
  href,
  icon: Icon,
  iconClass,
  title,
  description,
  badge,
}: {
  href: string;
  icon: typeof UserX;
  iconClass: string;
  title: string;
  description: string;
  badge: number;
}) {
  return (
    <Link
      href={href}
      className="bg-card border-border relative flex flex-col gap-1.5 rounded-[12px] border p-[14px]"
    >
      <div
        className={`grid h-8 w-8 place-items-center rounded-lg ${iconClass}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.25} />
      </div>
      <div className="text-[13px] font-black">{title}</div>
      <p className="text-muted-foreground text-[11px] font-bold leading-[1.4]">
        {description}
      </p>
      {badge > 0 ? (
        <span className="bg-warning text-warning-foreground absolute top-2.5 right-2.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-black tabular-nums">
          {badge}
        </span>
      ) : null}
    </Link>
  );
}
