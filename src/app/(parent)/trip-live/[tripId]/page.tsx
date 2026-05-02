import Link from "next/link";
import { notFound } from "next/navigation";

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

import { TripLiveView } from "./trip-live-view";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export default async function TripLivePage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const access = await requireGuardianTripAccess(tripId);

  const trip = await db.trip.findUnique({
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
      driver: { select: { name: true } },
      helper: { select: { name: true } },
      // STOP_PASS ping → 통과한 정류장 추정.
      // RouteStop.id는 LocationPing에 직접 들어있지 않으므로,
      // 정류장 좌표·반경 매칭은 client에서 하지 않고 STOP_PASS 시각 자체를
      // 타임라인으로만 사용. 통과 표시는 server 쪽에서 좌표 기반 매칭.
      pings: {
        where: { source: "STOP_PASS" },
        orderBy: { recordedAt: "asc" },
        select: { id: true, lat: true, lng: true, recordedAt: true },
      },
    },
  });

  if (!trip) notFound();

  // STOP_PASS ping의 좌표를 RouteStop과 매칭 (가장 가까운 stop을 통과로 마킹).
  // driver측 useGpsTracker가 정류장 반경에 들어왔을 때 STOP_PASS ping을
  // 발생시키므로 거리 임계값(150m) 이내의 stop을 그 ping의 통과 stop으로 본다.
  const passedStopIds = new Set<string>();
  for (const ping of trip.pings) {
    let bestStopId: string | null = null;
    let bestDistSq = Infinity;
    for (const rs of trip.route.stops) {
      const dLat = ping.lat - rs.stop.lat;
      const dLng = ping.lng - rs.stop.lng;
      const distSq = dLat * dLat + dLng * dLng;
      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestStopId = rs.id; // RouteStop.id (학생 trip 화면과 동일 키)
      }
    }
    if (bestStopId) passedStopIds.add(bestStopId);
  }

  // 종료된 trip이면 요약 카드만 보여주고 마무리 (driver측 trip-running-view 미러)
  if (trip.endedAt) {
    return (
      <main className="mx-auto max-w-3xl space-y-4 p-4">
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle>운행 종료</CardTitle>
            <CardDescription>
              <span className="font-medium">{trip.route.name}</span>{" "}
              {DIRECTION_LABEL[trip.route.direction]} 운행은 종료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-muted-foreground space-y-1 text-sm">
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
              <span className="font-medium">
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

  return (
    <TripLiveView
      tripId={trip.id}
      childStudent={access.childStudent}
      route={{
        name: trip.route.name,
        direction: trip.route.direction,
      }}
      vehicle={trip.vehicle}
      driverName={trip.driver.name}
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
    />
  );
}
