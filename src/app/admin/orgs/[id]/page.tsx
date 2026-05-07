import Link from "next/link";
import { notFound } from "next/navigation";

import { ArrowLeft } from "lucide-react";

import { db } from "@/lib/db";
import { computeTripStats } from "@/lib/geo/trip-stats";

import { OrgActionsCard } from "../_components/org-actions-card";
import { OrgStatusBadge } from "../_components/org-status-badge";

const ORG_TYPE_LABEL = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

const STAFF_ROLE_LABEL = {
  OWNER: "학원장",
  DRIVER: "기사",
  HELPER: "동승자",
} as const;

// W24: 매니저 — 학원 360°. W21 detail page 템플릿.
export default async function AdminOrgDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [
    org,
    tripsLast30,
    studentCount,
    vehicleCount,
    stopCount,
    staffCount,
    guardianCount,
    fcmRegisteredCount,
    recentVehicles,
    recentStops,
    recentStudents,
    recentStaff,
    auditLogs,
  ] = await Promise.all([
    db.organization.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            vehicles: true,
            students: true,
            staffs: true,
            stops: true,
          },
        },
      },
    }),
    db.trip.findMany({
      where: {
        vehicle: { orgId: id },
        startedAt: { gte: thirtyDaysAgo },
      },
      include: {
        pings: {
          orderBy: { recordedAt: "asc" },
          select: {
            lat: true,
            lng: true,
            recordedAt: true,
            source: true,
            speed: true,
          },
        },
        events: {
          select: { type: true },
        },
      },
    }),
    db.student.count({ where: { orgId: id } }),
    db.vehicle.count({ where: { orgId: id } }),
    db.stop.count({ where: { orgId: id } }),
    db.staff.count({ where: { orgId: id } }),
    // 자녀가 이 학원인 학부모 수 (GuardianLink·Student를 통해)
    db.guardian.count({
      where: { links: { some: { student: { orgId: id } } } },
    }),
    // 이 학원의 driver staff 중 FCM 등록 수
    db.staffFcmSubscription.count({
      where: { staff: { orgId: id, role: "DRIVER" } },
    }),
    db.vehicle.findMany({
      where: { orgId: id },
      orderBy: { plate: "asc" },
      select: { id: true, plate: true, mode: true, insuranceUntil: true },
      take: 5,
    }),
    db.stop.findMany({
      where: { orgId: id },
      orderBy: { name: "asc" },
      select: { id: true, name: true, address: true },
      take: 5,
    }),
    db.student.findMany({
      where: { orgId: id },
      orderBy: [{ birthYear: "desc" }, { name: "asc" }],
      select: { id: true, name: true, birthYear: true, school: true },
      take: 5,
    }),
    db.staff.findMany({
      where: { orgId: id },
      orderBy: [{ role: "asc" }, { name: "asc" }],
      select: { id: true, name: true, role: true, loginId: true },
      take: 5,
    }),
    db.adminAuditLog.findMany({
      where: { targetOrgId: id, createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 30,
    }),
  ]);
  if (!org) notFound();

  // 30일 누적 거리·미탑승 합계
  let totalDistanceKmRaw = 0;
  let totalNoShow = 0;
  let runningCount = 0;
  let endedCount = 0;
  for (const t of tripsLast30) {
    const stats = computeTripStats(t.pings, t.startedAt, t.endedAt);
    totalDistanceKmRaw += stats.distanceKm;
    totalNoShow += t.events.filter(
      (e) => e.type === "NO_SHOW" || e.type === "NO_DROPOFF",
    ).length;
    if (t.startedAt && !t.endedAt) runningCount += 1;
    if (t.endedAt) endedCount += 1;
  }
  const totalDistanceKm = totalDistanceKmRaw.toFixed(1);

  return (
    <div className="space-y-5">
      {/* 뒤로가기 */}
      <Link
        href="/admin/orgs"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm font-medium"
      >
        <ArrowLeft className="h-4 w-4" />
        학원 list로
      </Link>

      {/* 헤더 */}
      <div className="bg-card rounded-lg border p-5 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl font-extrabold tracking-tight">
                {org.name}
              </h2>
              <OrgStatusBadge status={org.status} />
              <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide">
                {PLAN_LABEL[org.plan]}
              </span>
            </div>
            <p className="text-muted-foreground mt-1.5 text-sm font-medium">
              {ORG_TYPE_LABEL[org.type]} · 가입{" "}
              {org.createdAt.toISOString().slice(0, 10)}
              {org.suspendedAt
                ? ` · 정지 ${org.suspendedAt.toISOString().slice(0, 10)}`
                : ""}
            </p>
            {org.suspendReason ? (
              <p className="text-warning mt-2 text-xs font-medium">
                정지 사유: {org.suspendReason}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      {/* 액션 카드 */}
      <OrgActionsCard
        orgId={org.id}
        orgName={org.name}
        status={org.status}
        plan={org.plan}
      />

      {/* 30일 KPI */}
      <section>
        <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
          최근 30일
        </h3>
        <div className="bg-border grid grid-cols-2 gap-px overflow-hidden rounded-lg border lg:grid-cols-4">
          <Kpi label="운행" value={`${tripsLast30.length}건`} />
          <Kpi
            label="진행 중·종료"
            value={`${runningCount} · ${endedCount}`}
          />
          <Kpi label="누적 거리" value={`${totalDistanceKm} km`} />
          <Kpi
            label="미탑승·미하차"
            value={`${totalNoShow}건`}
            tone={totalNoShow > 0 ? "warning" : undefined}
          />
        </div>
        <p className="text-muted-foreground mt-1 text-[11px] font-medium">
          기사 RN 앱 FCM 등록: {fcmRegisteredCount}대
        </p>
      </section>

      {/* 5개 sub-card */}
      <section className="grid gap-3 lg:grid-cols-2">
        <SubCard
          title={`차량 ${vehicleCount}대`}
          items={recentVehicles.map((v) => ({
            id: v.id,
            primary: v.plate,
            secondary:
              v.mode === "KIDS"
                ? `어린이용${
                    v.insuranceUntil
                      ? ` · 보험 ${v.insuranceUntil.toISOString().slice(0, 10)}`
                      : ""
                  }`
                : "일반",
          }))}
        />
        <SubCard
          title={`정류장 ${stopCount}개`}
          items={recentStops.map((s) => ({
            id: s.id,
            primary: s.name,
            secondary: s.address ?? "주소 미등록",
          }))}
        />
        <SubCard
          title={`학생·원아 ${studentCount}명`}
          items={recentStudents.map((s) => ({
            id: s.id,
            primary: s.name,
            secondary: `${s.birthYear}년생${s.school ? ` · ${s.school}` : ""}`,
          }))}
        />
        <SubCard
          title={`직원 ${staffCount}명`}
          items={recentStaff.map((s) => ({
            id: s.id,
            primary: s.name,
            secondary: `${STAFF_ROLE_LABEL[s.role]}${s.loginId ? ` · @${s.loginId}` : ""}`,
          }))}
        />
        <div className="bg-card rounded-lg border p-4 shadow-sm lg:col-span-2">
          <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
            학부모 (자녀가 이 학원)
          </p>
          <p className="text-foreground mt-1.5 text-2xl font-extrabold">
            {guardianCount}명
          </p>
        </div>
      </section>

      {/* Audit log */}
      <section>
        <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
          최근 30일 매니저 작업 이력
        </h3>
        <div className="bg-card rounded-lg border shadow-sm">
          {auditLogs.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">기록 없음.</p>
          ) : (
            <ul className="divide-y">
              {auditLogs.map((l) => (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-bold">{l.action}</p>
                    <p className="text-muted-foreground text-xs">
                      {l.actorEmail}
                    </p>
                  </div>
                  <p className="text-muted-foreground shrink-0 font-mono text-xs">
                    {l.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Kpi({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warning" | "success";
}) {
  const valueClass =
    tone === "warning"
      ? "text-warning"
      : tone === "success"
        ? "text-success"
        : "text-foreground";
  return (
    <div className="bg-card p-3">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </p>
      <p className={`mt-1 text-xl font-extrabold tracking-tight ${valueClass}`}>
        {value}
      </p>
    </div>
  );
}

function SubCard({
  title,
  items,
}: {
  title: string;
  items: { id: string; primary: string; secondary: string }[];
}) {
  return (
    <div className="bg-card rounded-lg border shadow-sm">
      <div className="border-b px-4 py-2.5">
        <p className="text-foreground text-sm font-extrabold tracking-tight">
          {title}
        </p>
      </div>
      {items.length === 0 ? (
        <p className="text-muted-foreground p-3 text-xs">아직 없습니다.</p>
      ) : (
        <ul className="divide-y">
          {items.map((it) => (
            <li key={it.id} className="px-4 py-2 text-xs">
              <p className="text-foreground font-bold">{it.primary}</p>
              <p className="text-muted-foreground mt-0.5 font-medium">
                {it.secondary}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
