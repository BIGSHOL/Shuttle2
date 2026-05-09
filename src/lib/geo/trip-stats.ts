import { haversineMeters } from "@shuttlee/shared-contracts";

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
  lat: number;
  lng: number;
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
 * 정류장별 도착 시각·구간 소요시간. STOP_PASS source ping을 lat/lng 기반으로
 * 가장 가까운 stop과 매칭 (각 stop은 가장 이른 매칭 ping의 시각만 사용).
 *
 * W23+ 수정: 이전엔 stopOrder 순 1:1 index 매칭이었으나, 출발지 STOP_PASS
 * 누락(첫 fix가 이미 출발지 떠난 후)되면 모든 stop이 한 칸씩 밀리는 버그 발생.
 * 이제 거리 기반 nearest-stop 매칭으로 안정화 — ping 위치가 가장 가까운
 * stop에 도착 시각 부여.
 */
export function computeStopArrivals(
  pings: PingPoint[],
  stops: StopArrivalInput[],
): StopArrival[] {
  const stopPasses = pings.filter((p) => p.source === "STOP_PASS");

  // ping을 시간순(이미 input 가정)으로 보면서 가장 가까운 stop에 매칭.
  // 한 stop은 여러 ping 중 가장 이른 것만 도착 시각으로 사용.
  const arrivedMap = new Map<string, Date>();
  for (const ping of stopPasses) {
    let bestStopId: string | null = null;
    let bestDist = Infinity;
    for (const stop of stops) {
      const d = haversineMeters(ping.lat, ping.lng, stop.lat, stop.lng);
      if (d < bestDist) {
        bestDist = d;
        bestStopId = stop.stopId;
      }
    }
    if (!bestStopId) continue;
    if (!arrivedMap.has(bestStopId)) {
      arrivedMap.set(bestStopId, ping.recordedAt);
    }
  }

  return stops.map((stop, idx) => {
    const arrivedAt = arrivedMap.get(stop.stopId) ?? null;

    let segmentSec: number | null = null;
    if (idx > 0 && arrivedAt) {
      // 직전 통과한 stop을 거꾸로 찾음 (직전 stop이 아직 통과 안 됐을 수도 있음)
      for (let i = idx - 1; i >= 0; i--) {
        const prevAt = arrivedMap.get(stops[i].stopId);
        if (prevAt) {
          segmentSec = Math.max(
            0,
            Math.floor(
              (arrivedAt.getTime() - prevAt.getTime()) / 1000,
            ),
          );
          break;
        }
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

/** Date → KST "HH:MM". 학원장·기사 양쪽 정류장 도착 시각 표기 공유. */
export function formatKstHHmm(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

/**
 * 정류장 구간 소요 (초) → 한국어 풀어쓰기 ("4분 55초", "52초", "1시간 7분").
 * 콜론 형식(`04:55`)이 도착 시각(`hh:mm`)과 헷갈려 사용자 혼동을 줘서
 * 명시 단위 표기로 통일.
 */
export function formatSegment(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return "—";
  if (sec < 60) return `${Math.round(sec)}초`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm > 0 ? `${h}시간 ${rm}분` : `${h}시간`;
  }
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}
