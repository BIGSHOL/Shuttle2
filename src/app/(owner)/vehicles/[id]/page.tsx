import { ArrowLeft } from "lucide-react";
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
import { getOrgId, requireOwner } from "@/lib/auth/session";
import {
  computeTripStats,
  formatDuration,
  type PingPoint,
} from "@/lib/geo/trip-stats";

import { DeleteVehicleButton } from "../_components/delete-vehicle-button";

// W21-A: 차량 360° 상세.
// 학원장이 차량 한 대의 30일 운행 패턴(횟수·거리·속도·미탑승)·배정 노선·최근
// 운행 기록·안전점검 이슈를 한 화면에서 파악 + 편집·삭제로 바로 이동.

const MODE_LABEL = {
  KIDS: "어린이용",
  GENERAL: "일반용",
} as const;

const DIRECTION_LABEL = {
  PICKUP: "등원",
  DROPOFF: "하원",
} as const;

function fmtDateKst(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtTimeKst(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export default async function VehicleProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner();
  const orgId = await getOrgId();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [vehicle, routes, trips] = await Promise.all([
    db.vehicle.findFirst({
      where: { id, orgId },
    }),
    db.route.findMany({
      where: { vehicleId: id },
      orderBy: [{ direction: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { students: true, stops: true } },
      },
    }),
    db.trip.findMany({
      where: {
        vehicleId: id,
        startedAt: { not: null, gte: thirtyDaysAgo },
      },
      orderBy: { startedAt: "desc" },
      take: 30,
      select: {
        id: true,
        date: true,
        startedAt: true,
        endedAt: true,
        route: { select: { name: true, direction: true } },
        driver: { select: { id: true, name: true } },
        pings: {
          orderBy: { recordedAt: "asc" },
          select: {
            lat: true,
            lng: true,
            recordedAt: true,
            speed: true,
            source: true,
          },
        },
        events: {
          where: { type: { in: ["NO_SHOW", "NO_DROPOFF"] } },
          select: { id: true },
        },
        safetyCheck: {
          select: {
            seatbeltAllOk: true,
            helperPresent: true,
            allAlightedOk: true,
          },
        },
      },
    }),
  ]);

  if (!vehicle) notFound();

  const isKids = vehicle.mode === "KIDS";

  // 30일 누계 통계
  const tripStatsList = trips.map((t) => ({
    trip: t,
    stats: computeTripStats(
      t.pings as PingPoint[],
      t.startedAt,
      t.endedAt,
    ),
  }));
  const totalDistanceKm = tripStatsList.reduce(
    (s, x) => s + x.stats.distanceKm,
    0,
  );
  const totalDurationSec = tripStatsList.reduce(
    (s, x) => s + x.stats.durationSec,
    0,
  );
  const avgSpeedKmh =
    totalDurationSec > 0
      ? +(totalDistanceKm / (totalDurationSec / 3600)).toFixed(1)
      : 0;
  const noShowCount = trips.reduce((s, t) => s + t.events.length, 0);

  // 안전점검 미흡 운행 (KIDS만)
  const safetyFailTrips = isKids
    ? trips.filter((t) => {
        if (!t.safetyCheck) return false;
        return (
          !t.safetyCheck.seatbeltAllOk ||
          !t.safetyCheck.allAlightedOk
        );
      })
    : [];

  // 보험 만기 임박 (60일 이내). 렌더 시점의 now를 한 번만 캡처 (impure rule).
  const nowMs = today.getTime() + 9 * 60 * 60 * 1000; // KST 자정 기준이면 충분
  let insuranceWarning = false;
  let insuranceExpired = false;
  if (vehicle.insuranceUntil) {
    const daysLeft = Math.floor(
      (vehicle.insuranceUntil.getTime() - nowMs) / (24 * 60 * 60 * 1000),
    );
    if (daysLeft < 0) insuranceExpired = true;
    else if (daysLeft < 60) insuranceWarning = true;
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href="/vehicles"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="차량 목록으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          차량 상세
        </p>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                isKids
                  ? "bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-bold"
                  : "bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium"
              }
            >
              {MODE_LABEL[vehicle.mode]}
            </span>
            <h2 className="text-2xl font-semibold">{vehicle.plate}</h2>
            {insuranceExpired ? (
              <span className="bg-destructive/10 text-destructive rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                보험 만료
              </span>
            ) : insuranceWarning ? (
              <span className="bg-warning-soft text-warning rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                보험 만기 임박
              </span>
            ) : null}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            {isKids ? `신고증 ${vehicle.reportNo ?? "—"} · ` : ""}
            보험 만료 {fmtDateKst(vehicle.insuranceUntil)} · 노선{" "}
            {routes.length}개
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/vehicles/${vehicle.id}/edit`}>편집</Link>
          </Button>
          <DeleteVehicleButton id={vehicle.id} plate={vehicle.plate} />
        </div>
      </div>

      {/* 30일 통계 4-grid */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">최근 30일</h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            오늘 기준 30일 이내 운행 누계.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {[
            { label: "운행 횟수", value: `${trips.length}회` },
            {
              label: "누적 거리",
              value: `${totalDistanceKm.toFixed(1)} km`,
            },
            {
              label: "평균 속도",
              value: totalDurationSec > 0 ? `${avgSpeedKmh} km/h` : "—",
            },
            {
              label: "미탑승·미하차",
              value: `${noShowCount}회`,
              destructive: noShowCount > 0,
            },
          ].map((it) => (
            <div key={it.label} className="bg-card px-4 py-3">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                {it.label}
              </p>
              <p
                className={
                  "mt-1 text-base font-extrabold tracking-tight" +
                  (it.destructive ? " text-destructive" : "")
                }
              >
                {it.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 배정 노선 list */}
      <Card>
        <CardHeader>
          <CardTitle>배정 노선</CardTitle>
          <CardDescription>
            이 차량이 운행하는 노선. 행 클릭 시 해당 노선의 30일 분석으로 이동.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {routes.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              배정된 노선이 없습니다.{" "}
              <Link
                href="/routes/new"
                className="text-primary font-medium underline"
              >
                새 노선 추가
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {routes.map((r) => (
                <li key={r.id}>
                  <Link
                    href={`/dashboard/analytics/routes/${r.id}?range=30d`}
                    className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          r.direction === "PICKUP"
                            ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                            : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                        }
                      >
                        {DIRECTION_LABEL[r.direction]}
                      </span>
                      <span className="text-sm font-medium">{r.name}</span>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">
                      정류장 {r._count.stops}개 · 학생 {r._count.students}명
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 최근 30일 운행 기록 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 30일 운행 기록</CardTitle>
          <CardDescription>
            최근 시작된 운행 30개. 행 클릭 시 운행 상세로.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {trips.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              30일 내 운행 기록이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {tripStatsList.map(({ trip: t, stats }) => (
                <li key={t.id}>
                  <Link
                    href={`/dashboard/trip/${t.id}`}
                    className="hover:bg-muted/50 flex flex-wrap items-start justify-between gap-2 px-4 py-3 transition-colors"
                  >
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                      <span
                        className={
                          t.route.direction === "PICKUP"
                            ? "bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                            : "bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                        }
                      >
                        {DIRECTION_LABEL[t.route.direction]}
                      </span>
                      <span className="text-sm font-extrabold tracking-tight">
                        {fmtDateKst(t.startedAt)}
                      </span>
                      <span className="text-muted-foreground text-xs font-medium">
                        {fmtTimeKst(t.startedAt)}~{fmtTimeKst(t.endedAt)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        · {t.route.name} · {t.driver.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                      {formatDuration(stats.durationSec)} ·{" "}
                      {stats.distanceKm.toFixed(2)}km · {stats.avgSpeedKmh}
                      km/h
                      {t.events.length > 0 ? (
                        <>
                          {" "}
                          ·{" "}
                          <span className="text-destructive font-bold">
                            미탑승 {t.events.length}
                          </span>
                        </>
                      ) : null}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 안전점검 미흡 운행 (KIDS만) */}
      {isKids ? (
        <Card>
          <CardHeader>
            <CardTitle>안전점검 미흡 운행</CardTitle>
            <CardDescription>
              안전띠 또는 하차 확인이 미완료인 30일 내 운행.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {safetyFailTrips.length === 0 ? (
              <p className="text-muted-foreground p-6 text-sm">
                미흡 운행 없음. 모든 KIDS 운행이 안전점검을 완료했습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {safetyFailTrips.map((t) => {
                  const items: string[] = [];
                  if (!t.safetyCheck?.seatbeltAllOk)
                    items.push("안전띠 미확인");
                  if (!t.safetyCheck?.allAlightedOk)
                    items.push("하차 미확인");
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/trip/${t.id}`}
                        className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-destructive/10 text-destructive rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                            {items.join(" · ")}
                          </span>
                          <span className="text-sm font-medium">
                            {fmtDateKst(t.startedAt)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            · {t.route.name} · {t.driver.name}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
