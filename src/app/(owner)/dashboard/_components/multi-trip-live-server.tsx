import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";

import { MultiTripLiveSection } from "./multi-trip-live-section";

// MultiTripLiveSection은 client component (broadcast 구독). 데이터 fetch는
// server side에서 별도 wrapper로. Suspense로 분리해 dashboard 첫 paint 방해 안 됨.
export async function MultiTripLiveServer({
  orgId,
  todayDate,
}: {
  orgId: string;
  todayDate: Date;
}) {
  const runningTrips = await db.trip.findMany({
    where: {
      vehicle: { orgId },
      date: todayDate,
      startedAt: { not: null },
      endedAt: null,
    },
    select: {
      id: true,
      vehicle: { select: { plate: true } },
      route: {
        select: {
          name: true,
          direction: true,
          stops: {
            orderBy: { order: "asc" },
            select: {
              id: true,
              order: true,
              stop: {
                select: { id: true, name: true, lat: true, lng: true },
              },
            },
          },
        },
      },
    },
  });

  const liveMapTrips = runningTrips.map((t) => ({
    id: t.id,
    vehiclePlate: t.vehicle.plate,
    routeName: t.route.name,
    direction: t.route.direction,
    stops: t.route.stops.map((rs) => ({
      id: rs.id,
      name: rs.stop.name,
      lat: rs.stop.lat,
      lng: rs.stop.lng,
      order: rs.order,
    })),
  }));

  return <MultiTripLiveSection runningTrips={liveMapTrips} />;
}

export function MultiTripLiveSkeleton() {
  // 운행 중 0대일 가능성도 있어 skeleton은 짧게. 운행 중일 때만 큰 지도가 fade-in.
  return <Skeleton className="h-2 w-full" />;
}
