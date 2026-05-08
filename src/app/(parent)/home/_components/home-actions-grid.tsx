import Link from "next/link";
import { MapPinOff, UserX } from "lucide-react";

// W24-D Phase 1 home: refac Parent App.html "빠른 처리" 섹션 quick-btn idiom.
// `<div class="quick">` 2-card grid (1fr 1fr · gap 10px)
// 각 card: padding 14px, rounded-md (refac은 12px raw), 32x32 ico(soft tone) + name + desc

export function HomeActionsGrid({
  pendingAbsenceCount,
  pendingStopChangeCount,
}: {
  // 베타 운영자가 PENDING 카운트 노출하면 학부모가 한눈에 파악 — refac
  // hi-fi에는 카운트 표시 없지만 우리는 baseline UX로 보존(작은 숫자 chip).
  pendingAbsenceCount: number;
  pendingStopChangeCount: number;
}) {
  return (
    <section className="px-4">
      <h2 className="mb-2 text-[13px] font-black tracking-tight">빠른 처리</h2>
      <div className="grid grid-cols-2 gap-2.5">
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
      className="bg-card hover:bg-muted/40 active:bg-muted/40 relative flex flex-col gap-1.5 rounded-lg border p-3.5 shadow-sm transition-colors"
    >
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-md ${iconClass}`}
      >
        <Icon className="h-4 w-4" strokeWidth={2.5} />
      </div>
      <div className="text-[13px] font-black tracking-tight">{title}</div>
      <p className="text-muted-foreground text-[11px] font-bold leading-tight">
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
