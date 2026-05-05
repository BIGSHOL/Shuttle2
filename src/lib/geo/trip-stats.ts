import { haversineMeters } from "@/lib/geo/distance";

// Trip 단위 운행 통계 계산. 안전운행기록 PDF (분기 단위 distanceKm)와
// 학원장 trip 상세 카드·분석 페이지가 같은 utility를 공유하도록 분리.
//
// 입력은 LocationPing 부분 select — 호출자에서 필요한 필드만 select해서 전달.

export type PingPoint = {
  lat: number;
  lng: number;
  recordedAt: Date;
  speed: number | null; // m/s, GPS 기기 제공
  source: "INTERVAL" | "STOP_PASS" | "START" | "END";
};

export type TripStats = {
  // 운행 시간(초). 운행 중이면 now - startedAt, 종료된 trip은 endedAt - startedAt.
  // startedAt이 null이면 0.
  durationSec: number;
  distanceKm: number; // Haversine 누적
  // distanceKm / (durationSec/3600). durationSec=0이면 0.
  avgSpeedKmh: number;
  // LocationPing.speed 최댓값을 km/h로. ping 0개 또는 모두 null이면 null.
  maxSpeedKmh: number | null;
  pingCount: number;
};

export type StopArrivalInput = {
  stopId: string;
  stopName: string;
  stopOrder: number;
  // 해당 정류장 lat/lng — STOP_PASS 매칭은 source 기반이지만 fallback으로 가까운
  // ping 찾을 때 사용 가능 (현재는 안 씀, 추후 확장).
};

export type StopArrival = {
  stopId: string;
  stopName: string;
  stopOrder: number;
  arrivedAt: Date | null; // STOP_PASS source 첫 ping의 recordedAt
  segmentSec: number | null; // 직전 정류장 통과부터 현재 정류장 통과까지(초)
};

/** 운행 기간(초). startedAt이 null이면 0. endedAt null이면 now까지. */
export function computeDurationSec(
  startedAt: Date | null,
  endedAt: Date | null,
): number {
  if (!startedAt) return 0;
  const end = endedAt ?? new Date();
  return Math.max(0, Math.floor((end.getTime() - startedAt.getTime()) / 1000));
}

/** Haversine으로 ping 시계열 누적거리(m). */
export function computeDistanceMeters(
  pings: { lat: number; lng: number }[],
): number {
  let dist = 0;
  for (let i = 1; i < pings.length; i++) {
    dist += haversineMeters(
      pings[i - 1].lat,
      pings[i - 1].lng,
      pings[i].lat,
      pings[i].lng,
    );
  }
  return dist;
}

/** 단일 trip 통계. ping은 recordedAt 오름차순 정렬 필요. */
export function computeTripStats(
  pings: PingPoint[],
  startedAt: Date | null,
  endedAt: Date | null,
): TripStats {
  const durationSec = computeDurationSec(startedAt, endedAt);
  const distMeters = computeDistanceMeters(pings);
  const distanceKm = +(distMeters / 1000).toFixed(2);

  const avgSpeedKmh =
    durationSec > 0 ? +(distanceKm / (durationSec / 3600)).toFixed(1) : 0;

  const speeds = pings
    .map((p) => p.speed)
    .filter((s): s is number => typeof s === "number" && s > 0);
  const maxSpeedKmh =
    speeds.length > 0 ? +(Math.max(...speeds) * 3.6).toFixed(1) : null;

  return {
    durationSec,
    distanceKm,
    avgSpeedKmh,
    maxSpeedKmh,
    pingCount: pings.length,
  };
}

/**
 * 정류장별 도착 시각·구간 소요시간. STOP_PASS source 첫 ping을 도착 시각으로 사용.
 * 노선의 stops는 stopOrder 오름차순. 매칭은 lat/lng가 가장 가까운 STOP_PASS ping
 * 으로 해야 정확하지만, 현재는 stopOrder 순서대로 STOP_PASS ping을 1:1 매핑
 * (기사가 노선 따라 정상 진행한다는 가정).
 */
export function computeStopArrivals(
  pings: PingPoint[],
  stops: StopArrivalInput[],
): StopArrival[] {
  const stopPasses = pings
    .filter((p) => p.source === "STOP_PASS")
    .slice(0, stops.length); // 정류장 수만큼만

  return stops.map((stop, idx) => {
    const passPing = stopPasses[idx] ?? null;
    const arrivedAt = passPing?.recordedAt ?? null;

    let segmentSec: number | null = null;
    if (idx > 0 && arrivedAt) {
      const prevPass = stopPasses[idx - 1];
      if (prevPass) {
        segmentSec = Math.max(
          0,
          Math.floor(
            (arrivedAt.getTime() - prevPass.recordedAt.getTime()) / 1000,
          ),
        );
      }
    }

    return {
      stopId: stop.stopId,
      stopName: stop.stopName,
      stopOrder: stop.stopOrder,
      arrivedAt,
      segmentSec,
    };
  });
}

/** 초 → "HH:MM:SS" 또는 "MM:SS" (1시간 미만). */
export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const mm = m.toString().padStart(2, "0");
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
