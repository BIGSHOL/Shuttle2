import Link from "next/link";
import { ChevronRight, MapPin } from "lucide-react";

import { ChildAvatar } from "@/components/shuttlee/child-avatar";
import { LivePulseDot } from "@/components/shuttlee/live-dot";

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
      {/* 노란 accent stripe — 좌측에서 우측으로 페이드 */}
      <div className="from-bus via-bus/60 pointer-events-none absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r to-transparent" />
      {/* 우상단 글로우 */}
      <div className="bg-bus/15 pointer-events-none absolute -top-12 -right-8 h-32 w-32 rounded-full blur-3xl" />

      <div className="relative mb-3 flex items-center gap-2.5">
        <ChildAvatar name={childName} tone="live" size="default" />
        <div className="flex-1">
          <p className="text-sm font-extrabold tracking-tight">{childName}</p>
          <p className="text-[11px] font-medium text-white/60">
            {orgName} · {DIRECTION_LABEL[direction]} 중
          </p>
        </div>
        <span className="border-bus/40 bg-bus/20 text-bus inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold">
          <LivePulseDot />
          운행 중
        </span>
      </div>

      <div className="relative rounded-xl border border-white/10 bg-white/5 px-3.5 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="bg-bus/20 flex h-8 w-8 shrink-0 items-center justify-center rounded-full">
            <MapPin className="text-bus h-4 w-4" />
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-medium text-white/55">{routeName}</p>
            <p className="mt-0.5 text-sm font-bold tracking-tight">
              자녀 정류장 · {childStopName}
            </p>
          </div>
          <ChevronRight className="h-5 w-5 text-white/40" />
        </div>
      </div>

      <p className="relative mt-3 flex items-center justify-center gap-1 text-[11px] font-semibold text-white/60">
        탭하면 실시간 위치를 볼 수 있어요
        <ChevronRight className="h-3 w-3" />
      </p>
    </Link>
  );
}
