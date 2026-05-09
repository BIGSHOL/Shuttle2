import Link from "next/link";
import { AlertCircle, Bus, ChevronRight, FileText, ShieldCheck } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";
import { cn } from "@/lib/utils";

const MODE_LABEL = {
  KIDS: "어린이용",
  GENERAL: "일반",
} as const;

function formatDate(d: Date | null) {
  if (!d) return "-";
  return d.toISOString().slice(0, 10);
}

function daysUntil(d: Date | null, now: Date): number | null {
  if (!d) return null;
  return Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export default async function VehiclesPage() {
  const orgId = await getOrgId();
  const now = new Date();

  const [vehicles, runningCount] = await Promise.all([
    db.vehicle.findMany({
      where: { orgId },
      orderBy: [{ mode: "asc" }, { plate: "asc" }],
    }),
    db.trip.count({
      where: {
        vehicle: { orgId },
        startedAt: { not: null },
        endedAt: null,
      },
    }),
  ]);

  const kidsCount = vehicles.filter((v) => v.mode === "KIDS").length;
  const insuranceSoon = vehicles.filter((v) => {
    const d = daysUntil(v.insuranceUntil, now);
    return d !== null && d >= 0 && d <= 30;
  }).length;
  const insuranceExpired = vehicles.filter((v) => {
    const d = daysUntil(v.insuranceUntil, now);
    return d !== null && d < 0;
  }).length;

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      {/* 페이지 헤더 */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">차량</h2>
          <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
            셔틀버스 차량을 등록하고 어린이용·일반 모드를 관리합니다. 행을
            누르면 30일 운행 통계·배정 노선·안전점검 이슈를 확인합니다.
          </p>
        </div>
        <Button asChild>
          <Link href="/vehicles/new">+ 새 차량</Link>
        </Button>
      </div>

      {/* KPI strip */}
      <KpiStrip cols={4}>
        <KpiStripCell
          label="총 차량"
          value={vehicles.length}
          subtext={`어린이용 ${kidsCount} · 일반 ${vehicles.length - kidsCount}`}
          Icon={Bus}
          tone="info"
        />
        <KpiStripCell
          label="현재 운행"
          value={runningCount}
          subtext={runningCount > 0 ? "진행 중" : "대기"}
          Icon={Bus}
          tone={runningCount > 0 ? "bus" : "muted"}
        />
        <KpiStripCell
          label="보험 만료 임박"
          value={insuranceSoon}
          subtext="30일 내 갱신 필요"
          Icon={ShieldCheck}
          tone={insuranceSoon > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="보험 만료됨"
          value={insuranceExpired}
          subtext={
            insuranceExpired > 0 ? "즉시 갱신·운행 중단" : "이상 없음"
          }
          Icon={AlertCircle}
          tone={insuranceExpired > 0 ? "destructive" : "muted"}
        />
      </KpiStrip>

      {vehicles.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>등록된 차량이 없습니다</CardTitle>
            <CardDescription>
              첫 차량을 등록해 셔틀이 운영을 시작하세요. 어린이용 모드 차량은
              어린이통학버스 신고증명서와 보험 정보가 필요합니다.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/vehicles/new">+ 새 차량 등록</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        // W25 P2-B: ground truth Owner Vehicles.html — 그리드 카드 3-col
        // (모바일 1-col, 태블릿 2-col, 데스크톱 3-col).
        // 보험 만료 임박 → warning border, 만료됨 → destructive border.
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {vehicles.map((v) => {
            const isKids = v.mode === "KIDS";
            const days = daysUntil(v.insuranceUntil, now);
            const isExpired = days !== null && days < 0;
            const isExpiringSoon = days !== null && days >= 0 && days <= 30;
            return (
              <li key={v.id}>
                <Link
                  href={`/vehicles/${v.id}`}
                  className={cn(
                    "bg-card hover:shadow-md flex flex-col gap-3 rounded-lg border-2 p-4 shadow-sm transition-all",
                    isExpired
                      ? "border-destructive/40 bg-destructive/5"
                      : isExpiringSoon
                        ? "border-warning/40"
                        : "border-border hover:border-foreground/30",
                  )}
                >
                  {/* 상단: plate + 모드 배지 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex flex-col gap-1.5">
                      <span
                        className={cn(
                          "inline-flex w-fit items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide",
                          isKids
                            ? "bg-bus text-bus-foreground"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {MODE_LABEL[v.mode]}
                      </span>
                      <h3 className="text-foreground inline-flex items-center gap-1.5 font-mono text-lg font-black tracking-tight">
                        <Bus className="h-4 w-4" />
                        {v.plate}
                      </h3>
                    </div>
                    <ChevronRight className="text-muted-foreground mt-2 h-4 w-4 shrink-0" />
                  </div>

                  <div className="border-border/60 border-t border-dashed" />

                  {/* 하단: 책임보험·신고증 */}
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                    <div className="col-span-2">
                      <dt className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1">
                        <ShieldCheck className="h-3 w-3" />
                        책임보험 만료
                      </dt>
                      <dd
                        className={cn(
                          "mt-0.5 text-sm font-bold tabular-nums",
                          isExpired
                            ? "text-destructive"
                            : isExpiringSoon
                              ? "text-warning"
                              : "text-foreground",
                        )}
                      >
                        {formatDate(v.insuranceUntil)}
                        {isExpiringSoon ? (
                          <span className="ml-1.5 text-xs">(D-{days})</span>
                        ) : null}
                        {isExpired ? (
                          <span className="ml-1.5 text-xs">
                            (만료 {Math.abs(days!)}일)
                          </span>
                        ) : null}
                      </dd>
                    </div>
                    {v.reportNo ? (
                      <div className="col-span-2">
                        <dt className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          신고증명서
                        </dt>
                        <dd className="text-foreground/80 mt-0.5 truncate font-mono text-xs font-semibold">
                          {v.reportNo}
                        </dd>
                      </div>
                    ) : null}
                  </dl>

                  {isExpired ? (
                    <p className="text-destructive flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1.5 text-[11px] font-extrabold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      즉시 갱신·운행 중단
                    </p>
                  ) : isExpiringSoon ? (
                    <p className="text-warning flex items-center gap-1 rounded-md bg-warning-soft px-2 py-1.5 text-[11px] font-extrabold">
                      <AlertCircle className="h-3.5 w-3.5" />
                      30일 내 갱신 필요
                    </p>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
