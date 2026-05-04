import { db } from "@/lib/db";

// 노선·정류장별 평균 도착 시간 학습 — Trip.startedAt 기준 정류장 통과 시점.
//
// 데이터 소스: BoardingEvent.at (BOARD/ALIGHT/NO_SHOW/NO_DROPOFF)
// - 학생이 그 stop에서 BOARD/ALIGHT 처리된 시점 ≈ 셔틀이 그 stop에 도착한 시점
// - NO_SHOW도 그 stop에서 보고되므로 통과 시점 추정에 활용 가능
//
// 계산:
// - 각 trip별, RouteStop별 → 그 stop에 배정된 학생의 첫 BoardingEvent.at
// - 그 시각 - trip.startedAt = 통과까지 걸린 분
// - 여러 trip 평균 → 그 노선의 stop별 표준 도달 시각
//
// 베타 시점에는 데이터 부족 (sample < 5)이면 fallback 안내. 누적되면 실 평균.

export type RouteStopArrivalStats = {
  stopId: string;
  order: number;
  avgMinutesFromStart: number;
  sampleCount: number;
};

const MIN_SAMPLE_COUNT = 3; // 3건 이상 trip에서 관측되어야 의미있는 평균

export async function getRouteStopArrivalStats(
  routeId: string,
  days = 30,
): Promise<RouteStopArrivalStats[]> {
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  // 노선의 RouteStop 목록
  const routeStops = await db.routeStop.findMany({
    where: { routeId },
    orderBy: { order: "asc" },
    select: { stopId: true, order: true },
  });
  if (routeStops.length === 0) return [];

  // 노선의 RouteStudent — 학생 → 그 노선에서 사용하는 stopId
  const routeStudents = await db.routeStudent.findMany({
    where: { routeId },
    select: { studentId: true, stopId: true },
  });
  const studentToStop = new Map(
    routeStudents.map((rs) => [rs.studentId, rs.stopId] as const),
  );

  // 최근 days일 시작된 trip + boarding event
  const trips = await db.trip.findMany({
    where: {
      routeId,
      startedAt: { gte: since, not: null },
    },
    select: {
      id: true,
      startedAt: true,
      events: {
        where: {
          type: { in: ["BOARD", "ALIGHT", "NO_SHOW", "NO_DROPOFF"] },
        },
        select: { studentId: true, at: true },
      },
    },
  });

  // trip별 stopId → 첫 통과 시각
  // (한 정류장에 여러 학생이 있으면 가장 빠른 시각 사용)
  const stopArrivalSamples = new Map<string, number[]>();
  for (const rs of routeStops) {
    stopArrivalSamples.set(rs.stopId, []);
  }

  for (const trip of trips) {
    if (!trip.startedAt) continue;
    const startMs = trip.startedAt.getTime();

    // 이 trip의 stop별 첫 통과 시각
    const stopFirstAt = new Map<string, number>();
    for (const e of trip.events) {
      const stopId = studentToStop.get(e.studentId);
      if (!stopId) continue;
      const atMs = e.at.getTime();
      const cur = stopFirstAt.get(stopId);
      if (cur === undefined || atMs < cur) {
        stopFirstAt.set(stopId, atMs);
      }
    }

    for (const [stopId, atMs] of stopFirstAt) {
      const arr = stopArrivalSamples.get(stopId);
      if (!arr) continue;
      const minutes = (atMs - startMs) / 60_000;
      // 음수·24시간 초과 같은 비정상 sample은 제외
      if (minutes < 0 || minutes > 24 * 60) continue;
      arr.push(minutes);
    }
  }

  return routeStops.map((rs) => {
    const samples = stopArrivalSamples.get(rs.stopId) ?? [];
    const avg =
      samples.length >= MIN_SAMPLE_COUNT
        ? samples.reduce((a, b) => a + b, 0) / samples.length
        : 0;
    return {
      stopId: rs.stopId,
      order: rs.order,
      avgMinutesFromStart: avg,
      sampleCount: samples.length,
    };
  });
}

// 학부모 trip-live에서 사용 — 자녀 stop의 ETA 추정.
// (1) 데이터 충분(>= MIN_SAMPLE_COUNT) → 실 평균 기반 도착 시각
// (2) 부족 → RouteStop.scheduledAt 기반 fallback (운행이 정시 진행되었다고 가정)
export type ChildStopEta = {
  /** 평균 기반 ETA가 있다면 도착 예상 시각 (ms epoch). null이면 데이터 부족 + fallback 사용. */
  predictedAtMs: number | null;
  /** 데이터 sample 수 — UI에서 신뢰도 표시용 */
  sampleCount: number;
  /** RouteStop의 정시(scheduledAt) HH:mm — fallback 안내용 */
  scheduledAt: string | null;
  /** 셔틀이 이미 자녀 stop을 통과했는지 (BoardingEvent.at < 현재) */
  passed: boolean;
};

export async function getChildStopEta({
  tripId,
  routeId,
  childStopId,
  startedAtMs,
  days = 30,
}: {
  tripId: string;
  routeId: string;
  childStopId: string;
  startedAtMs: number;
  days?: number;
}): Promise<ChildStopEta> {
  const [stats, currentTripPassed, routeStop] = await Promise.all([
    getRouteStopArrivalStats(routeId, days),
    // 현재 trip에서 자녀 stop이 이미 처리되었는지
    db.boardingEvent.findFirst({
      where: {
        tripId,
        student: { routes: { some: { routeId, stopId: childStopId } } },
      },
      select: { at: true },
    }),
    db.routeStop.findFirst({
      where: { routeId, stopId: childStopId },
      select: { scheduledAt: true },
    }),
  ]);

  const stat = stats.find((s) => s.stopId === childStopId);
  const sampleCount = stat?.sampleCount ?? 0;
  const useAvg = sampleCount >= MIN_SAMPLE_COUNT;

  return {
    predictedAtMs: useAvg
      ? startedAtMs + Math.round(stat!.avgMinutesFromStart * 60_000)
      : null,
    sampleCount,
    scheduledAt: routeStop?.scheduledAt ?? null,
    passed: currentTripPassed !== null,
  };
}
