import Link from "next/link";
import { MapPin, X } from "lucide-react";

// 결석 신청 / 정류장 변경 (정류장 변경은 W10 schema 보강 후, 지금은 disabled)
export function HomeActionsGrid() {
  return (
    <section className="grid grid-cols-2 gap-2.5 px-4 pt-1">
      <Link
        href="/my-absences/new"
        className="bg-card hover:border-primary flex h-12 items-center justify-center gap-1.5 rounded-xl border text-sm font-bold shadow-sm transition-colors"
      >
        <X className="h-3.5 w-3.5" />
        결석 신청
      </Link>
      <button
        type="button"
        disabled
        title="다음 업데이트에서 추가됩니다"
        className="bg-card text-muted-foreground flex h-12 cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border text-sm font-bold opacity-60 shadow-sm"
      >
        <MapPin className="h-3.5 w-3.5" />
        정류장 변경
      </button>
    </section>
  );
}
