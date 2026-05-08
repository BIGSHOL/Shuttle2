import Link from "next/link";
import { ArrowRight, Bus, CheckCircle2, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";
import { todayBitKst, todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";
import { formatKstHHmm } from "@/lib/geo/trip-stats";

import { DriverNotificationToggle } from "../notifications/driver-notification-toggle";
import { DriverPermissionsCard } from "./_components/driver-permissions-card";
import { RunChecklistCard } from "./_components/run-checklist-card";
import { StartTripButton } from "./start-trip-button";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export default async function RunPage() {
  const me = await requireDriver();
  const orgId = me.org.id;
  const bit = todayBitKst();
  const todayDate = todayUtcDateKst();

  const [allRoutes, helpers, todayTrips] = await Promise.all([
    db.route.findMany({
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
    }),
    db.staff.findMany({
      where: { orgId, role: "HELPER" },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    // 오늘 본인이 운행한 trip — 같은 route 여러 trip 중 가장 최근 1건만 사용.
    db.trip.findMany({
      where: { driverId: me.staff.id, date: todayDate },
      orderBy: { startedAt: "desc" },
      select: {
        id: true,
        routeId: true,
        startedAt: true,
        endedAt: true,
        _count: { select: { events: true } },
      },
    }),
  ]);
  const todaysRoutes = allRoutes.filter((r) => (r.weekdays & bit) !== 0);

  // routeId → 가장 최근 trip (orderBy startedAt desc 이미 적용 — 첫 매칭만 사용)
  const latestTripByRouteId = new Map<string, (typeof todayTrips)[number]>();
  for (const t of todayTrips) {
    if (!latestTripByRouteId.has(t.routeId)) {
      latestTripByRouteId.set(t.routeId, t);
    }
  }

  const upcomingRoutes = todaysRoutes.filter((r) => {
    const t = latestTripByRouteId.get(r.id);
    return !t || t.endedAt === null;
  });
  const completedRoutes = todaysRoutes.flatMap((r) => {
    const t = latestTripByRouteId.get(r.id);
    return t && t.endedAt ? [{ route: r, trip: t }] : [];
  });

  const activeTripCandidate = todayTrips.find(
    (t) => t.startedAt !== null && t.endedAt === null,
  );
  const activeTrip = activeTripCandidate
    ? {
        id: activeTripCandidate.id,
        route: {
          name:
            allRoutes.find((r) => r.id === activeTripCandidate.routeId)?.name ??
            "운행",
        },
      }
    : null;

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      {/* 진행 중 sticky 배너 — 좌측 stripe + 펄스 ring */}
      {activeTrip ? (
        <Link
          href={`/trip/${activeTrip.id}`}
          className="bg-bus text-bus-foreground border-bus-foreground/10 sticky top-[52px] z-20 -mx-4 flex items-center justify-between gap-3 overflow-hidden border-y-2 px-4 py-3.5 shadow-md"
        >
          <div className="bg-bus-foreground/40 pointer-events-none absolute inset-y-0 left-0 w-1" />
          <div className="bg-bus-foreground/10 pointer-events-none absolute -top-8 -right-4 h-24 w-24 rounded-full blur-2xl" />
          <div className="relative flex items-center gap-3">
            <span className="bg-bus-foreground/15 ring-bus-foreground/20 relative flex h-9 w-9 items-center justify-center rounded-full ring-2">
              <Bus className="h-4 w-4" />
              <span className="bg-bus-foreground/30 absolute h-9 w-9 animate-ping rounded-full opacity-40" />
            </span>
            <div>
              <p className="text-[10px] font-extrabold tracking-[0.1em] uppercase opacity-75">
                진행 중
              </p>
              <p className="text-sm font-black tracking-tight">
                {activeTrip.route.name} 운행 중
              </p>
            </div>
          </div>
          <div className="relative flex items-center gap-1 text-[11px] font-extrabold">
            <span>이동</span>
            <ArrowRight className="h-4 w-4" />
          </div>
        </Link>
      ) : null}

      {/* hero */}
      <div>
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          기사 화면
        </p>
        <h2 className="mt-1 text-[28px] font-black tracking-tight leading-tight">
          오늘 운행
        </h2>
        <p className="text-muted-foreground mt-1.5 text-xs font-semibold">
          오늘 요일 노선 {todaysRoutes.length}건 · 예정 {upcomingRoutes.length}
          건 · 완료 {completedRoutes.length}건
        </p>
        {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
          <div className="mt-3">
            <DriverNotificationToggle
              vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
            />
          </div>
        ) : null}
      </div>

      {activeTrip ? null : <DriverPermissionsCard />}

      <RunChecklistCard />

      {todaysRoutes.length === 0 ? (
        <EmptyState
          icon={Bus}
          title="오늘 배정된 노선이 없어요"
          description="학원장·원장님이 새 노선을 추가하면 여기 표시됩니다."
        />
      ) : (
        <>
          {/* 운행 예정 */}
          {upcomingRoutes.length > 0 ? (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
                  운행 예정
                </h3>
                <span className="text-muted-foreground font-mono text-[11px] font-bold tabular-nums">
                  {upcomingRoutes.length}건
                </span>
              </div>
              <ul className="space-y-2.5">
                {upcomingRoutes.map((r) => {
                  const isPickup = r.direction === "PICKUP";
                  const dirClass = isPickup
                    ? "bg-success-soft text-success"
                    : "bg-info-soft text-info";
                  const isKids = r.vehicle.mode === "KIDS";
                  return (
                    <li
                      key={r.id}
                      className="bg-card relative rounded-2xl border p-4 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border-2 border-current/15 ${dirClass}`}
                        >
                          <Bus className="h-5 w-5" strokeWidth={2.5} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.05em] uppercase ${dirClass}`}
                            >
                              {DIRECTION_LABEL[r.direction]}
                            </span>
                            {isKids ? (
                              <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.05em]">
                                어린이용
                              </span>
                            ) : (
                              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.05em]">
                                일반용
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 truncate text-lg font-black tracking-tight leading-tight">
                            {r.name}
                          </p>
                          <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold">
                            {r.stops[0]?.scheduledAt ? (
                              <span className="inline-flex items-center gap-1 tabular-nums">
                                <Clock className="h-3 w-3" />
                                {r.stops[0].scheduledAt}
                              </span>
                            ) : null}
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              정류장 {r._count.stops}개
                            </span>
                            <span className="bg-muted/60 rounded px-1.5 py-0.5 font-mono text-[11px]">
                              {r.vehicle.plate}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="mt-4 border-t border-dashed pt-3">
                        <StartTripButton
                          routeId={r.id}
                          vehicleId={r.vehicleId}
                          vehicleMode={r.vehicle.mode}
                          routeName={r.name}
                          helpers={helpers}
                          disabled={
                            r._count.stops === 0 || activeTrip !== null
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {/* 운행 완료 — 오늘 같은 노선을 끝낸 trip 요약. 회색 톤·시작/종료 시각 + 상세 링크. */}
          {completedRoutes.length > 0 ? (
            <section className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-muted-foreground inline-flex items-center gap-1.5 text-[11px] font-extrabold tracking-[0.1em] uppercase">
                  <CheckCircle2 className="text-success h-3.5 w-3.5" />
                  운행 완료
                </h3>
                <span className="text-muted-foreground font-mono text-[11px] font-bold tabular-nums">
                  {completedRoutes.length}건
                </span>
              </div>
              <ul className="space-y-2">
                {completedRoutes.map(({ route: r, trip }) => {
                  const isPickup = r.direction === "PICKUP";
                  const dirClass = isPickup
                    ? "bg-success-soft text-success"
                    : "bg-info-soft text-info";
                  const isKids = r.vehicle.mode === "KIDS";
                  return (
                    <li key={r.id}>
                      <Link
                        href={`/trip/${trip.id}`}
                        className="bg-muted/40 hover:bg-muted/60 active:bg-muted/60 block rounded-2xl border p-3.5 transition-colors"
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border opacity-70 ${dirClass}`}
                          >
                            <CheckCircle2
                              className="h-4 w-4"
                              strokeWidth={2.5}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1">
                              <span
                                className={`rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.05em] uppercase opacity-80 ${dirClass}`}
                              >
                                {DIRECTION_LABEL[r.direction]}
                              </span>
                              {isKids ? (
                                <span className="bg-bus/30 text-bus-foreground/80 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.05em]">
                                  어린이용
                                </span>
                              ) : null}
                              <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.05em]">
                                완료
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-1 truncate text-sm font-extrabold tracking-tight leading-tight">
                              {r.name}
                            </p>
                            <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] font-semibold">
                              <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                                <Clock className="h-3 w-3" />
                                {trip.startedAt
                                  ? formatKstHHmm(trip.startedAt)
                                  : "—"}
                                {trip.endedAt
                                  ? ` ~ ${formatKstHHmm(trip.endedAt)}`
                                  : ""}
                              </span>
                              <span>· 이벤트 {trip._count.events}건</span>
                              <span className="bg-muted/60 rounded px-1.5 py-0.5 font-mono text-[10px]">
                                {r.vehicle.plate}
                              </span>
                            </div>
                          </div>
                          <ArrowRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}
        </>
      )}

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/run/notifications">알림 보기</Link>
        </Button>
      </div>
    </main>
  );
}
