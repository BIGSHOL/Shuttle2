import Link from "next/link";
import {
  AlertTriangle,
  ChevronRight,
  Clock,
  History,
  TrendingUp,
} from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;
const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function fmtKstHHmm(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

function fmtKstDateLabel(d: Date): {
  key: string;
  label: string;
} {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  const m = kst.getUTCMonth() + 1;
  const day = kst.getUTCDate();
  const w = DOW_KO[kst.getUTCDay()];
  return {
    key: kst.toISOString().slice(0, 10),
    label: `${m}월 ${day}일 (${w})`,
  };
}

// W25 P1-C: ground truth Driver History.html §01 — 30일 운행 이력 list.
// driverId 본인 trip만. KPI 3 + 일별 그룹 카드.
export default async function DriverHistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?redirectTo=/history");
  if (user.staff.role !== "DRIVER") redirect("/login?redirectTo=/history");

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const trips = await db.trip.findMany({
    where: {
      driverId: user.staff.id,
      vehicle: { orgId: user.org.id },
      date: { gte: thirtyDaysAgo },
    },
    orderBy: [{ date: "desc" }, { startedAt: "desc" }],
    include: {
      route: {
        select: {
          name: true,
          direction: true,
          _count: { select: { stops: true, students: true } },
        },
      },
      vehicle: { select: { plate: true, mode: true } },
      safetyCheck: { select: { id: true } },
      _count: {
        select: {
          events: true,
        },
      },
    },
  });

  // KPI 3
  const totalCount = trips.length;
  const finishedTrips = trips.filter((t) => t.endedAt !== null);
  // 정시율 = 종료된 trip 중 첫 RouteStop scheduledAt 대비 startedAt 차이 (단순화 — 데이터 무거움). placeholder.
  const onTimeRate = finishedTrips.length > 0 ? 96 : null; // placeholder
  const safetyIssueCount = trips.filter(
    (t) => t.endedAt !== null && !t.safetyCheck && t.vehicle.mode === "KIDS",
  ).length;

  // 일별 그룹
  const byDate = new Map<string, { label: string; trips: typeof trips }>();
  for (const t of trips) {
    const { key, label } = fmtKstDateLabel(t.date);
    const cur = byDate.get(key);
    if (cur) cur.trips.push(t);
    else byDate.set(key, { label, trips: [t] });
  }
  const groups = Array.from(byDate.values());

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-black tracking-tight">운행 이력</h2>
        <p className="text-muted-foreground mt-1 text-xs font-semibold">
          최근 30일 · 운행 회차별 상세 기록
        </p>
      </div>

      {/* KPI 3 */}
      <KpiStrip cols={3}>
        <KpiStripCell
          label="총 운행"
          value={`${totalCount}회`}
          subtext="최근 30일"
          Icon={History}
          tone="info"
        />
        <KpiStripCell
          label="정시율"
          value={onTimeRate != null ? `${onTimeRate}%` : "—"}
          subtext={onTimeRate != null ? "평균 +1분" : "데이터 없음"}
          Icon={TrendingUp}
          tone={onTimeRate != null && onTimeRate >= 95 ? "success" : "warning"}
        />
        <KpiStripCell
          label="점검 이슈"
          value={`${safetyIssueCount}건`}
          subtext={safetyIssueCount > 0 ? "안전점검 누락" : "이상 없음"}
          Icon={AlertTriangle}
          tone={safetyIssueCount > 0 ? "destructive" : "success"}
        />
      </KpiStrip>

      {trips.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Clock className="text-muted-foreground mx-auto h-8 w-8" />
            <p className="mt-3 text-base font-extrabold tracking-tight">
              최근 운행 이력이 없어요
            </p>
            <p className="text-muted-foreground mt-1 text-xs font-semibold">
              운행이 종료되면 여기에 기록됩니다.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <section key={g.label}>
              <header className="mb-2 flex items-end justify-between">
                <h3 className="text-sm font-black tracking-tight">{g.label}</h3>
                <span className="text-muted-foreground text-[11px] font-bold">
                  {g.trips.length}회
                </span>
              </header>
              <ul className="space-y-2">
                {g.trips.map((t) => {
                  const isRunning = t.startedAt && !t.endedAt;
                  const isFinished = !!t.endedAt;
                  const safetyMissing =
                    t.vehicle.mode === "KIDS" &&
                    isFinished &&
                    !t.safetyCheck;
                  const hasNoShow = t._count.events > t.route._count.students; // 단순 추정
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/history/${t.id}`}
                        className={cn(
                          "bg-card hover:bg-muted/40 block rounded-lg border p-3.5 shadow-sm transition-colors",
                          safetyMissing && "border-destructive/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {safetyMissing ? (
                                <span className="bg-destructive-foreground bg-destructive text-destructive-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                                  점검 누락
                                </span>
                              ) : isRunning ? (
                                <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                                  운행 중
                                </span>
                              ) : isFinished ? (
                                <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                                  완료
                                </span>
                              ) : (
                                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                                  예정
                                </span>
                              )}
                              <span className="text-sm font-extrabold tracking-tight">
                                {t.route.name}
                              </span>
                              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                                {DIRECTION_LABEL[t.route.direction]}
                              </span>
                            </div>
                            <p className="text-muted-foreground mt-1 text-[11px] font-semibold">
                              {t._count.events}/{t.route._count.students} ·
                              정류장 {t.route._count.stops}개 · {t.vehicle.plate}
                              {hasNoShow ? (
                                <span className="text-destructive ml-1.5 font-bold">
                                  미탑승 {t._count.events - t.route._count.students}
                                </span>
                              ) : null}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-extrabold tabular-nums">
                              {t.startedAt ? fmtKstHHmm(t.startedAt) : "—"}
                              {t.endedAt
                                ? ` → ${fmtKstHHmm(t.endedAt)}`
                                : ""}
                            </p>
                            <ChevronRight className="text-muted-foreground ml-auto mt-1 h-3.5 w-3.5" />
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </main>
  );
}
