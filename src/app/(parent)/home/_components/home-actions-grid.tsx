import Link from "next/link";
import { Calendar, ChevronRight, MapPin, X } from "lucide-react";

// W20-D1: 결석 신청·정류장 변경 + 진행 현황(대기 카운트)을 학부모 홈에서 즉시 확인.
// 기존: 신청 새 버튼 2개만. 학부모가 "내 신청 어떻게 됐지?" 알려면 별도 진입.
// 변경: 신청(new) + 진행 현황(list) 2x2 그리드. 대기 건수 노란 배지로 강조.
export function HomeActionsGrid({
  pendingAbsenceCount,
  pendingStopChangeCount,
}: {
  pendingAbsenceCount: number;
  pendingStopChangeCount: number;
}) {
  return (
    <section className="space-y-2 px-4 pt-1">
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/my-absences/new"
          className="bg-card hover:border-primary flex h-12 items-center justify-center gap-1.5 rounded-md border text-sm font-bold shadow-sm transition-colors"
        >
          <X className="h-3.5 w-3.5" />
          결석 신청
        </Link>
        <Link
          href="/my-stop-changes/new"
          className="bg-card hover:border-primary flex h-12 items-center justify-center gap-1.5 rounded-md border text-sm font-bold shadow-sm transition-colors"
        >
          <MapPin className="h-3.5 w-3.5" />
          정류장 변경
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/my-absences"
          className="bg-card hover:bg-muted/40 flex h-12 items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-sm transition-colors"
        >
          <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
            <Calendar className="h-3.5 w-3.5" />
            내 결석 신청
          </span>
          <span className="inline-flex items-center gap-1">
            {pendingAbsenceCount > 0 ? (
              <span className="bg-warning-soft text-warning rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                대기 {pendingAbsenceCount}
              </span>
            ) : null}
            <ChevronRight className="text-muted-foreground h-3.5 w-3.5" />
          </span>
        </Link>
        <Link
          href="/my-stop-changes"
          className="bg-card hover:bg-muted/40 flex h-12 items-center justify-between gap-2 rounded-md border px-3 text-sm shadow-sm transition-colors"
        >
          <span className="inline-flex items-center gap-1.5 font-medium whitespace-nowrap">
            <MapPin className="h-3.5 w-3.5" />
            내 정류장 변경
          </span>
          <span className="inline-flex items-center gap-1">
            {pendingStopChangeCount > 0 ? (
              <span className="bg-warning-soft text-warning rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
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
