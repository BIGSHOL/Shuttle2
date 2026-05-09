import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Bus,
  Clock,
  MapPin,
  Pencil,
  Route as RouteIcon,
  Users,
} from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

import { formatDirection, formatWeekdays } from "../_lib/weekdays";

// 노선 360° read-only 상세. ground truth `Owner Route Detail.html` 패턴:
// 헤더(노선·KIDS·차량·정원) + KPI 4 + 정류장 timeline + 학생 list.
// 편집은 `/routes/[id]/edit`로 분리 (이미 존재). 여기는 운영 monitoring·확인용.
export default async function RouteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner();
  const orgId = await getOrgId();

  const route = await db.route.findFirst({
    where: { id, vehicle: { orgId } },
    include: {
      vehicle: { select: { plate: true, mode: true } },
      stops: {
        orderBy: { order: "asc" },
        include: {
          stop: { select: { id: true, name: true, address: true } },
        },
      },
      students: {
        include: {
          student: {
            select: { id: true, name: true, birthYear: true, school: true },
          },
          stop: { select: { id: true, name: true } },
        },
      },
    },
  });

  if (!route) notFound();

  // 정류장 시각: 첫·끝 scheduledAt 기준 예상 운행시간.
  const firstAt = route.stops[0]?.scheduledAt ?? "—";
  const lastAt = route.stops[route.stops.length - 1]?.scheduledAt ?? "—";
  const elapsedLabel = computeElapsed(firstAt, lastAt);

  const isKids = route.vehicle.mode === "KIDS";
  const dirCls =
    route.direction === "PICKUP"
      ? "bg-success-soft text-success"
      : "bg-info-soft text-info";

  // 30일 정시율 KPI — Trip 의 startedAt vs scheduledAt 비교는 데이터 무거우므로
  // 단순 운행 횟수 기반 placeholder. (실제 정시율 계산은 W19 trip-stats utility
  // 활용 가능 — 후속 phase에서 통합).
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);
  const tripCount30d = await db.trip.count({
    where: { routeId: id, date: { gte: thirtyDaysAgo } },
  });

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 뒤로가기 */}
      <Button asChild variant="ghost" size="sm" className="-ml-2 self-start">
        <Link href="/routes" className="flex items-center gap-1.5">
          <ArrowLeft className="h-3.5 w-3.5" />
          <span className="text-xs font-bold">노선 목록</span>
        </Link>
      </Button>

      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide",
                dirCls,
              )}
            >
              {formatDirection(route.direction)}
            </span>
            {isKids ? (
              <span className="bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide">
                어린이용
              </span>
            ) : null}
          </div>
          <h2 className="mt-2 text-2xl font-black tracking-tight lg:text-3xl">
            {route.name}
          </h2>
          <p className="text-muted-foreground mt-1.5 text-xs font-semibold lg:text-sm">
            <span className="font-bold">{route.vehicle.plate}</span> ·{" "}
            {formatWeekdays(route.weekdays)} · 정류장 {route.stops.length}개 ·
            학생 {route.students.length}명
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <Button asChild variant="outline" size="sm">
            <Link
              href={`/routes/${route.id}/edit`}
              className="flex items-center gap-1.5"
            >
              <Pencil className="h-3.5 w-3.5" />
              편집
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI 4 */}
      <KpiStrip cols={4}>
        <KpiStripCell
          label="정류장"
          value={`${route.stops.length}개`}
          subtext={firstAt !== "—" ? `${firstAt} 출발` : "시각 미정"}
          Icon={MapPin}
          tone="info"
        />
        <KpiStripCell
          label="예상 운행시간"
          value={elapsedLabel}
          subtext={
            firstAt !== "—" && lastAt !== "—" ? `${firstAt} → ${lastAt}` : "—"
          }
          Icon={Clock}
          tone="muted"
        />
        <KpiStripCell
          label="배정 학생"
          value={`${route.students.length}명`}
          subtext={isKids ? "어린이용 노선" : "일반 노선"}
          Icon={Users}
          tone={isKids ? "bus" : "muted"}
        />
        <KpiStripCell
          label="30일 운행"
          value={`${tripCount30d}건`}
          subtext="최근 30일 누적"
          Icon={Bus}
          tone="muted"
        />
      </KpiStrip>

      {/* 정류장 timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <RouteIcon className="text-muted-foreground h-4 w-4" />
            정류장 순서
          </CardTitle>
        </CardHeader>
        <CardContent>
          {route.stops.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              아직 정류장이 없습니다.{" "}
              <Link
                href={`/routes/${route.id}/edit`}
                className="text-foreground font-semibold underline"
              >
                편집 화면
              </Link>
              에서 추가하세요.
            </p>
          ) : (
            <ol className="border-l-2 border-dashed pl-6 ml-2 space-y-4">
              {route.stops.map((rs, idx) => {
                const isFirst = idx === 0;
                const isLast = idx === route.stops.length - 1;
                const count = route.students.filter(
                  (s) => s.stopId === rs.stop.id,
                ).length;
                return (
                  <li key={rs.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-[33px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 text-[10px] font-extrabold",
                        isFirst
                          ? "bg-success text-success-foreground border-success"
                          : isLast
                            ? "bg-foreground text-background border-foreground"
                            : "bg-bus text-bus-foreground border-bus-foreground/20",
                      )}
                      aria-hidden
                    >
                      {rs.order}
                    </span>
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h4 className="text-sm font-bold tracking-tight">
                        {rs.stop.name}
                        {isFirst ? (
                          <span className="text-success ml-1.5 text-[10px] font-extrabold tracking-wide uppercase">
                            출발
                          </span>
                        ) : null}
                        {isLast ? (
                          <span className="text-foreground ml-1.5 text-[10px] font-extrabold tracking-wide uppercase">
                            도착
                          </span>
                        ) : null}
                      </h4>
                      <span className="text-muted-foreground tabular-nums text-xs font-bold">
                        {rs.scheduledAt}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      {rs.stop.address ?? "주소 미확인"}
                      {count > 0 ? (
                        <span className="text-foreground ml-2 font-bold">
                          · 학생 {count}명
                        </span>
                      ) : null}
                    </p>
                  </li>
                );
              })}
            </ol>
          )}
        </CardContent>
      </Card>

      {/* 학생 list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="text-muted-foreground h-4 w-4" />이 노선 학생 (
            {route.students.length}명)
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {route.students.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              아직 배정된 학생이 없습니다.{" "}
              <Link
                href="/students"
                className="text-foreground font-semibold underline"
              >
                학생 관리
              </Link>
              에서 노선에 배정하세요.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>학생</TableHead>
                  <TableHead className="w-32">학교</TableHead>
                  <TableHead>정류장</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {route.students.map((rs) => {
                  const ageLabel = `${new Date().getUTCFullYear() - rs.student.birthYear}세`;
                  return (
                    <TableRow key={rs.id} className="hover:bg-muted/50">
                      <TableCell className="p-0">
                        <Link
                          href={`/students/${rs.student.id}`}
                          className="flex items-baseline gap-1.5 px-2 py-2.5"
                        >
                          <span className="font-extrabold tracking-tight">
                            {rs.student.name}
                          </span>
                          <span className="text-muted-foreground text-xs font-medium">
                            {ageLabel}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground p-0 text-sm">
                        <Link
                          href={`/students/${rs.student.id}`}
                          className="block px-2 py-2.5"
                        >
                          {rs.student.school ?? "—"}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground p-0 text-sm">
                        <Link
                          href={`/students/${rs.student.id}`}
                          className="block px-2 py-2.5"
                        >
                          {rs.stop?.name ?? "—"}
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

// "HH:mm" 두 시각 간 분 차이 → "Nm" or "Nh Mm" 라벨.
function computeElapsed(from: string, to: string): string {
  if (from === "—" || to === "—") return "—";
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  if (
    !Number.isFinite(fh) ||
    !Number.isFinite(fm) ||
    !Number.isFinite(th) ||
    !Number.isFinite(tm)
  ) {
    return "—";
  }
  const mins = th * 60 + tm - (fh * 60 + fm);
  if (mins <= 0) return "—";
  if (mins < 60) return `${mins}분`;
  return `${Math.floor(mins / 60)}시간 ${mins % 60}분`;
}
