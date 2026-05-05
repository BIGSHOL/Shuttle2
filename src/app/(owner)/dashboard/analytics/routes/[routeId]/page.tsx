import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import {
  getRouteDetail,
  type AnalyticsRange,
} from "@/lib/analytics/trip-aggregates";
import { cn } from "@/lib/utils";

import {
  AnalyticsStatsCard,
  TripDetailList,
} from "../../_components/trip-detail-list";

const RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "7d", label: "최근 7일" },
  { value: "30d", label: "최근 30일" },
  { value: "90d", label: "최근 90일" },
];

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

export default async function RouteAnalyticsDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ routeId: string }>;
  searchParams: Promise<{ range?: string }>;
}) {
  await requireOwner();
  const orgId = await getOrgId();
  const { routeId } = await params;
  const sp = await searchParams;
  const range: AnalyticsRange =
    sp.range === "7d" || sp.range === "90d" ? sp.range : "30d";

  const { route, trips } = await getRouteDetail(orgId, routeId, range);
  if (!route) notFound();

  // 평균 통계 derive (route aggregate를 다시 만드는 대신 trips에서 in-place).
  const tripCount = trips.length;
  const totalDuration = trips.reduce((s, t) => s + t.durationSec, 0);
  const totalDistance = trips.reduce((s, t) => s + t.distanceKm, 0);
  const avgDurationSec = tripCount > 0 ? Math.round(totalDuration / tripCount) : 0;
  const avgDistanceKm =
    tripCount > 0 ? +(totalDistance / tripCount).toFixed(2) : 0;
  const avgSpeedKmh =
    totalDuration > 0
      ? +(totalDistance / (totalDuration / 3600)).toFixed(1)
      : 0;

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/dashboard/analytics?range=${range}`}
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="분석으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          노선 상세
        </p>
      </div>

      {/* 헤더 + 기간 selector */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                route.direction === "PICKUP"
                  ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                  : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
              }
            >
              {DIRECTION_LABEL[route.direction]}
            </span>
            <h2 className="text-2xl font-semibold">{route.name}</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            이 노선의 운행 기록 (선택 기간). 행을 클릭하면 운행 상세로 이동.
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
                href={`/dashboard/analytics/routes/${routeId}?range=${opt.value}`}
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

      {tripCount > 0 ? (
        <AnalyticsStatsCard
          title="기간 평균"
          description={`${tripCount}회 운행 기준 평균. 운행 시간·거리·속도.`}
          tripCount={tripCount}
          avgDurationSec={avgDurationSec}
          avgDistanceKm={avgDistanceKm}
          avgSpeedKmh={avgSpeedKmh}
        />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>운행 list</CardTitle>
          <CardDescription>
            최근 운행이 위. 클릭 시 해당 운행 상세 (실시간 위치·통계·정류장 진행).
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <TripDetailList trips={trips} variant="route" />
        </CardContent>
      </Card>
    </main>
  );
}
