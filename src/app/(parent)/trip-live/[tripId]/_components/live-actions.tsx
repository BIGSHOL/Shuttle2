import Link from "next/link";
import { Phone, UserX } from "lucide-react";

// W24-D Phase 1 trip-live: data/refac/screenshots/parent-app.jpg "02 · /trip-live"
// .live-actions 2-button row reproduce. refac:
//   <button><i phone/>기사님</button> <button><i user-x/>결석</button>
//
// 기사님 button → tel: link (driverPhone null이면 disabled).
// 결석 button → /my-absences/new (오늘 자녀 결석 신청).
export function LiveActions({
  driverPhone,
}: {
  driverPhone: string | null;
}) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {driverPhone ? (
        <a
          href={`tel:${driverPhone}`}
          className="bg-card flex h-11 items-center justify-center gap-1.5 rounded-md border text-sm font-extrabold tracking-tight"
        >
          <Phone className="h-4 w-4" strokeWidth={2.25} />
          기사님
        </a>
      ) : (
        <span
          className="bg-muted/50 text-muted-foreground flex h-11 items-center justify-center gap-1.5 rounded-md border text-sm font-extrabold tracking-tight"
          aria-disabled
        >
          <Phone className="h-4 w-4" strokeWidth={2.25} />
          기사님
        </span>
      )}
      <Link
        href="/my-absences/new"
        className="bg-card flex h-11 items-center justify-center gap-1.5 rounded-md border text-sm font-extrabold tracking-tight"
      >
        <UserX className="h-4 w-4" strokeWidth={2.25} />
        결석
      </Link>
    </div>
  );
}
