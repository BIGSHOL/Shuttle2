// GET /api/driver/today-routes — 기사 RN 앱 운행 picker용.
// `/run/page.tsx`의 데이터 fetch 로직과 동일 (오늘 요일에 해당하는 노선 +
// 진행 중 trip 있으면 그 정보).

import { NextResponse } from "next/server";

import { requireApiRole } from "@/lib/auth/api-guard";
import { db } from "@/lib/db";
import { todayBitKst, todayUtcDateKst } from "@/lib/date/today";

export async function GET() {
  const guard = await requireApiRole(["DRIVER"]);
  if (!guard.ok) return guard.response;

  const orgId = guard.user.org.id;
  const bit = todayBitKst();

  const allRoutes = await db.route.findMany({
    where: { vehicle: { orgId } },
    orderBy: [{ direction: "asc" }, { name: "asc" }],
    include: {
      vehicle: { select: { plate: true, mode: true } },
      stops: {
        orderBy: { order: "asc" },
        take: 1,
        select: { scheduledAt: true },
      },
      _count: { select: { stops: true } },
    },
  });
  const todaysRoutes = allRoutes
    .filter((r) => (r.weekdays & bit) !== 0)
    .map((r) => ({
      id: r.id,
      name: r.name,
      direction: r.direction,
      vehicleId: r.vehicleId,
      vehiclePlate: r.vehicle.plate,
      vehicleMode: r.vehicle.mode,
      firstScheduledAt: r.stops[0]?.scheduledAt ?? null,
      stopCount: r._count.stops,
    }));

  // 진행 중 trip — RN이 같은 trip 화면으로 redirect할 수 있게.
  const todayDate = todayUtcDateKst();
  const activeTrip = await db.trip.findFirst({
    where: {
      driverId: guard.user.staff.id,
      date: todayDate,
      endedAt: null,
      startedAt: { not: null },
    },
    select: {
      id: true,
      route: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    routes: todaysRoutes,
    activeTrip: activeTrip
      ? {
          id: activeTrip.id,
          routeId: activeTrip.route.id,
          routeName: activeTrip.route.name,
        }
      : null,
  });
}
