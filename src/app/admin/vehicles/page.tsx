import Link from "next/link";

import { db } from "@/lib/db";

// W24: 매니저 — 전체 학원의 차량 cross-org list.
// 보험 만료 임박(30일 이내)을 빨간색으로 1순위 정렬, 운행 중 표시.

export default async function AdminVehiclesPage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAhead = new Date(today);
  thirtyDaysAhead.setUTCDate(thirtyDaysAhead.getUTCDate() + 30);

  const [vehicles, runningTrips] = await Promise.all([
    db.vehicle.findMany({
      orderBy: [{ org: { name: "asc" } }, { plate: "asc" }],
      select: {
        id: true,
        plate: true,
        mode: true,
        insuranceUntil: true,
        reportNo: true,
        org: { select: { id: true, name: true } },
      },
    }),
    db.trip.findMany({
      where: { startedAt: { not: null }, endedAt: null },
      select: { vehicleId: true },
    }),
  ]);

  const runningVehicleIds = new Set(runningTrips.map((t) => t.vehicleId));

  // 보험 임박/만료 우선 정렬
  const sorted = [...vehicles].sort((a, b) => {
    const aRisk = riskOf(a.insuranceUntil, today, thirtyDaysAhead);
    const bRisk = riskOf(b.insuranceUntil, today, thirtyDaysAhead);
    if (aRisk !== bRisk) return aRisk - bRisk;
    return a.plate.localeCompare(b.plate);
  });

  const expiredCount = vehicles.filter(
    (v) => v.insuranceUntil && v.insuranceUntil < today,
  ).length;
  const expiringCount = vehicles.filter(
    (v) =>
      v.insuranceUntil &&
      v.insuranceUntil >= today &&
      v.insuranceUntil <= thirtyDaysAhead,
  ).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">차량</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          전체 학원·기관의 차량 ({vehicles.length}대). 보험 만료 임박이
          상단으로. 운행 중인 차량은 노란 배지.
        </p>
      </div>

      {/* 요약 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="전체" value={vehicles.length} />
        <Stat label="운행 중" value={runningVehicleIds.size} tone="success" />
        <Stat
          label="보험 만료"
          value={expiredCount}
          tone={expiredCount > 0 ? "destructive" : undefined}
        />
        <Stat
          label="30일 내 만료"
          value={expiringCount}
          tone={expiringCount > 0 ? "warning" : undefined}
        />
      </section>

      {/* List */}
      <section className="bg-card rounded-lg border shadow-sm">
        <ul className="divide-y">
          {sorted.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              아직 등록된 차량이 없습니다.
            </li>
          ) : (
            sorted.map((v) => {
              const running = runningVehicleIds.has(v.id);
              const insuranceRisk = riskOf(
                v.insuranceUntil,
                today,
                thirtyDaysAhead,
              );
              return (
                <li key={v.id}>
                  <Link
                    href={`/admin/orgs/${v.org.id}`}
                    className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                          {v.org.name}
                        </span>
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {v.plate}
                        </h3>
                        <span
                          className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${
                            v.mode === "KIDS"
                              ? "bg-bus text-bus-foreground"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {v.mode === "KIDS" ? "어린이용" : "일반"}
                        </span>
                        {running ? (
                          <span className="bg-success-soft text-success rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                            운행 중
                          </span>
                        ) : null}
                      </div>
                      <p
                        className={`mt-1 text-xs font-medium ${
                          insuranceRisk === 0
                            ? "text-destructive"
                            : insuranceRisk === 1
                              ? "text-warning"
                              : "text-muted-foreground"
                        }`}
                      >
                        {v.mode === "KIDS"
                          ? `신고증 ${v.reportNo ?? "—"} · `
                          : ""}
                        {v.insuranceUntil
                          ? `보험 만료 ${v.insuranceUntil
                              .toISOString()
                              .slice(0, 10)}${
                              insuranceRisk === 0
                                ? " (만료됨)"
                                : insuranceRisk === 1
                                  ? " (30일 내 임박)"
                                  : ""
                            }`
                          : v.mode === "KIDS"
                            ? "보험 미등록"
                            : "—"}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">
                      →
                    </span>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-extrabold tracking-tight ${cls}`}>
        {value}
      </p>
    </div>
  );
}

// 0 = 만료됨 (가장 위), 1 = 30일 내 임박, 2 = 정상, 3 = 보험 미등록
function riskOf(
  insuranceUntil: Date | null,
  today: Date,
  thirtyDaysAhead: Date,
): number {
  if (!insuranceUntil) return 3;
  if (insuranceUntil < today) return 0;
  if (insuranceUntil <= thirtyDaysAhead) return 1;
  return 2;
}
