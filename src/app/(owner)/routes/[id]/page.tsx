import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Bus, Edit3, MapPin, Users, Calendar } from "lucide-react";

import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { studentTerm } from "@/lib/i18n/org-terms";

// W24-C P2 C4: 노선 360° view detail. W21 owner detail 패턴 (학생·차량·정류장·기사·보호자) 일관.
//
// list page에서 행 클릭 → 이 페이지 진입.
// 30일 운행 통계 + 정류장 list + 학생 list + 차량 cross-link.

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

const WEEKDAY_NAMES = ["월", "화", "수", "목", "금", "토", "일"] as const;

function decodeWeekdays(bitmask: number): string[] {
  return WEEKDAY_NAMES.filter((_, i) => (bitmask & (1 << i)) !== 0);
}

export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(me.org.type);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [route, tripStats, noShowCount] = await Promise.all([
    db.route.findFirst({
      where: { id, vehicle: { orgId } },
      include: {
        vehicle: { select: { id: true, plate: true, mode: true } },
        stops: {
          orderBy: { order: "asc" },
          include: {
            stop: {
              select: { id: true, name: true, address: true, lat: true, lng: true },
            },
          },
        },
        students: {
          include: {
            student: { select: { id: true, name: true, school: true } },
            stop: { select: { id: true, name: true } },
          },
        },
      },
    }),
    db.trip.groupBy({
      by: ["endedAt"],
      where: { routeId: id, date: { gte: thirtyDaysAgo } },
      _count: true,
    }),
    db.boardingEvent.count({
      where: {
        type: { in: ["NO_SHOW", "NO_DROPOFF"] },
        trip: { routeId: id, date: { gte: thirtyDaysAgo } },
      },
    }),
  ]);

  if (!route) notFound();

  const totalTrips = tripStats.reduce((acc, t) => acc + t._count, 0);
  const completedTrips = tripStats
    .filter((t) => t.endedAt !== null)
    .reduce((acc, t) => acc + t._count, 0);
  const isKids = route.vehicle.mode === "KIDS";
  const weekdayLabels = decodeWeekdays(route.weekdays);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href="/routes"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="노선 list로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          노선 상세
        </p>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-[0.05em] uppercase ${
                route.direction === "PICKUP"
                  ? "bg-success-soft text-success"
                  : "bg-info-soft text-info"
              }`}
            >
              {DIRECTION_LABEL[route.direction]}
            </span>
            {isKids ? (
              <span className="bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-[0.05em]">
                어린이용
              </span>
            ) : (
              <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-[0.05em]">
                일반용
              </span>
            )}
            <span className="text-muted-foreground text-[11px] font-bold">
              {weekdayLabels.length === 0 ? "요일 미지정" : weekdayLabels.join("·")}
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-black tracking-tight">
            {route.name}
          </h1>
          <p className="text-muted-foreground mt-1 text-xs font-semibold">
            <Link
              href={`/vehicles/${route.vehicle.id}`}
              className="hover:text-info hover:underline"
            >
              {route.vehicle.plate}
            </Link>{" "}
            · {isKids ? "어린이용 차량" : "일반 차량"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href={`/routes/${route.id}/edit`}>
              <Edit3 className="mr-1.5 h-3.5 w-3.5" />
              편집
            </Link>
          </Button>
        </div>
      </div>

      {/* 30일 통계 4-grid */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">최근 30일</h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            노선·차량·기사 활동 한눈에. 클릭하면 상세 분석으로 이동.
          </p>
        </div>
        <div className="bg-border grid grid-cols-2 gap-px lg:grid-cols-4">
          <StatCell
            icon={MapPin}
            label="정류장"
            value={route.stops.length}
            unit="개"
          />
          <StatCell
            icon={Users}
            label={term}
            value={route.students.length}
            unit="명"
          />
          <StatCell
            icon={Calendar}
            label="총 운행"
            value={totalTrips}
            unit="회"
            sub={`완료 ${completedTrips}`}
          />
          <StatCell
            icon={Bus}
            label="미탑승·미하차"
            value={noShowCount}
            unit="건"
            tone={noShowCount > 0 ? "destructive" : "muted"}
          />
        </div>
      </section>

      {/* 정류장 list */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">
            정류장 ({route.stops.length})
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            {DIRECTION_LABEL[route.direction]} 순서. 정류장 클릭 → 상세 진입.
          </p>
        </div>
        {route.stops.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm font-medium">
            등록된 정류장이 없어요. 편집에서 추가해 주세요.
          </p>
        ) : (
          <ul className="divide-y">
            {route.stops.map((rs) => (
              <li key={rs.id}>
                <Link
                  href={`/stops/${rs.stop.id}`}
                  className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 font-mono text-[11px] font-extrabold">
                    {rs.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold tracking-tight">
                      {rs.stop.name}
                    </p>
                    {rs.stop.address ? (
                      <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-medium">
                        {rs.stop.address}
                      </p>
                    ) : null}
                  </div>
                  <span className="text-muted-foreground inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
                    {rs.scheduledAt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* 학생 list */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">
            {term} ({route.students.length})
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            이 노선에 배정된 {term}. {term} 클릭 → 360° 상세.
          </p>
        </div>
        {route.students.length === 0 ? (
          <p className="text-muted-foreground p-6 text-center text-sm font-medium">
            배정된 {term}이 없어요. 편집에서 추가해 주세요.
          </p>
        ) : (
          <ul className="divide-y">
            {route.students.map((rs) => (
              <li key={rs.id}>
                <Link
                  href={`/students/${rs.student.id}`}
                  className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-extrabold tracking-tight">
                      {rs.student.name}
                    </p>
                    {rs.student.school ? (
                      <p className="text-muted-foreground mt-0.5 truncate text-[11px] font-medium">
                        {rs.student.school}
                      </p>
                    ) : null}
                  </div>
                  <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-bold">
                    <MapPin className="mr-1 inline h-3 w-3" />
                    {rs.stop.name}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}

const TONE_CLS: Record<"info" | "muted" | "destructive", string> = {
  info: "text-info",
  muted: "text-muted-foreground",
  destructive: "text-destructive",
};

function StatCell({
  icon: Icon,
  label,
  value,
  unit,
  sub,
  tone = "info",
}: {
  icon: typeof MapPin;
  label: string;
  value: number;
  unit: string;
  sub?: string;
  tone?: "info" | "muted" | "destructive";
}) {
  return (
    <div className="bg-card px-4 py-4">
      <div className="flex items-center gap-1.5">
        <Icon className={`h-3.5 w-3.5 ${TONE_CLS[tone]}`} />
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.08em] uppercase">
          {label}
        </p>
      </div>
      <p
        className={`mt-1.5 text-2xl font-black tabular-nums ${TONE_CLS[tone]}`}
      >
        {value}
        <span className="text-muted-foreground ml-1 text-xs font-bold">
          {unit}
        </span>
      </p>
      {sub ? (
        <p className="text-muted-foreground mt-0.5 text-[11px] font-bold">
          {sub}
        </p>
      ) : null}
    </div>
  );
}
