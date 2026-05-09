import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireGuardianTripAccess } from "@/lib/auth/guardian-trip-access";

import { ChildEtaSection } from "./_components/child-eta-section";
import { TripLiveShell } from "./_components/trip-live-shell";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

// C안 Suspense 스트리밍: trip + pings는 즉시 fetch (지도·헤더에 필요).
// getChildStopEta는 RouteStop별 평균 통과 분 계산이라 무거움 → Suspense로 분리.
// 사용자는 지도·정류장 진행도 먼저 보고, ETA 카드는 stream되어 뒤따라 표시.
export default async function TripLivePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const access = await requireGuardianTripAccess(tripId);

  const [trip, boardedCount, totalAssigned] = await Promise.all([
    db.trip.findUnique({
      where: { id: tripId },
      include: {
        route: {
          include: {
            stops: {
              orderBy: { order: "asc" },
              include: {
                stop: {
                  select: {
                    id: true,
                    name: true,
                    lat: true,
                    lng: true,
                  },
                },
              },
            },
          },
        },
        vehicle: { select: { plate: true, mode: true } },
        driver: { select: { name: true, phone: true } },
        helper: { select: { name: true } },
        pings: {
          orderBy: { recordedAt: "asc" },
          select: {
            id: true,
            lat: true,
            lng: true,
            recordedAt: true,
            source: true,
          },
        },
      },
    }),
    db.boardingEvent.count({
      where: { tripId, type: "BOARD" },
    }),
    // Trip은 routeId join까지 비싸므로 별도 lookup으로
    (async () => {
      const tr = await db.trip.findUnique({
        where: { id: tripId },
        select: { routeId: true },
      });
      if (!tr) return 0;
      return db.routeStudent.count({ where: { routeId: tr.routeId } });
    })(),
  ]);

  if (!trip) notFound();

  // STOP_PASS ping의 좌표를 RouteStop과 매칭 (가장 가까운 stop = 통과)
  const stopPassPings = trip.pings.filter((p) => p.source === "STOP_PASS");
  const passedStopIds = new Set<string>();
  for (const ping of stopPassPings) {
    let bestStopId: string | null = null;
    let bestDistSq = Infinity;
    for (const rs of trip.route.stops) {
      const dLat = ping.lat - rs.stop.lat;
      const dLng = ping.lng - rs.stop.lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestStopId = rs.id;
      }
    }
    if (bestStopId) passedStopIds.add(bestStopId);
  }

  // 종료된 trip — parent layout 안에서 일반 카드 (풀스크린 X)
  if (trip.endedAt) {
    return (
      <main className="mx-auto max-w-md space-y-4 p-4 pt-6">
        <Card className="bg-muted/40 border-2 shadow-sm rounded-2xl">
          <CardHeader className="pb-3">
            <div className="bg-muted text-muted-foreground inline-flex w-fit items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-extrabold tracking-tight uppercase">
              종료됨
            </div>
            <CardTitle className="text-2xl font-black tracking-tight">
              운행 종료
            </CardTitle>
            <CardDescription>
              <span className="font-bold">{trip.route.name}</span>{" "}
              {DIRECTION_LABEL[trip.route.direction]} 운행은 종료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-2 text-sm">
            <p>
              시작:{" "}
              <span className="font-mono">
                {trip.startedAt
                  ? trip.startedAt.toISOString().slice(11, 16)
                  : "—"}
              </span>{" "}
              · 종료:{" "}
              <span className="font-mono">
                {trip.endedAt.toISOString().slice(11, 16)}
              </span>{" "}
              (UTC)
            </p>
            <p>
              자녀 정류장:{" "}
              <span className="font-bold">
                {trip.route.stops.find(
                  (rs) => rs.stop.id === access.childStudent.stopId,
                )?.stop.name ?? "—"}
              </span>
            </p>
          </CardContent>
        </Card>
        <Button asChild variant="outline">
          <Link href="/home">홈으로</Link>
        </Button>
      </main>
    );
  }

  // 진행 중 trip — childEta는 Suspense 슬롯으로. fallback null이면 카드가 잠깐
  // 비어 보였다가 학습 데이터 도착하면 스르륵 표시 (기존 UX와 동일하게 "없음→있음" 자연스러움).
  const childEtaSlot = trip.startedAt ? (
    <Suspense fallback={null}>
      <ChildEtaSection
        tripId={trip.id}
        routeId={trip.routeId}
        childStopId={access.childStudent.stopId}
        startedAtMs={trip.startedAt.getTime()}
      />
    </Suspense>
  ) : null;

  // 자녀 stop 예정 시각 — refac live-eta sub "예상 도착 08:00"
  const childRouteStop = trip.route.stops.find(
    (rs) => rs.stop.id === access.childStudent.stopId,
  );
  const childStopScheduledAt = childRouteStop?.scheduledAt ?? null;

  // 거리 누적 — INTERVAL+STOP_PASS 모두 포함, recordedAt 오름차순으로 haversine.
  // server에서 거리만 계산해 client로 전달 (client는 ping을 모름).
  const distanceKm = (() => {
    if (trip.pings.length < 2) return 0;
    let dist = 0;
    for (let i = 1; i < trip.pings.length; i++) {
      const a = trip.pings[i - 1];
      const b = trip.pings[i];
      const R = 6_371_000;
      const dLat = ((b.lat - a.lat) * Math.PI) / 180;
      const dLng = ((b.lng - a.lng) * Math.PI) / 180;
      const lat1 = (a.lat * Math.PI) / 180;
      const lat2 = (b.lat * Math.PI) / 180;
      const h =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
      dist += 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
    }
    return +(dist / 1000).toFixed(2);
  })();

  // 진행 중·예정 trip — 풀스크린 shell
  return (
    <TripLiveShell
      tripId={trip.id}
      childStudent={access.childStudent}
      route={{
        name: trip.route.name,
        direction: trip.route.direction,
      }}
      vehicle={trip.vehicle}
      driverName={trip.driver.name}
      driverPhone={trip.driver.phone}
      helperName={trip.helper?.name ?? null}
      stops={trip.route.stops.map((rs) => ({
        id: rs.id,
        stopId: rs.stop.id,
        name: rs.stop.name,
        lat: rs.stop.lat,
        lng: rs.stop.lng,
        order: rs.order,
        scheduledAt: rs.scheduledAt,
      }))}
      passedStopIds={Array.from(passedStopIds)}
      startedAtISO={trip.startedAt?.toISOString() ?? null}
      childEtaSlot={childEtaSlot}
      childStopScheduledAt={childStopScheduledAt}
      boardedCount={boardedCount}
      totalAssigned={totalAssigned}
      distanceKm={distanceKm}
    />
  );
}
