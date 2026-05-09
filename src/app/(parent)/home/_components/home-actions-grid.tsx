import Link from "next/link";
import { MapPinOff, UserX } from "lucide-react";

// W25 P0-A: ground truth Parent App.html .quick 패턴 — 2-grid 빠른 처리.
// 결석 신청 (warning icon) + 정류장 변경 (info icon).
// 내 신청 현황은 AbsencesPreview에 별도 표시.
export function HomeActionsGrid() {
  return (
    <section className="space-y-2 px-4 pt-2">
      <h3 className="text-sm font-black tracking-tight">빠른 처리</h3>
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          href="/my-absences/new"
          className="bg-card hover:bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3.5 transition-colors"
        >
          <span className="bg-warning-soft text-warning flex h-8 w-8 items-center justify-center rounded-md">
            <UserX className="h-4 w-4" />
          </span>
          <p className="text-[13px] font-black tracking-tight">결석 신청</p>
          <p className="text-muted-foreground text-[11px] leading-snug font-bold">
            오늘 또는 이후 날짜 결석 등록
          </p>
        </Link>
        <Link
          href="/my-stop-changes/new"
          className="bg-card hover:bg-muted/40 flex flex-col gap-1.5 rounded-lg border p-3.5 transition-colors"
        >
          <span className="bg-info-soft text-info flex h-8 w-8 items-center justify-center rounded-md">
            <MapPinOff className="h-4 w-4" />
          </span>
          <p className="text-[13px] font-black tracking-tight">정류장 변경</p>
          <p className="text-muted-foreground text-[11px] leading-snug font-bold">
            평소와 다른 정류장 신청
          </p>
        </Link>
      </div>
    </section>
  );
}
