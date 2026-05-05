import { db } from "@/lib/db";

import { computeTripStats, type PingPoint } from "@/lib/geo/trip-stats";

// W19-E: 학원장 분석 페이지 (/dashboard/analytics)에 노출되는 운행 집계 utility.
// 노선별·기사별 평균 운행 시간·거리·속도, 운행 횟수, 미탑승 건수.
// LocationPing은 trip마다 수십~수백 개라 집계 query가 무거울 수 있음 — 한 번에
// fetch하고 in-memory aggregate. 30일 default range.

export type AnalyticsRange = "7d" | "30d" | "90d";

export type RouteAggregate = {
  routeId: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  tripCount: number;
  avgDurationSec: number;
  avgDistanceKm: number;
  avgSpeedKmh: number;
  noShowCount: number;
};

export type DriverAggregate = {
  driverId: string;
  driverName: string;
  tripCount: number;
  avgDurationSec: number;
  avgDistanceKm: number;
  avgSpeedKmh: number;
  noShowCount: number;
};

export function rangeToStartDate(range: AnalyticsRange): Date {
  const now = new Date();
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - days);
  start.setUTCHours(0, 0, 0, 0);
  return start;
}

type TripWithDeps = {
  id: string;
  startedAt: Date | null;
  endedAt: Date | null;
  route: { id: string; name: string; direction: "PICKUP" | "DROPOFF" };
  driver: { id: string; name: string };
  pings: PingPoint[];
  noShowCount: number;
};

async function fetchTrips(
  orgId: string,
  range: AnalyticsRange,
): Promise<TripWithDeps[]> {
  const start = rangeToStartDate(range);
  // startedAt 있는 trip만 (예약만 된 건 분석 대상 X).
  const trips = await db.trip.findMany({
    where: {
      vehicle: { orgId },
      startedAt: { not: null, gte: start },
    },
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      route: { select: { id: true, name: true, direction: true } },
      driver: { select: { id: true, name: true } },
      pings: {
        orderBy: { recordedAt: "asc" },
        select: {
          lat: true,
          lng: true,
          recordedAt: true,
          speed: true,
          source: true,
        },
      },
      events: {
        where: { type: { in: ["NO_SHOW", "NO_DROPOFF"] } },
        select: { id: true },
      },
    },
  });

  return trips.map((t) => ({
    id: t.id,
    startedAt: t.startedAt,
    endedAt: t.endedAt,
    route: t.route,
    driver: t.driver,
    pings: t.pings,
    noShowCount: t.events.length,
  }));
}

/** 노선별 집계. 미운행 노선은 결과에 포함 안 됨. */
export async function aggregateByRoute(
  orgId: string,
  range: AnalyticsRange,
): Promise<RouteAggregate[]> {
  const trips = await fetchTrips(orgId, range);
  const byRoute = new Map<string, TripWithDeps[]>();
  for (const t of trips) {
    const arr = byRoute.get(t.route.id) ?? [];
    arr.push(t);
    byRoute.set(t.route.id, arr);
  }

  const rows: RouteAggregate[] = [];
  for (const [routeId, list] of byRoute) {
    const stats = list.map((t) =>
      computeTripStats(t.pings, t.startedAt, t.endedAt),
    );
    const totalDuration = stats.reduce((s, x) => s + x.durationSec, 0);
    const totalDistance = stats.reduce((s, x) => s + x.distanceKm, 0);
    const totalNoShow = list.reduce((s, t) => s + t.noShowCount, 0);
    const n = list.length;
    rows.push({
      routeId,
      routeName: list[0].route.name,
      direction: list[0].route.direction,
      tripCount: n,
      avgDurationSec: Math.round(totalDuration / n),
      avgDistanceKm: +(totalDistance / n).toFixed(2),
      avgSpeedKmh:
        totalDuration > 0
          ? +(totalDistance / (totalDuration / 3600)).toFixed(1)
          : 0,
      noShowCount: totalNoShow,
    });
  }
  rows.sort((a, b) => b.tripCount - a.tripCount); // 운행 많은 순
  return rows;
}

/** 기사별 집계. */
export async function aggregateByDriver(
  orgId: string,
  range: AnalyticsRange,
): Promise<DriverAggregate[]> {
  const trips = await fetchTrips(orgId, range);
  const byDriver = new Map<string, TripWithDeps[]>();
  for (const t of trips) {
    const arr = byDriver.get(t.driver.id) ?? [];
    arr.push(t);
    byDriver.set(t.driver.id, arr);
  }

  const rows: DriverAggregate[] = [];
  for (const [driverId, list] of byDriver) {
    const stats = list.map((t) =>
      computeTripStats(t.pings, t.startedAt, t.endedAt),
    );
    const totalDuration = stats.reduce((s, x) => s + x.durationSec, 0);
    const totalDistance = stats.reduce((s, x) => s + x.distanceKm, 0);
    const totalNoShow = list.reduce((s, t) => s + t.noShowCount, 0);
    const n = list.length;
    rows.push({
      driverId,
      driverName: list[0].driver.name,
      tripCount: n,
      avgDurationSec: Math.round(totalDuration / n),
      avgDistanceKm: +(totalDistance / n).toFixed(2),
      avgSpeedKmh:
        totalDuration > 0
          ? +(totalDistance / (totalDuration / 3600)).toFixed(1)
          : 0,
      noShowCount: totalNoShow,
    });
  }
  rows.sort((a, b) => b.tripCount - a.tripCount);
  return rows;
}
