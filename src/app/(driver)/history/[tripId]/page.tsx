import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  ArrowLeft,
  Bus,
  Check,
  Clock,
  MapPin,
  Users,
  X,
} from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { computeTripStats } from "@/lib/geo/trip-stats";
import { cn } from "@/lib/utils";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function fmtKstHHmm(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function fmtKstDate(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return `${kst.getUTCMonth() + 1}월 ${kst.getUTCDate()}일`;
}

// W25 P1-C: ground truth Driver History.html §02 — 운행 회차 상세.
// driverId 본인 trip만. KPI 3 + 안전점검 + 정류장 timeline + 학생 list.
export default async function DriverHistoryDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/history");
  if (user.staff.role !== "DRIVER") redirect("/login?redirectTo=/history");

  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      driverId: user.staff.id,
      vehicle: { orgId: user.org.id },
    },
    include: {
      route: {
        include: {
          stops: {
            orderBy: { order: "asc" },
            include: {
              stop: {
                select: { id: true, name: true, lat: true, lng: true },
              },
            },
          },
          students: {
            include: {
              student: {
                select: { id: true, name: true, birthYear: true },
              },
              stop: { select: { id: true, name: true } },
            },
          },
        },
      },
      vehicle: { select: { plate: true, mode: true } },
      safetyCheck: true,
      events: { orderBy: { at: "asc" } },
    },
  });

  if (!trip) notFound();

  const isFinished = !!trip.endedAt;

  // 운행 통계 (W19 utility)
  const pings = isFinished
    ? await db.locationPing.findMany({
        where: { tripId },
        orderBy: { recordedAt: "asc" },
        select: {
          lat: true,
          lng: true,
          recordedAt: true,
          source: true,
          speed: true,
        },
      })
    : [];
  const stats = computeTripStats(pings, trip.startedAt, trip.endedAt);

  // 학생 탑승·미탑승 카운트
  const boardSet = new Set(
    trip.events.filter((e) => e.type === "BOARD").map((e) => e.studentId),
  );
  const noShowSet = new Set(
    trip.events.filter((e) => e.type === "NO_SHOW").map((e) => e.studentId),
  );
  const totalStudents = trip.route.students.length;
  const boardedCount = boardSet.size;
  const noShowCount = noShowSet.size;

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      {/* 뒤로 + 헤더 */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/history" className="flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">운행 이력</span>
        </Link>
      </Button>
      <div>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
            {DIRECTION_LABEL[trip.route.direction]}
          </span>
          {trip.vehicle.mode === "KIDS" ? (
            <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
              어린이용
            </span>
          ) : null}
          {isFinished ? (
            <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
              완료
            </span>
          ) : (
            <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
              운행 중
            </span>
          )}
        </div>
        <h2 className="mt-1.5 text-2xl font-black tracking-tight">
          {trip.route.name} · {fmtKstDate(trip.date)}
        </h2>
        <p className="text-muted-foreground mt-1 text-xs font-semibold tabular-nums">
          {trip.startedAt ? fmtKstHHmm(trip.startedAt) : "—"} 출발
          {trip.endedAt ? ` → ${fmtKstHHmm(trip.endedAt)} 도착` : ""}
        </p>
      </div>

      {/* KPI 3 */}
      <KpiStrip cols={3}>
        <KpiStripCell
          label="탑승"
          value={`${boardedCount} / ${totalStudents}`}
          subtext={
            noShowCount > 0
              ? `미탑승 ${noShowCount}건`
              : "결석·미탑승 없음"
          }
          Icon={Users}
          tone={noShowCount > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="주행"
          value={stats.distanceKm > 0 ? `${stats.distanceKm}km` : "—"}
          subtext={
            stats.durationSec > 0
              ? `${Math.round(stats.durationSec / 60)}분`
              : "데이터 없음"
          }
          Icon={MapPin}
          tone="info"
        />
        <KpiStripCell
          label="평균 속도"
          value={
            stats.avgSpeedKmh > 0 ? `${Math.round(stats.avgSpeedKmh)}km/h` : "—"
          }
          subtext={
            stats.maxSpeedKmh != null && stats.maxSpeedKmh > 0
              ? `최고 ${Math.round(stats.maxSpeedKmh)}`
              : "—"
          }
          Icon={Bus}
          tone="muted"
        />
      </KpiStrip>

      {/* 안전점검 (KIDS 모드만) */}
      {trip.vehicle.mode === "KIDS" ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">안전점검</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {trip.safetyCheck ? (
              <ul className="space-y-1.5 text-sm">
                <SafetyRow
                  ok={trip.safetyCheck.seatbeltAllOk}
                  label="좌석 안전띠 전원 확인"
                  at={trip.safetyCheck.seatbeltCheckedAt}
                />
                <SafetyRow
                  ok={trip.safetyCheck.helperPresent}
                  label="동승보호자 동승 확인"
                  at={null}
                />
                <SafetyRow
                  ok={trip.safetyCheck.allAlightedOk}
                  label="운행 종료 후 전원 하차 확인"
                  at={trip.safetyCheck.alightCheckedAt}
                />
              </ul>
            ) : (
              <div className="bg-destructive/5 border-destructive/30 rounded-md border p-3">
                <p className="text-destructive flex items-center gap-1.5 text-sm font-extrabold">
                  <X className="h-3.5 w-3.5" />
                  안전점검 미입력
                </p>
                <p className="text-muted-foreground mt-1 text-[11px] font-semibold">
                  KIDS 모드는 안전점검이 의무입니다. 분기 안전운행기록 PDF에
                  미입력으로 기록됩니다.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* 정류장 timeline */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            정류장 ({trip.route.stops.length}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="border-l-2 border-dashed pl-6 ml-2 space-y-3">
            {trip.route.stops.map((rs) => {
              const studentsAtStop = trip.route.students.filter(
                (s) => s.stopId === rs.stop.id,
              );
              const boardedAtStop = studentsAtStop.filter((s) =>
                boardSet.has(s.student.id),
              ).length;
              return (
                <li key={rs.id} className="relative">
                  <span
                    className="bg-bus text-bus-foreground border-bus-foreground/20 absolute -left-[33px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-extrabold"
                    aria-hidden
                  >
                    {rs.order}
                  </span>
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h4 className="text-sm font-bold tracking-tight">
                      {rs.stop.name}
                    </h4>
                    <span className="text-muted-foreground tabular-nums text-xs font-bold">
                      {rs.scheduledAt}
                    </span>
                  </div>
                  {studentsAtStop.length > 0 ? (
                    <p className="text-muted-foreground mt-0.5 text-[11px] font-semibold">
                      탑승 {boardedAtStop}/{studentsAtStop.length}명
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </CardContent>
      </Card>

      {/* 학생 list */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            탑승 학생 ({totalStudents}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <ul className="divide-y">
            {trip.route.students.map((rs) => {
              const isBoard = boardSet.has(rs.student.id);
              const isNoShow = noShowSet.has(rs.student.id);
              return (
                <li
                  key={rs.id}
                  className="flex items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold tracking-tight">
                      {rs.student.name}
                    </p>
                    <p className="text-muted-foreground text-[11px] font-semibold">
                      {rs.stop?.name ?? "정류장 미배정"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide",
                      isBoard
                        ? "bg-success-soft text-success"
                        : isNoShow
                          ? "bg-destructive/10 text-destructive"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {isBoard ? "탑승" : isNoShow ? "미탑승" : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </main>
  );
}

function SafetyRow({
  ok,
  label,
  at,
}: {
  ok: boolean;
  label: string;
  at: Date | null;
}) {
  return (
    <li className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2">
        {ok ? (
          <Check className="text-success h-3.5 w-3.5" />
        ) : (
          <X className="text-destructive h-3.5 w-3.5" />
        )}
        <span className="text-sm font-semibold">{label}</span>
      </span>
      {at ? (
        <span className="text-muted-foreground tabular-nums text-[11px] font-bold">
          <Clock className="mr-0.5 inline h-3 w-3" />
          {fmtKstHHmm(at)}
        </span>
      ) : null}
    </li>
  );
}
