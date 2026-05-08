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
//
// hi-fi 01 frame:
//   타이틀 "도현이 5분 후 도착" — 자녀명 + 자녀 stop 예정 시각 기준 상대 ETA
//   3-info row "예상 도착 / 현재 위치 / 탑승 학생"

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

// "08:00" 같은 KST HH:mm을 받아 현재 시각 기준 분 차이로 변환.
// hi-fi "도현이 5분 후 도착"의 "5분"을 SSR 시점에 derive.
function relativeMinutesUntil(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const target = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const nowKst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const nowMins = nowKst.getUTCHours() * 60 + nowKst.getUTCMinutes();
  return target - nowMins;
}

export function LiveTripCard({
  tripId,
  childName,
  direction,
  routeName,
  childStopName,
  childStopScheduledAt,
  driverName,
  boardedCount,
  totalAssigned,
  stopsAheadOfChild,
}: {
  tripId: string;
  childName: string;
  direction: "PICKUP" | "DROPOFF";
  routeName: string;
  childStopName: string;
  // refac hero row — 자녀 정류장 예정 시각·기사 이름. 없으면 row에서 — 표기.
  childStopScheduledAt: string | null;
  driverName: string | null;
  boardedCount: number;
  totalAssigned: number;
  stopsAheadOfChild: number | null;
}) {
  const directionLabel = DIRECTION_LABEL[direction];

  // hi-fi 타이틀: "{name}이 X분 후 도착" — childStopScheduledAt 기준 상대 ETA.
  // 0~30분 안이면 분 단위, 그 외(이미 통과·예정 멀리)는 fallback.
  const minsUntil = relativeMinutesUntil(childStopScheduledAt);
  let heroTitle: string;
  if (stopsAheadOfChild === 0) {
    heroTitle = `${childName}이 곧 도착`;
  } else if (minsUntil !== null && minsUntil > 0 && minsUntil <= 30) {
    heroTitle = `${childName}이 ${minsUntil}분 후 도착`;
  } else if (minsUntil !== null && minsUntil < 0 && minsUntil > -30) {
    heroTitle = `${childName} 운행 중`;
  } else {
    heroTitle = `${childName} 운행 중`;
  }

  // 현재 위치 표기 — N=0 이면 "곧 도착", 미산정이면 "—".
  let positionLabel: string;
  if (stopsAheadOfChild === null) {
    positionLabel = "—";
  } else if (stopsAheadOfChild === 0) {
    positionLabel = "곧 도착";
  } else {
    positionLabel = `${stopsAheadOfChild}정류장 전`;
  }

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

      {/* hero 타이틀 — 자녀 stop 예정 시각 기준 상대 ETA */}
      <h2 className="relative mt-2 text-2xl font-black tracking-tight leading-tight">
        {heroTitle}
      </h2>
      <p className="relative mt-1 text-[13px] font-bold opacity-85">
        {routeName} · {childStopName}
        {driverName ? ` · ${driverName} 기사님` : ""}
      </p>

      {/* 3-info row — 예상 도착 / 현재 위치 / 탑승 학생 */}
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
            현재 위치
          </p>
          <p className="mt-0.5 text-lg font-black tracking-tight">
            {positionLabel}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-black tracking-[0.04em] uppercase opacity-70">
            탑승 학생
          </p>
          <p className="mt-0.5 text-lg font-black tracking-tight tabular-nums">
            {boardedCount} / {totalAssigned}
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
