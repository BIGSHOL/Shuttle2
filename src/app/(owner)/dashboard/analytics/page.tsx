import Link from "next/link";

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
import { getOrgId, requireOwner } from "@/lib/auth/session";
import {
  aggregateByDriver,
  aggregateByRoute,
  type AnalyticsRange,
} from "@/lib/analytics/trip-aggregates";
import { formatDuration } from "@/lib/geo/trip-stats";
import { cn } from "@/lib/utils";

// W19-E: 학원장 운행 분석 — 노선별·기사별 평균 통계.
// LocationPing 기반 거리·속도, BoardingEvent 기반 미탑승 건수.

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "90d", label: "최근 90일" },
];

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireOwner();
  const orgId = await getOrgId();
  const params = await searchParams;
  const range: AnalyticsRange =
    params.range === "7d" || params.range === "90d" ? params.range : "30d";

  const [routeRows, driverRows] = await Promise.all([
    aggregateByRoute(orgId, range),
    aggregateByDriver(orgId, range),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">운행 분석</h2>
          <p className="text-muted-foreground text-sm">
            노선별·기사별 평균 운행 시간과 속도. GPS LocationPing 기반.
          </p>
        </div>
        <nav
          aria-label="기간 선택"
          className="bg-muted/50 inline-flex shrink-0 self-start rounded-md p-0.5 sm:self-end"
        >
          {RANGE_OPTIONS.map((opt) => {
            const active = opt.value === range;
            return (
              <Link
                key={opt.value}
                href={`/dashboard/analytics?range=${opt.value}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-bold tracking-tight transition-colors",
                  active
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {opt.label}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 노선별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>노선별 평균</CardTitle>
          <CardDescription>
            운행 횟수 많은 순. 한 번도 운행 안 한 노선은 표시 안 됨.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {routeRows.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              해당 기간에 시작된 운행이 없습니다.
            </p>
          ) : (
            <>
              {/* 모바일 카드 */}
              <ul className="space-y-2 p-3 lg:hidden">
                {routeRows.map((r) => {
                  const dirCls =
                    r.direction === "PICKUP"
                      ? "bg-success-soft text-success"
                      : "bg-info-soft text-info";
                  return (
                    <li key={r.routeId}>
                      <div className="bg-card rounded-lg border p-3.5 shadow-sm">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span
                            className={`${dirCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                          >
                            {DIRECTION_LABEL[r.direction]}
                          </span>
                          <h3 className="text-sm font-extrabold tracking-tight">
                            {r.routeName}
                          </h3>
                          <span className="text-muted-foreground text-[10px] font-medium">
                            {r.tripCount}회
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                          평균 {formatDuration(r.avgDurationSec)} ·{" "}
                          {r.avgDistanceKm.toFixed(2)}km · {r.avgSpeedKmh}km/h
                          {r.noShowCount > 0 ? (
                            <>
                              {" "}
                              · <span className="text-destructive">
                                미탑승 {r.noShowCount}
                              </span>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* 데스크톱 표 */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>노선</TableHead>
                      <TableHead className="w-20">방향</TableHead>
                      <TableHead className="w-24">운행</TableHead>
                      <TableHead className="w-28">평균 시간</TableHead>
                      <TableHead className="w-28">평균 거리</TableHead>
                      <TableHead className="w-28">평균 속도</TableHead>
                      <TableHead className="pr-[18px] text-right">
                        미탑승
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {routeRows.map((r) => (
                      <TableRow key={r.routeId}>
                        <TableCell className="font-medium">
                          {r.routeName}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              r.direction === "PICKUP"
                                ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                                : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                            }
                          >
                            {DIRECTION_LABEL[r.direction]}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.tripCount}회
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDuration(r.avgDurationSec)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.avgDistanceKm.toFixed(2)} km
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {r.avgSpeedKmh} km/h
                        </TableCell>
                        <TableCell className="pr-[18px] text-right font-mono text-sm">
                          {r.noShowCount > 0 ? (
                            <span className="text-destructive font-bold">
                              {r.noShowCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* 기사별 통계 */}
      <Card>
        <CardHeader>
          <CardTitle>기사별 평균</CardTitle>
          <CardDescription>
            기사 1인당 운행 횟수·평균 속도·시간. 미탑승 발생 누적 표시.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {driverRows.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              해당 기간에 운행 기록이 없습니다.
            </p>
          ) : (
            <>
              {/* 모바일 카드 */}
              <ul className="space-y-2 p-3 lg:hidden">
                {driverRows.map((d) => (
                  <li key={d.driverId}>
                    <div className="bg-card rounded-lg border p-3.5 shadow-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {d.driverName}
                        </h3>
                        <span className="text-muted-foreground text-[10px] font-medium">
                          {d.tripCount}회
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                        평균 {formatDuration(d.avgDurationSec)} ·{" "}
                        {d.avgDistanceKm.toFixed(2)}km · {d.avgSpeedKmh}km/h
                        {d.noShowCount > 0 ? (
                          <>
                            {" "}
                            · <span className="text-destructive">
                              미탑승 {d.noShowCount}
                            </span>
                          </>
                        ) : null}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>

              {/* 데스크톱 표 */}
              <div className="hidden lg:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>기사</TableHead>
                      <TableHead className="w-24">운행</TableHead>
                      <TableHead className="w-28">평균 시간</TableHead>
                      <TableHead className="w-28">평균 거리</TableHead>
                      <TableHead className="w-28">평균 속도</TableHead>
                      <TableHead className="pr-[18px] text-right">
                        미탑승
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {driverRows.map((d) => (
                      <TableRow key={d.driverId}>
                        <TableCell className="font-medium">
                          {d.driverName}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {d.tripCount}회
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {formatDuration(d.avgDurationSec)}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {d.avgDistanceKm.toFixed(2)} km
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {d.avgSpeedKmh} km/h
                        </TableCell>
                        <TableCell className="pr-[18px] text-right font-mono text-sm">
                          {d.noShowCount > 0 ? (
                            <span className="text-destructive font-bold">
                              {d.noShowCount}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">0</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
