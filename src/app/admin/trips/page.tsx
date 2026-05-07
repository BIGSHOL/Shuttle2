import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

import { AdminMultiTripLive } from "./_components/admin-multi-trip-live";

// W24: 매니저 — 전체 학원의 운행 현황. 운행 중 차량을 한 지도에 모아 보고
// 아래 목록에서 학원·차량·기사·상태 확인.
// 학원·운행 상태·날짜 필터.

type TripStatus = "pending" | "running" | "ended";

export default async function AdminTripsPage({
  searchParams,
}: {
  searchParams: Promise<{ orgId?: string; status?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const orgIdFilter = sp.orgId && sp.orgId !== "all" ? sp.orgId : null;
  const statusFilter = isStatus(sp.status) ? sp.status : null;

  // 날짜 필터: YYYY-MM-DD. 미지정 시 오늘.
  const dateRaw = sp.date ?? "";
  const targetDate = parseDateOrToday(dateRaw);
  const dayStart = new Date(targetDate);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setUTCDate(dayEnd.getUTCDate() + 1);
  const dateStr = dayStart.toISOString().slice(0, 10);

  const prevDate = new Date(dayStart);
  prevDate.setUTCDate(prevDate.getUTCDate() - 1);
  const nextDate = new Date(dayStart);
  nextDate.setUTCDate(nextDate.getUTCDate() + 1);

  const where: Prisma.TripWhereInput = {
    date: { gte: dayStart, lt: dayEnd },
    ...(orgIdFilter ? { vehicle: { orgId: orgIdFilter } } : {}),
    ...(statusFilter === "pending"
      ? { startedAt: null }
      : statusFilter === "running"
        ? { startedAt: { not: null }, endedAt: null }
        : statusFilter === "ended"
          ? { endedAt: { not: null } }
          : {}),
  };

  const [trips, allOrgs] = await Promise.all([
    db.trip.findMany({
      where,
      orderBy: [{ startedAt: "desc" }],
      select: {
        id: true,
        startedAt: true,
        endedAt: true,
        vehicle: {
          select: {
            id: true,
            plate: true,
            orgId: true,
            org: { select: { id: true, name: true } },
          },
        },
        route: {
          select: {
            id: true,
            name: true,
            direction: true,
            stops: {
              select: {
                id: true,
                order: true,
                stop: {
                  select: { id: true, name: true, lat: true, lng: true },
                },
              },
              orderBy: { order: "asc" },
            },
          },
        },
        driver: { select: { id: true, name: true } },
      },
    }),
    db.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const runningTrips = trips
    .filter((t) => t.startedAt && !t.endedAt)
    .map((t) => ({
      id: t.id,
      orgId: t.vehicle.org.id,
      vehiclePlate: t.vehicle.plate,
      routeName: t.route.name,
      direction: t.route.direction,
      stops: t.route.stops.map((rs) => ({
        id: rs.stop.id,
        name: rs.stop.name,
        lat: rs.stop.lat,
        lng: rs.stop.lng,
        order: rs.order,
      })),
    }));

  const finishedCount = trips.filter((t) => t.endedAt).length;
  const pendingCount = trips.filter((t) => !t.startedAt).length;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">운행 현황</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          {dateStr} 전체 학원 운행 ({trips.length}건). 진행 중 {runningTrips.length}{" "}
          · 종료 {finishedCount} · 미시작 {pendingCount}.
        </p>
      </div>

      {/* 검색·필터 */}
      <form
        action="/admin/trips"
        className="bg-card flex flex-wrap items-center gap-2 rounded-lg border p-3 shadow-sm"
      >
        <Link
          href={`/admin/trips?date=${prevDate.toISOString().slice(0, 10)}${
            orgIdFilter ? `&orgId=${orgIdFilter}` : ""
          }${statusFilter ? `&status=${statusFilter}` : ""}`}
          className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
          aria-label="전날"
        >
          ←
        </Link>
        <input
          type="date"
          name="date"
          defaultValue={dateStr}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Link
          href={`/admin/trips?date=${nextDate.toISOString().slice(0, 10)}${
            orgIdFilter ? `&orgId=${orgIdFilter}` : ""
          }${statusFilter ? `&status=${statusFilter}` : ""}`}
          className="text-muted-foreground hover:text-foreground inline-flex h-9 items-center rounded-md border px-3 text-sm font-medium"
          aria-label="다음 날"
        >
          →
        </Link>
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
          name="status"
          defaultValue={statusFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 상태</option>
          <option value="pending">대기</option>
          <option value="running">운행 중</option>
          <option value="ended">종료</option>
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-bold"
        >
          검색
        </button>
        {(orgIdFilter || statusFilter) && (
          <Link
            href={`/admin/trips?date=${dateStr}`}
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
          >
            초기화
          </Link>
        )}
      </form>

      <AdminMultiTripLive runningTrips={runningTrips} />

      <section className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">운행 목록</h3>
        </div>
        {trips.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            조건에 맞는 운행이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {trips.map((t) => {
              const status = t.endedAt
                ? "종료"
                : t.startedAt
                  ? "운행 중"
                  : "대기";
              const statusCls = t.endedAt
                ? "bg-muted text-muted-foreground"
                : t.startedAt
                  ? "bg-bus-soft text-bus"
                  : "bg-warning-soft text-warning";
              return (
                <li key={t.id}>
                  <Link
                    href={`/admin/orgs/${t.vehicle.org.id}`}
                    className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                          {t.vehicle.org.name}
                        </span>
                        <h3 className="text-sm font-extrabold tracking-tight">
                          {t.vehicle.plate} · {t.route.name}
                        </h3>
                        <span
                          className={`${statusCls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
                        >
                          {status}
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-1 text-xs font-medium">
                        {t.route.direction === "PICKUP" ? "등원" : "하원"} ·
                        기사 {t.driver.name}
                        {t.startedAt
                          ? ` · 시작 ${t.startedAt.toISOString().slice(11, 16)}`
                          : ""}
                        {t.endedAt
                          ? ` · 종료 ${t.endedAt.toISOString().slice(11, 16)}`
                          : ""}
                      </p>
                    </div>
                    <span className="text-muted-foreground text-xs font-medium">
                      →
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function isStatus(v: string | undefined): v is TripStatus {
  return v === "pending" || v === "running" || v === "ended";
}

function parseDateOrToday(raw: string): Date {
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const d = new Date(`${raw}T00:00:00Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  return today;
}
