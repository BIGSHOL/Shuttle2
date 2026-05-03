import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";

import { ChildAvatar } from "@/components/child-avatar";
import { LivePulseDot } from "@/components/live-pulse-dot";

// 운행 중 자녀를 위한 premium dark gradient 카드.
// docs/02 + lofi parent.jsx 참고:
// - 배경: linear-gradient (toned dark)
// - 상단 노란 accent stripe (1px)
// - Avatar 노란 + 자녀 이름·노선 sub
// - 노란 LIVE 뱃지 (pulse)
// - 큰 detail ("등원 중 · ○○ 정류장 통과") — 실시간 ETA는 trip-live에서
// - chevron right hint
// 카드 전체가 Link → /trip-live/[tripId]

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export function LiveTripCard({
  tripId,
  childName,
  orgName,
  direction,
  routeName,
  childStopName,
}: {
  tripId: string;
  childName: string;
  orgName: string;
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  childStopName: string;
}) {
  return (
    <Link
      href={`/trip-live/${tripId}`}
      className="relative block overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-950 p-4 text-white shadow-lg transition-transform hover:scale-[1.01] active:scale-[0.99]"
    >
      {/* 노란 accent stripe */}
      <div className="from-bus pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r to-transparent" />

      <div className="mb-3 flex items-center gap-2.5">
        <ChildAvatar name={childName} tone="live" size="default" />
        <div className="flex-1">
          <p className="text-sm font-extrabold tracking-tight">{childName}</p>
          <p className="text-[11px] font-medium text-white/60">
            {orgName} · {DIRECTION_LABEL[direction]} 중
          </p>
        </div>
        <span className="border-bus/40 bg-bus/20 text-bus inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold">
          <LivePulseDot />
          LIVE
        </span>
      </div>

      <div className="bg-bus-soft/10 border-bus/15 rounded-xl border px-3.5 py-3">
        <div className="flex items-center gap-2.5">
          <div className="bg-bus/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <MapPin className="text-bus h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-white/55">
              {routeName}
            </p>
            <p className="mt-0.5 text-sm font-bold tracking-tight">
              자녀 정류장 · {childStopName}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </div>
      </div>

      <p className="mt-3 text-center text-[11px] font-semibold text-white/70">
        탭하면 실시간 위치를 볼 수 있어요
      </p>
    </Link>
  );
}
