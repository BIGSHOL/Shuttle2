"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { LivePulseDot } from "@/components/live-pulse-dot";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

// trip-live 상단 좁은 헤더. 뒤로가기 + 자녀 이름·노선 sub + LIVE 뱃지.
// docs/02 + lofi.parent.jsx ParentLive 헤더 미러.
export function TripHeader({
  childName,
  direction,
  routeName,
  driverName,
  isLive,
}: {
  childName: string;
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  driverName: string;
  isLive: boolean;
}) {
  return (
    <header className="bg-background/95 backdrop-blur-md relative z-10 flex items-center gap-3 border-b px-3 py-3.5 shadow-sm">
      <Link
        href="/home"
        className="bg-muted/60 hover:bg-muted flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors"
        aria-label="홈으로"
      >
        <ArrowLeft className="h-4 w-4" />
      </Link>
      <div className="flex-1 min-w-0">
        <p className="truncate text-[15px] font-extrabold tracking-tight">
          {childName} · {DIRECTION_LABEL[direction]}
        </p>
        <p className="text-muted-foreground truncate text-[11px] font-medium">
          {routeName} · {driverName} 기사
        </p>
      </div>
      {isLive ? (
        <span className="bg-bus text-bus-foreground inline-flex items-center gap-1.5 rounded-full border-2 border-bus-foreground/15 px-2.5 py-1 text-[11px] font-extrabold tracking-tight shadow-[var(--shadow-live)]">
          <LivePulseDot className="[&_span]:bg-bus-foreground" />
          운행 중
        </span>
      ) : (
        <span className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-[11px] font-bold border border-border/60">
          신호 대기
        </span>
      )}
    </header>
  );
}
