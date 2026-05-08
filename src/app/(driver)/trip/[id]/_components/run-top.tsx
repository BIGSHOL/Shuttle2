"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, MessageCircle } from "lucide-react";

// W24-D Phase 2 driver: refac Driver Run.html "02 · 운행 중" .run-top.
// 픽셀 단위 align — refac CSS:
//
//   .run-top{padding:8px 18px 14px;display:flex;justify-content:space-between;
//            align-items:center;gap:10px;border-bottom:1px solid var(--line)}
//   .run-top-left{display:flex;flex-direction:column;gap:3px}
//   .run-top-left .route{font-size:11px;color:var(--mute);font-weight:800;
//                        letter-spacing:0.04em;text-transform:uppercase}
//   .run-top-left .title{font-size:16px;font-weight:900;letter-spacing:-0.015em}
//   .run-top-right{display:flex;gap:6px}
//   .icon-btn{width:38px;height:38px;border-radius:12px;background:var(--card);
//             border:1px solid var(--line);display:grid;place-items:center}
//   .icon-btn svg{width:16px;height:16px}
//   .icon-btn.danger{background:var(--danger-soft);
//                    border-color:rgba(255,97,85,0.4);color:var(--danger)}

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;
const VEHICLE_MODE_LABEL = { KIDS: "어린이용", GENERAL: "일반용" } as const;

export function RunTop({
  backHref,
  routeName,
  direction,
  vehicleMode,
  passedCount,
  totalStops,
  startedHHmm,
  elapsed,
  notificationsHref,
}: {
  backHref: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  vehicleMode: "KIDS" | "GENERAL";
  passedCount: number;
  totalStops: number;
  startedHHmm: string | null;
  elapsed: string; // "MM:SS"
  notificationsHref: string;
}) {
  return (
    <header className="border-border flex items-center justify-between gap-[10px] border-b px-[18px] pt-2 pb-[14px]">
      {/* run-top-left: back btn + route + title */}
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Link
          href={backHref}
          className="bg-card border-border text-foreground grid h-[38px] w-[38px] shrink-0 place-items-center rounded-[12px] border"
          aria-label="운행 목록으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex min-w-0 flex-col gap-[3px]">
          {/* refac .route: 11px font-800 tracking-0.04em caps mute */}
          <p className="text-muted-foreground truncate text-[11px] font-extrabold uppercase tracking-[0.04em]">
            {routeName} · {DIRECTION_LABEL[direction]} · {VEHICLE_MODE_LABEL[vehicleMode]}
            {totalStops > 0 ? ` · ${passedCount} / ${totalStops}` : ""}
          </p>
          {/* refac .title: 16px font-900 tracking-(-0.015em) */}
          <p className="truncate text-[16px] font-black tracking-[-0.015em]">
            {startedHHmm ? `${startedHHmm} 출발 · ${elapsed} 경과` : "운행 시작 전"}
          </p>
        </div>
      </div>
      {/* run-top-right: icon-btn × 2 */}
      <div className="flex shrink-0 gap-1.5">
        <Link
          href={notificationsHref}
          className="bg-card border-border text-foreground grid h-[38px] w-[38px] place-items-center rounded-[12px] border"
          aria-label="알림"
        >
          <MessageCircle className="h-4 w-4" strokeWidth={2.25} />
        </Link>
        <Link
          href="/run"
          className="bg-destructive-soft text-destructive border-destructive/40 grid h-[38px] w-[38px] place-items-center rounded-[12px] border"
          aria-label="긴급 — 학원에 알림"
        >
          <AlertTriangle className="h-4 w-4" strokeWidth={2.25} />
        </Link>
      </div>
    </header>
  );
}
