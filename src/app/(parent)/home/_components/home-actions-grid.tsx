import Link from "next/link";
import { Calendar, ChevronRight, MapPin, X } from "lucide-react";

export function HomeActionsGrid({
  pendingAbsenceCount,
  pendingStopChangeCount,
}: {
  pendingAbsenceCount: number;
  pendingStopChangeCount: number;
}) {
  return (
    <section className="space-y-2.5 px-4 pt-2">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
        빠른 신청
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/my-absences/new"
          className="bg-card hover:border-foreground/30 hover:bg-muted/30 flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold tracking-tight shadow-sm transition-all"
        >
          <div className="bg-warning-soft text-warning flex h-7 w-7 items-center justify-center rounded-lg">
            <X className="h-3.5 w-3.5" />
          </div>
          결석 신청
        </Link>
        <Link
          href="/my-stop-changes/new"
          className="bg-card hover:border-foreground/30 hover:bg-muted/30 flex h-14 items-center justify-center gap-2 rounded-xl border text-sm font-extrabold tracking-tight shadow-sm transition-all"
        >
          <div className="bg-info-soft text-info flex h-7 w-7 items-center justify-center rounded-lg">
            <MapPin className="h-3.5 w-3.5" />
          </div>
          정류장 변경
        </Link>
      </div>
      <p className="text-muted-foreground pt-1 text-[11px] font-extrabold tracking-[0.1em] uppercase">
        내 신청 현황
      </p>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/my-absences"
          className="bg-muted/30 hover:bg-muted/60 flex h-12 items-center justify-between gap-2 rounded-xl border border-transparent px-3.5 text-sm transition-all"
        >
          <span className="inline-flex items-center gap-2 font-semibold whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5" />
            내 결석 신청
          </span>
          <span className="inline-flex items-center gap-1">
            {pendingAbsenceCount > 0 ? (
              <span className="bg-warning text-warning-foreground rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                대기 {pendingAbsenceCount}
              </span>
            ) : null}
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          href="/my-stop-changes"
          className="bg-muted/30 hover:bg-muted/60 flex h-12 items-center justify-between gap-2 rounded-xl border border-transparent px-3.5 text-sm transition-all"
        >
          <span className="inline-flex items-center gap-2 font-semibold whitespace-nowrap">
            <MapPin className="h-3.5 w-3.5" />
            내 정류장 변경
          </span>
          <span className="inline-flex items-center gap-1">
            {pendingStopChangeCount > 0 ? (
              <span className="bg-warning text-warning-foreground rounded-full px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                대기 {pendingStopChangeCount}
              </span>
            ) : null}
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          </span>
        </Link>
      </div>
    </section>
  );
}
