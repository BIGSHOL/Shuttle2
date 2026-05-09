import { Check } from "lucide-react";

// W24-D Phase 2 driver: refac Driver Run.html "03 · 도착 후 안전점검" .arrived-banner.
// 픽셀 단위 align — refac CSS:
//
//   .arrived-banner{margin:18px;padding:24px 20px;
//                   background:linear-gradient(135deg,var(--ok) 0%,#1aa370 100%);
//                   border-radius:20px;color:#fff;text-align:center;
//                   box-shadow:0 12px 32px rgba(31,138,91,0.3)}
//   .icn{width:54px;height:54px;border-radius:999px;background:rgba(255,255,255,0.25);
//        margin:0 auto 12px}
//   .icn svg{width:28px;height:28px;stroke-width:2.8}
//   h2{font-size:22px;font-weight:900;letter-spacing:-0.02em}
//   p{font-size:13px;font-weight:700;opacity:0.85}
//   .stats{margin-top:16px;display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
//   .stat{background:rgba(255,255,255,0.2);border-radius:10px;padding:8px 4px}
//   .stat .v{font-size:20px;font-weight:900;letter-spacing:-0.02em}
//   .stat .l{font-size:9px;font-weight:800;letter-spacing:0.04em;
//            text-transform:uppercase;opacity:0.8;margin-top:2px}

export function ArrivedBanner({
  alightedCount,
  elapsedMinutes,
  distanceKm,
  finalStopName,
  endedHHmm,
}: {
  alightedCount: number;
  elapsedMinutes: number;
  distanceKm: number;
  finalStopName: string;
  endedHHmm: string;
}) {
  return (
    <div
      className="m-[18px] rounded-[20px] px-[20px] py-[24px] text-center text-white"
      style={{
        background: "linear-gradient(135deg, oklch(0.66 0.16 152) 0%, #1aa370 100%)",
        boxShadow: "0 12px 32px rgba(31,138,91,0.3)",
      }}
    >
      {/* refac .icn: 54x54 round bg-white-25 mx-auto mb-12px */}
      <div className="mx-auto mb-3 grid h-[54px] w-[54px] place-items-center rounded-full bg-white/25">
        <Check className="h-[28px] w-[28px]" strokeWidth={2.8} />
      </div>
      {/* refac h2: 22px font-900 tracking-(-0.02em) */}
      <h2 className="text-[22px] font-black tracking-[-0.02em]">
        전원 하차 완료
      </h2>
      {/* refac p: 13px font-700 opacity-85 mt-4px */}
      <p className="mt-1 text-[13px] font-bold opacity-85">
        {finalStopName} · {endedHHmm} 도착
      </p>
      {/* refac stats: grid-cols-3 gap-8px mt-16px */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <Stat v={`${alightedCount}`} l="하차" />
        <Stat v={`${elapsedMinutes}분`} l="운행" />
        <Stat v={distanceKm.toFixed(1)} l="km" />
      </div>
    </div>
  );
}

function Stat({ v, l }: { v: string; l: string }) {
  return (
    <div className="rounded-[10px] bg-white/20 px-1 py-2">
      <p className="text-[20px] font-black tracking-[-0.02em] tabular-nums">
        {v}
      </p>
      <p className="mt-0.5 text-[9px] font-extrabold uppercase tracking-[0.04em] opacity-80">
        {l}
      </p>
    </div>
  );
}
