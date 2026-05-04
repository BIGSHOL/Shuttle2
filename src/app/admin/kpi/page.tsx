import { notFound } from "next/navigation";

import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth/session";

// 운영자(셔틀이 본인) SaaS KPI 대시보드. 화이트리스트 이메일만 접근.
// 학원·학생·차량·운행량·NO_SHOW 비율 등 베타 운영 의사결정용.
const ADMIN_EMAILS = new Set(["st2000423@gmail.com"]);

export default async function AdminKpiPage() {
  const me = await getCurrentUser();
  if (!me || !ADMIN_EMAILS.has(me.email)) notFound();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [
    orgCount,
    activeOrgCount,
    studentCount,
    guardianCount,
    vehicleCount,
    kidsVehicleCount,
    routeCount,
    last30TripCount,
    last30NoShowCount,
    last30BoardingCount,
    planBreakdown,
    orgTypeBreakdown,
  ] = await Promise.all([
    db.organization.count(),
    // 최근 7일 trip 1건 이상 있는 org 수
    db.organization.count({
      where: {
        vehicles: {
          some: { trips: { some: { startedAt: { gte: sevenDaysAgo } } } },
        },
      },
    }),
    db.student.count(),
    db.guardian.count({ where: { userId: { not: null } } }),
    db.vehicle.count(),
    db.vehicle.count({ where: { mode: "KIDS" } }),
    db.route.count(),
    db.trip.count({ where: { startedAt: { gte: thirtyDaysAgo } } }),
    db.boardingEvent.count({
      where: {
        type: { in: ["NO_SHOW", "NO_DROPOFF"] },
        at: { gte: thirtyDaysAgo },
      },
    }),
    db.boardingEvent.count({
      where: {
        type: { in: ["BOARD", "ALIGHT"] },
        at: { gte: thirtyDaysAgo },
      },
    }),
    db.organization.groupBy({
      by: ["plan"],
      _count: { plan: true },
    }),
    db.organization.groupBy({
      by: ["type"],
      _count: { type: true },
    }),
  ]);

  // NO_SHOW 비율 — 전체 boarding event(BOARD/ALIGHT/NO_SHOW/NO_DROPOFF) 중 NO_SHOW+NO_DROPOFF 비율
  const totalEvents = last30NoShowCount + last30BoardingCount;
  const noShowRate =
    totalEvents > 0
      ? ((last30NoShowCount / totalEvents) * 100).toFixed(1)
      : "0.0";

  const kidsRatio =
    vehicleCount > 0
      ? ((kidsVehicleCount / vehicleCount) * 100).toFixed(0)
      : "0";

  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          셔틀이 운영 KPI
        </h2>
        <p className="text-muted-foreground mt-1 text-sm font-medium">
          베타 운영 핵심 지표. 학원·학생·차량 등 누적 자원과 최근 운행
          활동성·이슈 비율.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-extrabold tracking-wide uppercase">
          누적 자원
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="등록 학원"
            value={orgCount.toLocaleString()}
            subtext={`최근 7일 활동 ${activeOrgCount}곳`}
          />
          <KpiCard
            label="학생·원아"
            value={studentCount.toLocaleString()}
            subtext={`보호자 가입 ${guardianCount.toLocaleString()}명`}
          />
          <KpiCard
            label="차량"
            value={vehicleCount.toLocaleString()}
            subtext={`어린이용 ${kidsVehicleCount} (${kidsRatio}%)`}
          />
          <KpiCard
            label="노선"
            value={routeCount.toLocaleString()}
            subtext="운행 노선 (등원·하원)"
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-extrabold tracking-wide uppercase">
          최근 30일 활동
        </h3>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KpiCard
            label="시작된 운행"
            value={last30TripCount.toLocaleString()}
            subtext="기사가 운행 시작 누른 건수"
          />
          <KpiCard
            label="탑승·하차"
            value={last30BoardingCount.toLocaleString()}
            subtext="정상 처리된 보딩 이벤트"
          />
          <KpiCard
            label="미탑승·미하차"
            value={last30NoShowCount.toLocaleString()}
            subtext={`전체 보딩의 ${noShowRate}%`}
            tone={last30NoShowCount > 0 ? "warning" : undefined}
          />
          <KpiCard
            label="활성 학원"
            value={activeOrgCount.toLocaleString()}
            subtext={`/ 등록 ${orgCount} (활성률 ${
              orgCount > 0
                ? ((activeOrgCount / orgCount) * 100).toFixed(0)
                : "0"
            }%)`}
            tone={activeOrgCount > 0 ? "success" : "muted"}
          />
        </div>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-extrabold tracking-wide uppercase">
          요금제·기관 유형 분포
        </h3>
        <div className="grid gap-3 lg:grid-cols-2">
          <div className="bg-card rounded-2xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
              요금제
            </p>
            <ul className="mt-3 space-y-1.5">
              {planBreakdown.map((p) => (
                <li
                  key={p.plan}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">
                    {p.plan === "TRIAL"
                      ? "체험판"
                      : p.plan === "BASIC"
                        ? "기본"
                        : "프로"}
                  </span>
                  <span className="font-mono font-bold">
                    {p._count.plan}곳
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-card rounded-2xl border p-4 shadow-sm">
            <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
              기관 유형
            </p>
            <ul className="mt-3 space-y-1.5">
              {orgTypeBreakdown.map((o) => (
                <li
                  key={o.type}
                  className="flex items-center justify-between text-sm"
                >
                  <span className="font-medium">
                    {o.type === "ACADEMY"
                      ? "학원·교습소"
                      : o.type === "DAYCARE"
                        ? "어린이집"
                        : "유치원"}
                  </span>
                  <span className="font-mono font-bold">
                    {o._count.type}곳
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

function KpiCard({
  label,
  value,
  subtext,
  tone,
}: {
  label: string;
  value: string;
  subtext: string;
  tone?: "success" | "warning" | "muted";
}) {
  const valueClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : tone === "muted"
          ? "text-muted-foreground"
          : "text-foreground";
  return (
    <div className="bg-card rounded-2xl border p-4 shadow-sm">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </p>
      <p
        className={`mt-2 text-3xl font-extrabold tracking-tight ${valueClass}`}
      >
        {value}
      </p>
      <p className="text-muted-foreground mt-1 text-[11px] font-medium">
        {subtext}
      </p>
    </div>
  );
}
