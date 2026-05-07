import Link from "next/link";

import { db } from "@/lib/db";

import { AdminMultiTripLive } from "./_components/admin-multi-trip-live";

// W24: 매니저 — cross-org 오늘 운행 현황. 운행 중 차량 multi-org 라이브 지도 +
// 오늘 trip list (학원명·기사·status).

export default async function AdminTripsPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

  const trips = await db.trip.findMany({
    where: {
      date: { gte: today, lt: tomorrow },
    },
    orderBy: [{ startedAt: "desc" }],
    select: {
      id: true,
      startedAt: true,
      endedAt: true,
      vehicle: {
        select: {
          id: true,
          plate: true,
          orgId: true,
          org: { select: { id: true, name: true } },
        },
      },
      route: {
        select: {
          id: true,
          name: true,
          direction: true,
          stops: {
            select: {
              id: true,
              order: true,
              stop: {
                select: { id: true, name: true, lat: true, lng: true },
              },
            },
            orderBy: { order: "asc" },
          },
        },
      },
      driver: { select: { id: true, name: true } },
    },
  });

  const runningTrips = trips
    .filter((t) => t.startedAt && !t.endedAt)
    .map((t) => ({
      id: t.id,
      orgId: t.vehicle.org.id,
      vehiclePlate: t.vehicle.plate,
      routeName: t.route.name,
      direction: t.route.direction,
      stops: t.route.stops.map((rs) => ({
        id: rs.stop.id,
        name: rs.stop.name,
        lat: rs.stop.lat,
        lng: rs.stop.lng,
        order: rs.order,
      })),
    }));

  const finishedCount = trips.filter((t) => t.endedAt).length;
  const pendingCount = trips.filter((t) => !t.startedAt).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">운행 현황</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          오늘({today.toISOString().slice(0, 10)}) 전체 학원 운행 ({trips.length}
          건). 진행 중 {runningTrips.length} · 종료 {finishedCount} · 미시작{" "}
          {pendingCount}.
        </p>
      </div>

      <AdminMultiTripLive runningTrips={runningTrips} />

      <section className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">오늘 운행</h3>
        </div>
        {trips.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            오늘 운행이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {trips.map((t) => {
              const status = t.endedAt
                ? "종료"
                : t.startedAt
                  ? "운행 중"
                  : "대기";
              const statusCls = t.endedAt
                ? "bg-muted text-muted-foreground"
                : t.startedAt
                  ? "bg-bus-soft text-bus"
                  : "bg-warning-soft text-warning";
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/orgs/${t.vehicle.org.id}`}
                    className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                          {t.vehicle.org.name}
                        </span>
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {t.vehicle.plate} · {t.route.name}
                        </h3>
                        <span
                          className={`${statusCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs font-medium">
                        {t.route.direction === "PICKUP" ? "등원" : "하원"} ·
                        기사 {t.driver.name}
                        {t.startedAt
                          ? ` · 시작 ${t.startedAt.toISOString().slice(11, 16)}`
                          : ""}
                        {t.endedAt
                          ? ` · 종료 ${t.endedAt.toISOString().slice(11, 16)}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
