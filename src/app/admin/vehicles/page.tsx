import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

// W24: 매니저 — 전체 학원의 차량 통합 목록.
// 보험 만료 임박(30일 이내)을 빨간색으로 1순위 정렬, 운행 중 표시.
// 검색(번호판)·학원·보험 상태 필터.

type RiskFilter = "expired" | "expiring" | "ok" | "missing";
const RISK_OPTIONS: { value: RiskFilter; label: string }[] = [
  { value: "expired", label: "만료됨" },
  { value: "expiring", label: "30일 내 임박" },
  { value: "ok", label: "정상" },
  { value: "missing", label: "미등록" },
];

export default async function AdminVehiclesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; orgId?: string; risk?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const orgIdFilter = sp.orgId && sp.orgId !== "all" ? sp.orgId : null;
  const riskFilter = isRisk(sp.risk) ? sp.risk : null;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAhead = new Date(today);
  thirtyDaysAhead.setUTCDate(thirtyDaysAhead.getUTCDate() + 30);

  const where: Prisma.VehicleWhereInput = {
    ...(q ? { plate: { contains: q, mode: "insensitive" as const } } : {}),
    ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
    ...(riskFilter === "expired"
      ? { insuranceUntil: { lt: today } }
      : riskFilter === "expiring"
        ? { insuranceUntil: { gte: today, lte: thirtyDaysAhead } }
        : riskFilter === "ok"
          ? { insuranceUntil: { gt: thirtyDaysAhead } }
          : riskFilter === "missing"
            ? { insuranceUntil: null }
            : {}),
  };

  const [vehicles, runningTrips, allOrgs] = await Promise.all([
    db.vehicle.findMany({
      where,
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
    db.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
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
          전체 학원·기관의 차량. 보험 만료 임박이 상단으로, 운행 중인 차량은
          노란 배지.
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

      {/* 검색·필터 */}
      <form
        action="/admin/vehicles"
        className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="차량 번호판"
          className="bg-card border-input min-w-40 flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          name="orgId"
          defaultValue={orgIdFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 학원</option>
          {allOrgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <select
          name="risk"
          defaultValue={riskFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 보험 상태</option>
          {RISK_OPTIONS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-bold"
        >
          검색
        </button>
        {(q || orgIdFilter || riskFilter) && (
          <Link
            href="/admin/vehicles"
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 목록 */}
      <section className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-2.5">
          <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
            결과 ({sorted.length}대)
          </p>
        </div>
        <ul className="divide-y">
          {sorted.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              조건에 맞는 차량이 없습니다.
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

function isRisk(v: string | undefined): v is RiskFilter {
  return v === "expired" || v === "expiring" || v === "ok" || v === "missing";
}
