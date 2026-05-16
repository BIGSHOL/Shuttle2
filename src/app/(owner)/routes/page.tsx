import Link from "next/link";
import { Bus, MapPin, Power, Route as RouteIcon, Users } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

import { DeleteRouteButton } from "./_components/delete-route-button";
import { RoutesToolbar } from "./_components/routes-toolbar";
import { ToggleActiveButton } from "./_components/toggle-active-button";
import {
  listRoutes,
  parseRoutesSearchParams,
  type RawSearchParams,
} from "./_lib/query";
import { formatDirection, formatWeekdays } from "./_lib/weekdays";

export default async function RoutesPage({
  searchParams,
}: {
  searchParams: Promise<RawSearchParams>;
}) {
  const orgId = await getOrgId();
  const params = parseRoutesSearchParams(await searchParams);

  // KPI는 필터 무관 전체 기준. 행 list만 필터 적용.
  const [filteredRoutes, totalRoutes, totalKids, totalActive, totalStops, totalAssigned, runningTripCount] =
    await Promise.all([
      listRoutes(orgId, params),
      db.route.count({ where: { vehicle: { orgId } } }),
      db.route.count({ where: { vehicle: { orgId, mode: "KIDS" } } }),
      db.route.count({ where: { vehicle: { orgId }, isActive: true } }),
      db.stop.count({ where: { orgId } }),
      db.routeStudent.count({ where: { route: { vehicle: { orgId } } } }),
      db.trip.count({
        where: {
          vehicle: { orgId },
          startedAt: { not: null },
          endedAt: null,
        },
      }),
    ]);

  const inactiveRouteCount = totalRoutes - totalActive;
  const filteredHasNone = filteredRoutes.length === 0 && totalRoutes > 0;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">노선</h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            등원·하원 노선을 차량에 묶고, 정류장 순서·시각을 관리합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/routes/new">+ 새 노선</Link>
        </Button>
      </div>

      {/* KPI strip */}
      <KpiStrip cols={5}>
        <KpiStripCell
          label="총 노선"
          value={totalRoutes}
          subtext={`어린이용 ${totalKids} · 일반 ${totalRoutes - totalKids}`}
          Icon={RouteIcon}
          tone="info"
        />
        <KpiStripCell
          label="사용 중"
          value={totalActive}
          subtext={
            inactiveRouteCount > 0 ? (
              <Link
                href="/routes?active=inactive"
                className="hover:text-warning underline-offset-2 hover:underline"
              >
                미사용 {inactiveRouteCount}개
              </Link>
            ) : (
              "전체 활성"
            )
          }
          Icon={Power}
          tone={inactiveRouteCount > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="총 정류장"
          value={totalStops}
          subtext={
            totalRoutes > 0
              ? `평균 ${(totalStops / totalRoutes).toFixed(1)}개 / 노선`
              : "-"
          }
          Icon={MapPin}
          tone="muted"
        />
        <KpiStripCell
          label="배정 학생"
          value={totalAssigned}
          subtext="정류장 그룹 합산"
          Icon={Users}
          tone="muted"
        />
        <KpiStripCell
          label="현재 운행"
          value={runningTripCount}
          subtext={runningTripCount > 0 ? "진행 중" : "운행 없음"}
          Icon={Bus}
          tone={runningTripCount > 0 ? "bus" : "muted"}
        />
      </KpiStrip>

      {/* 검색·필터 toolbar (stops-toolbar 디자인과 통일) */}
      {totalRoutes > 0 ? <RoutesToolbar current={params} /> : null}

      {totalRoutes === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록된 노선이 없습니다</CardTitle>
            <CardDescription>
              차량과 정류장을 먼저 등록한 뒤, 노선을 만들어 정류장을 순서대로
              연결하세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/routes/new">+ 새 노선 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : filteredHasNone ? (
        <Card>
          <CardHeader>
            <CardTitle>검색 결과가 없습니다</CardTitle>
            <CardDescription>
              검색어·필터를 조정하거나 초기화 버튼을 눌러 주세요.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/routes">필터 초기화</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-muted-foreground text-xs">
            {filteredRoutes.length}개 표시 · 전체 {totalRoutes}개
          </p>

          {/* 모바일: 카드 stack */}
          <ul className="space-y-2 lg:hidden">
            {filteredRoutes.map((r) => {
              const dirCls =
                r.direction === "PICKUP"
                  ? "bg-success-soft text-success"
                  : "bg-info-soft text-info";
              const isKids = r.vehicle.mode === "KIDS";
              return (
                <li key={r.id}>
                  <div
                    className={`bg-card flex items-stretch gap-0 rounded-lg border shadow-sm ${
                      r.isActive ? "" : "opacity-60"
                    }`}
                  >
                    <span
                      className={`${isKids && r.isActive ? "bg-bus" : "bg-muted"} w-1 shrink-0 rounded-l-lg`}
                      aria-hidden
                    />
                    <Link
                      href={`/routes/${r.id}`}
                      className="hover:bg-muted/40 min-w-0 flex-1 p-3.5 transition-colors"
                    >
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className={`${dirCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                        >
                          {formatDirection(r.direction)}
                        </span>
                        {isKids ? (
                          <span className="bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                            어린이용
                          </span>
                        ) : null}
                        {!r.isActive ? (
                          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide">
                            미사용
                          </span>
                        ) : null}
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {r.name}
                        </h3>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                        {r.vehicle.plate} · {formatWeekdays(r.weekdays)} ·
                        정류장 {r._count.stops}개 · 학생 {r._count.students}명
                      </p>
                    </Link>
                    <div className="flex shrink-0 flex-col items-end gap-1.5 p-3.5">
                      <ToggleActiveButton id={r.id} isActive={r.isActive} />
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/routes/${r.id}/edit`}>편집</Link>
                      </Button>
                      <DeleteRouteButton id={r.id} name={r.name} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* 데스크톱: 표 — 좌측 색 bar로 KIDS·등하원 시각화 */}
          <Card className="hidden py-0 lg:block">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>노선</TableHead>
                    <TableHead className="w-24">유형</TableHead>
                    <TableHead className="w-32">차량</TableHead>
                    <TableHead className="w-28">요일</TableHead>
                    <TableHead className="w-24">정류장</TableHead>
                    <TableHead className="w-24">학생</TableHead>
                    <TableHead className="w-40 pr-[18px] text-right">
                      관리
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredRoutes.map((r) => {
                    const isKids = r.vehicle.mode === "KIDS";
                    return (
                      <TableRow
                        key={r.id}
                        className={`hover:bg-muted/50 ${r.isActive ? "" : "opacity-60"}`}
                      >
                        <TableCell className="p-0">
                          <Link
                            href={`/routes/${r.id}`}
                            className="flex items-stretch gap-0"
                          >
                            <span
                              className={`${isKids && r.isActive ? "bg-bus" : "bg-muted"} w-1 shrink-0`}
                              aria-hidden
                            />
                            <span className="flex-1 px-3 py-2.5 font-extrabold tracking-tight">
                              {r.name}
                              {!r.isActive ? (
                                <span className="bg-muted text-muted-foreground ml-2 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                                  미사용
                                </span>
                              ) : null}
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link
                            href={`/routes/${r.id}`}
                            className="block px-2 py-2.5"
                          >
                            <span
                              className={
                                r.direction === "PICKUP"
                                  ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                                  : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                              }
                            >
                              {formatDirection(r.direction)}
                            </span>
                            {isKids ? (
                              <span className="bg-bus text-bus-foreground ml-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold">
                                어린이용
                              </span>
                            ) : null}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground p-0 text-sm">
                          <Link
                            href={`/routes/${r.id}`}
                            className="block px-2 py-2.5"
                          >
                            {r.vehicle.plate}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground p-0 text-sm">
                          <Link
                            href={`/routes/${r.id}`}
                            className="block px-2 py-2.5"
                          >
                            {formatWeekdays(r.weekdays)}
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link
                            href={`/routes/${r.id}`}
                            className="block px-2 py-2.5 font-bold tabular-nums"
                          >
                            {r._count.stops}
                            <span className="text-muted-foreground text-xs font-medium">
                              개
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="p-0">
                          <Link
                            href={`/routes/${r.id}`}
                            className="block px-2 py-2.5 font-bold tabular-nums"
                          >
                            {r._count.students}
                            <span className="text-muted-foreground text-xs font-medium">
                              명
                            </span>
                          </Link>
                        </TableCell>
                        <TableCell className="space-x-1 pr-[18px] text-right">
                          <ToggleActiveButton
                            id={r.id}
                            isActive={r.isActive}
                            showLabel={false}
                          />
                          <Button asChild size="sm" variant="outline">
                            <Link href={`/routes/${r.id}/edit`}>편집</Link>
                          </Button>
                          <DeleteRouteButton id={r.id} name={r.name} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </main>
  );
}
