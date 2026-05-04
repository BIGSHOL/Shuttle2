import Link from "next/link";
import { MapPin, X } from "lucide-react";

// 결석 신청 / 정류장 변경.
export function HomeActionsGrid() {
  return (
    <section className="grid grid-cols-2 gap-2.5 px-4 pt-1">
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
    </section>
  );
}
