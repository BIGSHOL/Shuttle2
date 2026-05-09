"use client";

import Link from "next/link";
import { ChevronLeft, Phone } from "lucide-react";

import { LivePulseDot } from "@/components/shuttlee/live-dot";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

// W24-D Phase 1 trip-live: data/refac/screenshots/parent-app.jpg "02 · /trip-live"
// app-bar 영역. refac:
//   <chevron-left> "실시간 위치" + sub("A노선 · 등원 · LIVE pill") + <phone>
// LIVE 뱃지가 헤더 우측에서 sub 라인 안의 pill로 이동, 우측엔 기사 통화 버튼.
export function TripHeader({
  direction,
  routeName,
  driverPhone,
  isLive,
}: {
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  driverPhone: string | null;
  isLive: boolean;
}) {
  return (
    <header className="bg-background relative z-10 flex items-center gap-2 border-b px-2 py-2.5">
      <Link
        href="/home"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-muted/60"
        aria-label="홈으로"
      >
        <ChevronLeft className="h-5 w-5" />
      </Link>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-black tracking-tight leading-tight">
          실시간 위치
        </h1>
        <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-[11px] font-bold">
          <span className="truncate">
            {routeName} · {DIRECTION_LABEL[direction]}
          </span>
          {isLive ? (
            <span className="bg-warning-soft text-warning inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-[0.05em] uppercase shrink-0">
              <LivePulseDot className="h-1 w-1 [&_span]:bg-warning" />
              Live
            </span>
          ) : (
            <span className="bg-muted text-muted-foreground inline-flex items-center rounded-full px-1.5 py-0.5 text-[9px] font-black tracking-[0.05em] uppercase shrink-0">
              대기
            </span>
          )}
        </p>
      </div>
      {driverPhone ? (
        <a
          href={`tel:${driverPhone}`}
          className="bg-card flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm"
          aria-label={`기사 통화 ${driverPhone}`}
        >
          <Phone className="h-4 w-4" strokeWidth={2.25} />
        </a>
      ) : (
        <div className="h-9 w-9 shrink-0" aria-hidden />
      )}
    </header>
  );
}
