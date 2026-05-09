import Link from "next/link";
import { MapPin } from "lucide-react";

import type { RunningTripDetails } from "@/lib/parent/today-trips";
import { cn } from "@/lib/utils";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

// W25 P0-A: ground truth Parent App.html §1번 frame의 노란 hero 카드.
// `bg-bus + text-bus-foreground` 풀폭 + 자녀 도착 ETA·현재 위치·탑승 학생
// 3-grid + 검정 풀폭 "📍 실시간 위치 보기" CTA. 운행 중인 자녀가 1명 이상이면
// 페이지 hero로 항상 노출.
export function LiveTripCard({
  tripId,
  childName,
  direction,
  routeName,
  childStopName,
  childStopScheduledAt,
  details,
}: {
  tripId: string;
  childName: string;
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  childStopName: string;
  childStopScheduledAt: string | null;
  details: RunningTripDetails;
}) {
  // 현재 위치 라벨: 자녀 정류장까지 N정류장 전 / 정류장 도착 / 통과 후.
  const childOrder = details.childStopOrder ?? 0;
  const currentOrder = details.currentStopOrder ?? 0;
  const remaining = childOrder - currentOrder;
  const positionLabel =
    childOrder === 0
      ? "운행 중"
      : currentOrder === 0
        ? "출발 준비"
        : remaining > 0
          ? `${remaining}정류장 전`
          : remaining === 0
            ? "정류장 도착"
            : "정류장 통과";

  return (
    <section
      className={cn(
        "bg-bus text-bus-foreground relative mx-4 overflow-hidden rounded-2xl p-5",
        "shadow-[var(--shadow-live)]",
      )}
    >
      {/* 우상단 검정 5% 원 — decorative */}
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full bg-black/5"
      />

      {/* 상태 라벨 */}
      <div className="relative inline-flex items-center gap-1.5 text-[11px] font-black tracking-wide uppercase">
        <span className="relative inline-flex h-2 w-2">
          <span className="bg-bus-foreground absolute inline-flex h-full w-full animate-ping rounded-full opacity-50" />
          <span className="bg-bus-foreground relative inline-flex h-2 w-2 rounded-full" />
        </span>
        <span>운행 중 · {DIRECTION_LABEL[direction]}</span>
      </div>

      {/* 메인 헤드라인 */}
      <h2 className="relative mt-2 text-2xl leading-tight font-black tracking-tighter">
        {childName}
        {childStopScheduledAt ? (
          <>
            {" "}
            <span className="font-black">{childStopScheduledAt}</span>
          </>
        ) : null}{" "}
        도착 예정
      </h2>
      <p className="relative mt-1 text-[13px] font-bold opacity-85">
        {routeName} · {childStopName}
        {details.driverName ? ` · ${details.driverName} 기사님` : ""}
      </p>

      {/* 3-grid 통계 */}
      <div className="relative mt-4 flex gap-3.5">
        <Stat
          label="예상 도착"
          value={childStopScheduledAt ?? "—"}
        />
        <Stat label="현재 위치" value={positionLabel} />
        <Stat
          label="탑승 학생"
          value={`${details.boardedCount} / ${details.totalStudents}`}
        />
      </div>

      {/* 풀폭 검정 CTA */}
      <Link
        href={`/trip-live/${tripId}`}
        className={cn(
          "relative mt-4 flex h-11 w-full items-center justify-center gap-1.5",
          "rounded-md bg-black/85 text-base font-black",
          "text-bus active:bg-black/95 transition-colors",
        )}
      >
        <MapPin className="h-4 w-4" />
        실시간 위치 보기
      </Link>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="text-[10px] leading-tight font-black tracking-wide uppercase opacity-70">
        {label}
      </div>
      <div className="mt-0.5 truncate text-lg leading-tight font-black tracking-tight tabular-nums">
        {value}
      </div>
    </div>
  );
}
