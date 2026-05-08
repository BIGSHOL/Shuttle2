import Link from "next/link";
import { MapPin } from "lucide-react";

import { LivePulseDot } from "@/components/shuttlee/live-dot";

// W24-D Phase 1: data/refac/screenshots/parent-app.jpg "01 · /home" hero 카드.
// `bg-bus` 노란 풀 배경 + 검정 텍스트 + 우상단 검정 원 데코 + 3-info row +
// 풀폭 검정 CTA "실시간 위치 보기". 학부모가 home 진입 시 자녀 셔틀 운행 상태가
// 한눈에 들어오는 가장 눈에 띄는 영역.
//
// data/refac/docs/02-parent-screens.md §2.1: "운행중 — Badge 노란색 배경
// (bg-bus text-bus-foreground), pulse 애니메이션, 큰 CTA 실시간 위치 보기".

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export function LiveTripCard({
  tripId,
  childName,
  direction,
  routeName,
  childStopName,
  childStopScheduledAt,
  driverName,
}: {
  tripId: string;
  childName: string;
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  childStopName: string;
  // refac hero row — 자녀 정류장 예정 시각·기사 이름. 없으면 row에서 — 표기.
  childStopScheduledAt: string | null;
  driverName: string | null;
}) {
  const directionLabel = DIRECTION_LABEL[direction];

  return (
    <Link
      href={`/trip-live/${tripId}`}
      className="bg-bus text-bus-foreground relative block overflow-hidden rounded-lg p-4 shadow-md transition-transform active:scale-[0.99]"
    >
      {/* refac 우상단 검정 원 데코 */}
      <div className="bg-bus-foreground/5 pointer-events-none absolute -top-8 -right-8 h-36 w-36 rounded-full" />

      {/* 상태 라벨 */}
      <div className="relative inline-flex items-center gap-1.5 text-[11px] font-black tracking-[0.06em] uppercase">
        <LivePulseDot className="h-1.5 w-1.5" />
        운행 중 · {directionLabel}
      </div>

      {/* 메인 hero 텍스트 — refac은 ETA 포함("도현이 5분 후 도착")이지만 home의
          정적 fetch에서는 정확한 분 단위 ETA 미보유. "{자녀} 운행 중"으로 정직 표기. */}
      <h2 className="relative mt-2 text-2xl font-black tracking-tight leading-tight">
        {childName} 운행 중
      </h2>
      <p className="relative mt-1 text-[13px] font-bold opacity-85">
        {routeName} · {childStopName}
        {driverName ? ` · ${driverName} 기사님` : ""}
      </p>

      {/* 3-info row */}
      <div className="relative mt-3.5 grid grid-cols-3 gap-3">
        <div>
          <p className="text-[10px] font-black tracking-[0.04em] uppercase opacity-70">
            예상 도착
          </p>
          <p className="mt-0.5 text-lg font-black tracking-tight tabular-nums">
            {childStopScheduledAt ?? "—"}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.04em] uppercase opacity-70">
            방향
          </p>
          <p className="mt-0.5 text-lg font-black tracking-tight">
            {directionLabel}
          </p>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black tracking-[0.04em] uppercase opacity-70">
            정류장
          </p>
          <p className="mt-0.5 truncate text-lg font-black tracking-tight">
            {childStopName}
          </p>
        </div>
      </div>

      {/* 검정 CTA */}
      <div className="bg-bus-foreground/85 text-bus relative mt-3.5 flex h-11 items-center justify-center gap-1.5 rounded-md text-sm font-black">
        <MapPin className="h-4 w-4" />
        실시간 위치 보기
      </div>
    </Link>
  );
}
