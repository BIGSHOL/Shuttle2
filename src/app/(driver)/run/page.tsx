import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";
import { todayBitKst, todayUtcDateKst } from "@/lib/date/today";

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
    <main className="mx-auto max-w-3xl space-y-6 p-4">
      {activeTrip ? (
        <Card className="border-emerald-300 bg-emerald-50/60">
          <CardHeader>
            <CardTitle className="text-emerald-900">진행 중인 운행</CardTitle>
            <CardDescription>
              <span className="font-medium">{activeTrip.route.name}</span>{" "}
              운행이 아직 종료되지 않았습니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href={`/trip/${activeTrip.id}`}>운행 화면으로 가기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div>
        <h2 className="text-xl font-semibold">오늘 운행</h2>
        <p className="text-muted-foreground text-sm">
          오늘 요일에 해당하는 노선만 표시됩니다.
        </p>
      </div>

      {todaysRoutes.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>오늘 배정된 노선이 없습니다</CardTitle>
            <CardDescription>
              운행 일정이 없는 날입니다. 학원장·원장님이 새 노선을 추가하면 여기
              표시됩니다.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-3">
          {todaysRoutes.map((r) => (
            <Card key={r.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">{r.name}</CardTitle>
                    <CardDescription className="mt-1 flex flex-wrap gap-2 text-xs">
                      <span
                        className={
                          r.direction === "PICKUP"
                            ? "rounded-md bg-emerald-100 px-2 py-0.5 font-medium text-emerald-900"
                            : "rounded-md bg-sky-100 px-2 py-0.5 font-medium text-sky-900"
                        }
                      >
                        {DIRECTION_LABEL[r.direction]}
                      </span>
                      <span className="text-muted-foreground">
                        [{r.vehicle.mode}] {r.vehicle.plate}
                      </span>
                      <span className="text-muted-foreground">
                        정류장 {r._count.stops}개
                      </span>
                    </CardDescription>
                  </div>
                  <StartTripButton
                    routeId={r.id}
                    vehicleId={r.vehicleId}
                    disabled={r._count.stops === 0 || activeTrip !== null}
                  />
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
