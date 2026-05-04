import Link from "next/link";
import { ArrowRight, Bus, Clock, MapPin } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";
import { todayBitKst, todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";

import { DriverNotificationToggle } from "../notifications/driver-notification-toggle";
import { StartTripButton } from "./start-trip-button";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export default async function RunPage() {
  const me = await requireDriver();
  const orgId = me.org.id;
  const bit = todayBitKst();

  // 오늘 운행하는 노선만 (weekdays 비트마스크에 오늘 비트가 켜진 것)
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
  const todaysRoutes = allRoutes.filter((r) => (r.weekdays & bit) !== 0);

  // 이미 진행 중인 trip이 있으면 곧장 그 화면으로 안내
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
      {/* 인사 + 진행 중 sticky 배너 */}
      {activeTrip ? (
        <Link
          href={`/trip/${activeTrip.id}`}
          className="bg-bus text-bus-foreground sticky top-[52px] z-20 -mx-4 flex items-center justify-between gap-3 px-4 py-3 shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="bg-bus-foreground/15 flex h-8 w-8 items-center justify-center rounded-full">
              <Bus className="h-4 w-4" />
            </span>
            <div>
              <p className="text-xs font-bold tracking-wide uppercase opacity-70">
                진행 중
              </p>
              <p className="text-sm font-extrabold">
                {activeTrip.route.name} 운행 중
              </p>
            </div>
          </div>
          <ArrowRight className="h-5 w-5" />
        </Link>
      ) : null}

      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">오늘 운행</h2>
        <p className="text-muted-foreground mt-1 text-xs font-medium">
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

      <details className="bg-card rounded-lg border px-4 py-3 text-sm shadow-sm">
        <summary className="text-foreground cursor-pointer text-xs font-bold tracking-wide uppercase">
          운행 전 확인사항
        </summary>
        <ul className="text-muted-foreground mt-3 list-disc space-y-1.5 pl-4 text-xs font-medium">
          <li>
            <strong className="text-foreground">거치대 + 충전기</strong>를
            차량에 고정하세요. 운행 중 폰을 만지면 위험합니다.
          </li>
          <li>
            폰은{" "}
            <strong className="text-foreground">안드로이드 권장</strong> — iOS
            Safari는 백그라운드 GPS·화면 잠금 방지가 약해 셔틀 위치가 끊길 수
            있습니다.
          </li>
          <li>
            iOS를 쓴다면{" "}
            <strong className="text-foreground">
              운행 화면을 항상 켠 상태
            </strong>
            로 두세요 (자동 화면 잠금이 GPS를 멈춥니다).
          </li>
          <li>
            처음 진입 시 브라우저가 묻는{" "}
            <strong className="text-foreground">
              위치 권한·알림 권한을 허용
            </strong>
            해 주세요.
          </li>
          <li>
            어린이용 모드 차량은{" "}
            <strong className="text-foreground">동승보호자</strong>가 함께 타야
            합니다 (어린이통학버스 법령 의무).
          </li>
        </ul>
      </details>

      {todaysRoutes.length === 0 ? (
        <div className="bg-card rounded-lg border p-6 text-center shadow-sm">
          <Bus className="text-muted-foreground mx-auto h-8 w-8" />
          <p className="mt-3 text-base font-bold">오늘 배정된 노선이 없어요</p>
          <p className="text-muted-foreground mt-1 text-xs font-medium">
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
                className="bg-card relative rounded-lg border p-4 shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${dirClass}`}
                  >
                    <Bus className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${dirClass}`}
                      >
                        {DIRECTION_LABEL[r.direction]}
                      </span>
                      {isKids ? (
                        <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                          어린이용
                        </span>
                      ) : (
                        <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                          일반용
                        </span>
                      )}
                    </div>
                    <p className="mt-1 truncate text-base font-extrabold tracking-tight">
                      {r.name}
                    </p>
                    <div className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium">
                      {r.stops[0]?.scheduledAt ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {r.stops[0].scheduledAt}
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        정류장 {r._count.stops}개
                      </span>
                      <span className="font-mono">{r.vehicle.plate}</span>
                    </div>
                  </div>
                </div>
                <div className="mt-3">
                  <StartTripButton
                    routeId={r.id}
                    vehicleId={r.vehicleId}
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
