import Link from "next/link";
import { MapPin } from "lucide-react";

// W24-D Phase 1 home: data/refac/screenshots/parent-app.jpg "01 · /home" hero 카드.
// 픽셀 단위 align — refac CSS와 1:1 매핑:
//
//   .hero{background:var(--bus);color:var(--bus-foreground);border-radius:18px;
//         padding:18px;margin-top:12px;position:relative;overflow:hidden}
//   .hero::after{position:absolute;right:-30px;top:-30px;width:140px;height:140px;
//                border-radius:999px;background:rgba(0,0,0,0.05)}
//   .hero-status{font-size:11px;font-weight:900;letter-spacing:0.06em;
//                text-transform:uppercase;display:inline-flex;gap:6px}
//   .hero h2{margin:8px 0 4px;font-size:24px;font-weight:900;
//            letter-spacing:-0.025em;line-height:1.15}
//   .hero .sub{font-size:13px;font-weight:700;opacity:0.85}
//   .hero .row{display:flex;gap:14px;margin-top:14px}
//   .hero .row .lbl{font-size:10px;font-weight:900;letter-spacing:0.04em;
//                   text-transform:uppercase;opacity:0.7}
//   .hero .row .val{font-size:18px;font-weight:900;letter-spacing:-0.02em;margin-top:2px}
//   .hero-cta{height:44px;background:rgba(0,0,0,0.85);color:var(--bus);
//             border-radius:10px;font-size:14px;font-weight:900;gap:6px}

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function relativeMinutesUntil(hhmm: string | null): number | null {
  if (!hhmm) return null;
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm);
  if (!m) return null;
  const target = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const now = new Date();
  const nowKst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
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
  childStopScheduledAt: string | null;
  driverName: string | null;
  boardedCount: number;
  totalAssigned: number;
  stopsAheadOfChild: number | null;
}) {
  const directionLabel = DIRECTION_LABEL[direction];
  const minsUntil = relativeMinutesUntil(childStopScheduledAt);
  let heroTitle: string;
  if (stopsAheadOfChild === 0) {
    heroTitle = `${childName}이 곧 도착`;
  } else if (minsUntil !== null && minsUntil > 0 && minsUntil <= 30) {
    heroTitle = `${childName}이 ${minsUntil}분 후 도착`;
  } else {
    heroTitle = `${childName} 운행 중`;
  }

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
      className="bg-bus text-bus-foreground relative block overflow-hidden rounded-[18px] p-[18px] transition-transform active:scale-[0.99]"
    >
      {/* refac .hero::after — 우상단 검정 원 데코 (rgba 0,0,0, 0.05) */}
      <div className="pointer-events-none absolute -top-[30px] -right-[30px] h-[140px] w-[140px] rounded-full bg-black/5" />

      {/* .hero-status: 11px font-900 caps tracking 0.06em */}
      <div className="relative inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.06em]">
        <span className="relative inline-block h-1.5 w-1.5 rounded-full bg-current">
          <span className="absolute -inset-[3px] animate-ping rounded-full bg-current opacity-40" />
        </span>
        운행 중 · {directionLabel}
      </div>

      {/* .hero h2: 24px font-900 tracking -0.025em line-height 1.15, mt-8px mb-4px */}
      <h2 className="relative mt-2 mb-1 text-[24px] font-black leading-[1.15] tracking-[-0.025em]">
        {heroTitle}
      </h2>

      {/* .hero .sub: 13px font-700 opacity 0.85 */}
      <p className="relative text-[13px] font-bold opacity-85">
        {routeName} · {childStopName}
        {driverName ? ` · ${driverName} 기사님` : ""}
      </p>

      {/* .hero .row: flex gap 14px mt-14px (not grid) */}
      <div className="relative mt-[14px] flex gap-[14px]">
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.04em] opacity-70">
            예상 도착
          </p>
          <p className="mt-0.5 text-[18px] font-black tracking-[-0.02em] tabular-nums">
            {childStopScheduledAt ?? "—"}
          </p>
        </div>
        <div className="flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.04em] opacity-70">
            현재 위치
          </p>
          <p className="mt-0.5 text-[18px] font-black tracking-[-0.02em]">
            {positionLabel}
          </p>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.04em] opacity-70">
            탑승 학생
          </p>
          <p className="mt-0.5 text-[18px] font-black tracking-[-0.02em] tabular-nums">
            {boardedCount} / {totalAssigned}
          </p>
        </div>
      </div>

      {/* .hero-cta: 44px height, rounded-10px, bg-rgba(0,0,0,0.85), text-bus */}
      <div className="bg-black/85 text-bus relative mt-[14px] flex h-11 items-center justify-center gap-1.5 rounded-[10px] text-sm font-black">
        <MapPin className="h-4 w-4" />
        실시간 위치 보기
      </div>
    </Link>
  );
}
