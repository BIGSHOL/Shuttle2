import Link from "next/link";
import { Bus, Calendar, MapPin } from "lucide-react";

import { EmptyState } from "@/components/shuttlee/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { db } from "@/lib/db";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function fmtKstHHmm(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

// 오늘 운행 모니터 + 진행 중 trip의 boarding 통계 (탑승·하차 합산).
// page.tsx 빠른 KPI보다 무거우므로 Suspense로 분리.
export async function TodayTripsMonitor({
  orgId,
  todayDate,
  dense,
}: {
  orgId: string;
  todayDate: Date;
  // W25 P1-A: dashboard 우측 sidebar에 들어갈 때는 항상 1-col list. 기본은 2-col.
  dense?: boolean;
}) {
  const todayTrips = await db.trip.findMany({
    where: { vehicle: { orgId }, date: todayDate },
    orderBy: [{ startedAt: "asc" }],
    include: {
      route: {
        select: {
          name: true,
          direction: true,
          _count: { select: { stops: true } },
        },
      },
      vehicle: { select: { plate: true, mode: true } },
      driver: { select: { name: true } },
      _count: { select: { events: true } },
    },
  });

  const runningTrips = todayTrips.filter(
    (t) => t.startedAt !== null && t.endedAt === null,
  );
  const finishedTrips = todayTrips.filter((t) => t.endedAt !== null);
  const runningTripIds = runningTrips.map((t) => t.id);

  const runningBoardings =
    runningTripIds.length > 0
      ? await db.boardingEvent.findMany({
          where: { tripId: { in: runningTripIds } },
          select: { tripId: true, type: true },
        })
      : [];

  const boardingsByTrip = new Map<string, { board: number; alight: number }>();
  for (const tid of runningTripIds) {
    boardingsByTrip.set(tid, { board: 0, alight: 0 });
  }
  for (const e of runningBoardings) {
    const stat = boardingsByTrip.get(e.tripId);
    if (!stat) continue;
    if (e.type === "BOARD") stat.board++;
    else stat.alight++;
  }

  if (todayTrips.length === 0) {
    return (
      <EmptyState
        icon={Bus}
        title="오늘 운행이 없어요"
        description="오늘 요일에 운행하는 노선이 없거나 기사가 운행을 시작하지 않았습니다."
      />
    );
  }

  return (
    <ul className={dense ? "space-y-2.5" : "grid gap-3 lg:grid-cols-2"}>
      {[
        ...runningTrips,
        ...todayTrips.filter((t) => t.startedAt === null),
        ...finishedTrips,
      ].map((t) => {
        const stats = boardingsByTrip.get(t.id);
        const total = t.route._count.stops;
        const passedKind =
          t.startedAt && !t.endedAt
            ? "running"
            : t.endedAt
              ? "finished"
              : "scheduled";
        return (
          <TripMonitorCard
            key={t.id}
            tripId={t.id}
            routeName={t.route.name}
            direction={t.route.direction}
            vehiclePlate={t.vehicle.plate}
            isKids={t.vehicle.mode === "KIDS"}
            driverName={t.driver?.name ?? "—"}
            startedAt={t.startedAt}
            endedAt={t.endedAt}
            totalEvents={t._count.events}
            totalStops={total}
            boarded={stats ? stats.board + stats.alight : 0}
            kind={passedKind}
          />
        );
      })}
    </ul>
  );
}

export function TodayTripsMonitorSkeleton({
  dense,
}: { dense?: boolean } = {}) {
  return (
    <ul className={dense ? "space-y-2.5" : "grid gap-3 lg:grid-cols-2"}>
      {Array.from({ length: 2 }).map((_, i) => (
        <li
          key={i}
          className="bg-card space-y-3 rounded-lg border p-4 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-6 w-12 rounded-md" />
          </div>
          <Skeleton className="h-3 w-2/3" />
          <Skeleton className="h-12 w-full rounded-md" />
        </li>
      ))}
    </ul>
  );
}

// ────────────────────────────────────────────────────────────────────
// TripMonitorCard — 진행 중·예정·완료 카드
// ────────────────────────────────────────────────────────────────────

function TripMonitorCard({
  tripId,
  routeName,
  direction,
  vehiclePlate,
  isKids,
  driverName,
  startedAt,
  endedAt,
  totalEvents,
  totalStops,
  kind,
  boarded,
}: {
  tripId: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  vehiclePlate: string;
  isKids: boolean;
  driverName: string;
  startedAt: Date | null;
  endedAt: Date | null;
  totalEvents: number;
  totalStops: number;
  kind: "running" | "scheduled" | "finished";
  boarded: number;
}) {
  const dirCls =
    direction === "PICKUP"
      ? "bg-success-soft text-success"
      : "bg-info-soft text-info";

  if (kind === "running") {
    return (
      <li>
        <Link
          href={`/dashboard/trip/${tripId}`}
          className="relative block overflow-hidden rounded-lg p-4 text-white shadow-md transition-opacity hover:opacity-95"
          style={{
            background: "linear-gradient(155deg, #1a1c22, #0f1014)",
          }}
        >
          <div className="bg-bus absolute inset-x-0 top-0 h-[3px]" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="bg-bus text-bus-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                  <span className="bg-bus-foreground inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                  진행 중
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${dirCls}`}
                >
                  {DIRECTION_LABEL[direction]}
                </span>
                {isKids ? (
                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                    어린이용
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 truncate text-base font-extrabold tracking-tight">
                {routeName}
              </p>
              <p className="mt-0.5 text-xs font-medium opacity-70">
                {driverName} · {vehiclePlate}
              </p>
            </div>
            {startedAt ? (
              <div className="text-right">
                <p className="text-[10px] font-extrabold tracking-wide uppercase opacity-60">
                  시작
                </p>
                <p className="font-mono text-base font-extrabold">
                  {fmtKstHHmm(startedAt)}
                </p>
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-bold">
                정류장 {totalStops}
              </span>
              <span className="rounded-md bg-white/10 px-1.5 py-0.5 font-bold">
                탑승·하차 {boarded}
              </span>
            </div>
            <span className="text-[11px] font-bold opacity-70">
              상세 보기 →
            </span>
          </div>
        </Link>
      </li>
    );
  }

  const tone =
    kind === "finished"
      ? { bg: "bg-success-soft", text: "text-success", label: "완료" }
      : { bg: "bg-muted", text: "text-muted-foreground", label: "예정" };

  const Wrapper = kind === "finished" ? Link : "div";
  const wrapperProps =
    kind === "finished"
      ? {
          href: `/dashboard/trip/${tripId}`,
          className:
            "bg-card hover:bg-muted/40 block rounded-lg border p-4 shadow-sm transition-colors",
        }
      : { className: "bg-card rounded-lg border p-4 shadow-sm" };

  return (
    <li>
      <Wrapper {...(wrapperProps as { href: string; className: string })}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${tone.bg} ${tone.text}`}
              >
                {tone.label}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${dirCls}`}
              >
                {DIRECTION_LABEL[direction]}
              </span>
              {isKids ? (
                <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                  어린이용
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-sm font-extrabold tracking-tight">
              {routeName}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {driverName} · {vehiclePlate}
            </p>
          </div>
          {endedAt ? (
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                종료
              </p>
              <p className="font-mono text-sm font-extrabold">
                {fmtKstHHmm(endedAt)}
              </p>
            </div>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            정류장 {totalStops}
          </span>
          {kind === "finished" ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              이벤트 {totalEvents}
            </span>
          ) : null}
        </div>
      </Wrapper>
    </li>
  );
}
