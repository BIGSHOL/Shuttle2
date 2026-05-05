import Link from "next/link";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDuration } from "@/lib/geo/trip-stats";
import type { TripDetailRow } from "@/lib/analytics/trip-aggregates";

// W19-G: 노선 상세 / 기사 상세 페이지의 trip list 공유 컴포넌트.
// 각 행은 /dashboard/trip/[tripId] 로 링크. 모바일은 카드 stack, 데스크톱은 표.
//
// variant="route" 일 때는 컬럼이 [날짜·시각, 차량, 기사, 시간, 거리, 속도, 미탑승]
// variant="driver" 일 때는 컬럼이 [날짜·시각, 차량, 노선·방향, 시간, 거리, 속도, 미탑승]

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function fmtKstDate(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtKstHHmm(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export function TripDetailList({
  trips,
  variant,
}: {
  trips: TripDetailRow[];
  variant: "route" | "driver";
}) {
  if (trips.length === 0) {
    return (
      <p className="text-muted-foreground p-6 text-sm">
        해당 기간에 시작된 운행이 없습니다.
      </p>
    );
  }

  return (
    <>
      {/* 모바일/태블릿 카드 stack */}
      <ul className="space-y-2 p-3 lg:hidden">
        {trips.map((t) => {
          const dirCls =
            t.routeDirection === "PICKUP"
              ? "bg-success-soft text-success"
              : "bg-info-soft text-info";
          return (
            <li key={t.tripId}>
              <Link
                href={`/dashboard/trip/${t.tripId}`}
                className="hover:bg-muted/50 block rounded-lg border bg-card p-3.5 shadow-sm transition-colors"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {variant === "driver" ? (
                    <span
                      className={`${dirCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                    >
                      {DIRECTION_LABEL[t.routeDirection]}
                    </span>
                  ) : null}
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {fmtKstDate(t.date)}
                  </h3>
                  <span className="text-muted-foreground text-[10px] font-medium">
                    {fmtKstHHmm(t.startedAt)}~{fmtKstHHmm(t.endedAt)}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1.5 text-xs font-medium">
                  {variant === "route" ? `${t.driverName} · ` : `${t.routeName} · `}
                  {t.vehiclePlate} · {formatDuration(t.durationSec)} ·{" "}
                  {t.distanceKm.toFixed(2)}km · {t.avgSpeedKmh}km/h
                  {t.noShowCount > 0 ? (
                    <>
                      {" "}
                      ·{" "}
                      <span className="text-destructive">
                        미탑승 {t.noShowCount}
                      </span>
                    </>
                  ) : null}
                </p>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 데스크톱 표 — 각 행이 Link로 wrap */}
      <div className="hidden lg:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-32">날짜</TableHead>
              <TableHead className="w-28">시간</TableHead>
              <TableHead className="w-28">차량</TableHead>
              <TableHead>{variant === "route" ? "기사" : "노선"}</TableHead>
              {variant === "driver" ? (
                <TableHead className="w-20">방향</TableHead>
              ) : null}
              <TableHead className="w-24">운행 시간</TableHead>
              <TableHead className="w-24">거리</TableHead>
              <TableHead className="w-24">평균 속도</TableHead>
              <TableHead className="pr-[18px] text-right">미탑승</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((t) => (
              <TableRow
                key={t.tripId}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block px-2 py-2 font-mono text-sm"
                  >
                    {fmtKstDate(t.date)}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block px-2 py-2 font-mono text-xs"
                  >
                    {fmtKstHHmm(t.startedAt)}~{fmtKstHHmm(t.endedAt)}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="text-muted-foreground block px-2 py-2 text-sm"
                  >
                    {t.vehiclePlate}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block px-2 py-2 font-medium"
                  >
                    {variant === "route" ? t.driverName : t.routeName}
                  </Link>
                </TableCell>
                {variant === "driver" ? (
                  <TableCell className="p-0">
                    <Link
                      href={`/dashboard/trip/${t.tripId}`}
                      className="block px-2 py-2"
                    >
                      <span
                        className={
                          t.routeDirection === "PICKUP"
                            ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                            : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                        }
                      >
                        {DIRECTION_LABEL[t.routeDirection]}
                      </span>
                    </Link>
                  </TableCell>
                ) : null}
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block px-2 py-2 font-mono text-sm"
                  >
                    {formatDuration(t.durationSec)}
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block px-2 py-2 font-mono text-sm"
                  >
                    {t.distanceKm.toFixed(2)} km
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block px-2 py-2 font-mono text-sm"
                  >
                    {t.avgSpeedKmh} km/h
                  </Link>
                </TableCell>
                <TableCell className="p-0">
                  <Link
                    href={`/dashboard/trip/${t.tripId}`}
                    className="block pr-[18px] pl-2 py-2 text-right font-mono text-sm"
                  >
                    {t.noShowCount > 0 ? (
                      <span className="text-destructive font-bold">
                        {t.noShowCount}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">0</span>
                    )}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}

/** 평균 통계 4-grid 카드 (route/driver 상세 페이지 상단). */
export function AnalyticsStatsCard({
  title,
  description,
  tripCount,
  avgDurationSec,
  avgDistanceKm,
  avgSpeedKmh,
}: {
  title: string;
  description: string;
  tripCount: number;
  avgDurationSec: number;
  avgDistanceKm: number;
  avgSpeedKmh: number;
}) {
  const items: { label: string; value: string }[] = [
    { label: "운행 횟수", value: `${tripCount}회` },
    { label: "평균 시간", value: formatDuration(avgDurationSec) },
    {
      label: "평균 거리",
      value: `${avgDistanceKm.toFixed(2)} km`,
    },
    {
      label: "평균 속도",
      value: avgDurationSec > 0 ? `${avgSpeedKmh} km/h` : "-",
    },
  ];

  return (
    <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
      <div className="border-b px-4 py-3">
        <h3 className="text-sm font-extrabold tracking-tight">{title}</h3>
        <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
          {description}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
        {items.map((it) => (
          <div key={it.label} className="bg-card px-4 py-3">
            <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
              {it.label}
            </p>
            <p className="mt-1 text-base font-extrabold tracking-tight">
              {it.value}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
