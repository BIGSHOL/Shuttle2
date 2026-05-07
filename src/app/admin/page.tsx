import Link from "next/link";

import { Building2, Bus, Map as MapIcon, Activity } from "lucide-react";

import { db } from "@/lib/db";

// W24: 매니저 landing — platform 합계 KPI + 4개 quick link.
// 가드는 layout이 처리.

export default async function AdminHomePage() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);

  const [
    orgCount,
    vehicleCount,
    todayTripCount,
    runningTripCount,
    studentCount,
    guardianCount,
    suspendedOrgCount,
    recentOrgs,
  ] = await Promise.all([
    db.organization.count(),
    db.vehicle.count(),
    db.trip.count({ where: { startedAt: { gte: today } } }),
    db.trip.count({
      where: { startedAt: { not: null }, endedAt: null },
    }),
    db.student.count(),
    db.guardian.count({ where: { userId: { not: null } } }),
    db.organization.count({
      where: { status: { not: "ACTIVE" } },
    }),
    db.organization.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        type: true,
        plan: true,
        status: true,
        createdAt: true,
      },
      take: 10,
    }),
  ]);

  const kpis: { label: string; value: string; sub: string; tone?: string }[] = [
    {
      label: "등록 학원·기관",
      value: orgCount.toLocaleString(),
      sub:
        suspendedOrgCount > 0
          ? `정지·만료 ${suspendedOrgCount}곳`
          : "전부 활성 운영 중",
      tone: suspendedOrgCount > 0 ? "warning" : "success",
    },
    {
      label: "전체 차량",
      value: vehicleCount.toLocaleString(),
      sub: `학생 ${studentCount.toLocaleString()} · 학부모 ${guardianCount.toLocaleString()}`,
    },
    {
      label: "오늘 운행",
      value: todayTripCount.toLocaleString(),
      sub: `현재 운행 중 ${runningTripCount}건`,
      tone: runningTripCount > 0 ? "success" : undefined,
    },
    {
      label: "최근 7일 신규 학원",
      value: recentOrgs.length.toLocaleString(),
      sub: recentOrgs.length > 0 ? "아래 목록 확인" : "신규 가입 없음",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">매니저 콘솔</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          학원·정류장·차량·운행을 총괄 관리. 좌측 메뉴에서 자세한 화면으로
          이동하세요.
        </p>
      </div>

      {/* KPI 4 grid */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {kpis.map((k) => (
          <div
            key={k.label}
            className="bg-card rounded-lg border p-4 shadow-sm"
          >
            <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
              {k.label}
            </p>
            <p
              className={`mt-2 text-3xl font-extrabold tracking-tight ${
                k.tone === "success"
                  ? "text-success"
                  : k.tone === "warning"
                    ? "text-warning"
                    : "text-foreground"
              }`}
            >
              {k.value}
            </p>
            <p className="text-muted-foreground mt-1 text-[11px] font-medium">
              {k.sub}
            </p>
          </div>
        ))}
      </section>

      {/* Quick links */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickLink
          href="/admin/orgs"
          icon={<Building2 className="h-5 w-5" />}
          label="학원·기관"
          desc="가입 학원 목록 · 요금제·운영 상태 변경 · 상세 보기"
        />
        <QuickLink
          href="/admin/stops"
          icon={<MapIcon className="h-5 w-5" />}
          label="정류장"
          desc="전체 학원 정류장 지도·목록"
        />
        <QuickLink
          href="/admin/vehicles"
          icon={<Bus className="h-5 w-5" />}
          label="차량"
          desc="전체 학원 차량 · 보험 만료 임박"
        />
        <QuickLink
          href="/admin/trips"
          icon={<Activity className="h-5 w-5" />}
          label="운행"
          desc="오늘 운행 · 운행 중 실시간 지도"
        />
      </section>

      {/* 최근 신규 학원 */}
      <section className="bg-card rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">
            최근 7일 신규 학원·기관
          </h3>
        </div>
        {recentOrgs.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            최근 7일 신규 가입 없음.
          </p>
        ) : (
          <ul className="divide-y">
            {recentOrgs.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orgs/${o.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-foreground truncate text-sm font-bold">
                      {o.name}
                    </p>
                    <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                      {o.type === "ACADEMY"
                        ? "학원·교습소"
                        : o.type === "DAYCARE"
                          ? "어린이집"
                          : "유치원"}{" "}
                      ·{" "}
                      {o.createdAt.toISOString().slice(0, 16).replace("T", " ")}{" "}
                      KST
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                      {o.plan}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide ${
                        o.status === "ACTIVE"
                          ? "bg-success-soft text-success"
                          : "bg-warning-soft text-warning"
                      }`}
                    >
                      {o.status === "ACTIVE"
                        ? "운영"
                        : o.status === "SUSPENDED"
                          ? "정지"
                          : "만료"}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function QuickLink({
  href,
  icon,
  label,
  desc,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:bg-muted/40 group rounded-lg border p-4 shadow-sm transition-colors"
    >
      <div className="text-info mb-2">{icon}</div>
      <p className="text-foreground text-sm font-extrabold tracking-tight">
        {label}
      </p>
      <p className="text-muted-foreground mt-1 text-xs font-medium">{desc}</p>
    </Link>
  );
}
