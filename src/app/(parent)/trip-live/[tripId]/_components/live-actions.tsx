import Link from "next/link";
import { Phone, UserX } from "lucide-react";

// W24-D Phase 1 trip-live: refac Parent App.html "02 · /trip-live" .live-actions.
// 픽셀 단위 align — refac CSS:
//
//   .live-actions{display:grid;grid-template-columns:1fr 1fr;gap:8px}
//   .live-actions button{height:44px;border-radius:10px;border:1px solid var(--border);
//                        background:var(--card);font-size:13px;font-weight:800;
//                        display:flex;align-items:center;justify-content:center;gap:6px}
//   .live-actions svg{width:16px;height:16px}

export function LiveActions({ driverPhone }: { driverPhone: string | null }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      {driverPhone ? (
        <a
          href={`tel:${driverPhone}`}
          className="bg-card border-border flex h-11 items-center justify-center gap-1.5 rounded-[10px] border text-[13px] font-extrabold"
        >
          <Phone className="h-4 w-4" strokeWidth={2.25} />
          기사님
        </a>
      ) : (
        <span
          className="bg-muted/50 border-border text-muted-foreground flex h-11 items-center justify-center gap-1.5 rounded-[10px] border text-[13px] font-extrabold"
          aria-disabled
        >
          <Phone className="h-4 w-4" strokeWidth={2.25} />
          기사님
        </span>
      )}
      <Link
        href="/my-absences/new"
        className="bg-card border-border flex h-11 items-center justify-center gap-1.5 rounded-[10px] border text-[13px] font-extrabold"
      >
        <UserX className="h-4 w-4" strokeWidth={2.25} />
        결석
      </Link>
    </div>
  );
}
