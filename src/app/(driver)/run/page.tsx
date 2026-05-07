import Link from "next/link";
import { ArrowRight, Bus, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";
import { todayBitKst, todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";

import { DriverNotificationToggle } from "../notifications/driver-notification-toggle";
import { DriverPermissionsCard } from "./_components/driver-permissions-card";
import { RunChecklistCard } from "./_components/run-checklist-card";
import { StartTripButton } from "./start-trip-button";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export default async function RunPage() {
  const me = await requireDriver();
  const orgId = me.org.id;
  const bit = todayBitKst();

  const [allRoutes, helpers] = await Promise.all([
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
  ]);
  const todaysRoutes = allRoutes.filter((r) => (r.weekdays & bit) !== 0);

  const todayDate = todayUtcDateKst();
  const activeTrip = await db.trip.findFirst({
    where: {
      driverId: me.staff.id,
      date: todayDate,
      endedAt: null,
      startedAt: { not: null },
    },
    select: { id: true, route: { select: { name: true } } },
  });

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
          오늘 요일에 해당하는 노선 {todaysRoutes.length}건.
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
        <div className="bg-card rounded-2xl border-2 border-dashed p-8 text-center shadow-sm">
          <div className="bg-muted/60 mx-auto flex h-14 w-14 items-center justify-center rounded-2xl">
            <Bus className="text-muted-foreground h-7 w-7" />
          </div>
          <p className="mt-4 text-base font-extrabold tracking-tight">
            오늘 배정된 노선이 없어요
          </p>
          <p className="text-muted-foreground mt-1.5 text-xs font-semibold leading-relaxed">
            학원장·원장님이 새 노선을 추가하면 여기 표시됩니다.
          </p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {todaysRoutes.map((r) => {
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
                    disabled={r._count.stops === 0 || activeTrip !== null}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/run/notifications">알림 보기</Link>
        </Button>
      </div>
    </main>
  );
}
