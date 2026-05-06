import Link from "next/link";
import { Suspense } from "react";
import {
  AlertTriangle,
  Bus,
  MapPin,
  Route,
  ShieldAlert,
  Users,
} from "lucide-react";

import { OrgDashboardRefresher } from "@/components/org-dashboard-refresher";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";

import { StaffNotificationToggle } from "../notifications/staff-notification-toggle";

import { DriverAppShareCard } from "./_components/driver-app-share-card";
import { ExpiringVehicleAlert } from "./_components/expiring-vehicle-alert";
import {
  MultiTripLiveServer,
  MultiTripLiveSkeleton,
} from "./_components/multi-trip-live-server";
import { RepeatNoShowAlert } from "./_components/repeat-no-show-alert";
import {
  TodayTripsMonitor,
  TodayTripsMonitorSkeleton,
} from "./_components/today-trips-monitor";
import { TrainingAlert } from "./_components/training-alert";

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

// C안 Suspense 스트리밍: 빠른 KPI count 11개 + org만 page에서 직접 fetch.
// 무거운 부분(운행 모니터·라이브 지도·30일 NO_SHOW 집계·안전교육·보험 D-30)은
// 모두 별도 server component로 분리, Suspense로 감싸 streaming. 첫 paint
// 100~300ms 빨라지고 무거운 alerts는 차례로 stream.
export default async function DashboardPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();
  const todayDate = todayUtcDateKst();

  // 빠른 11 counts + org. 모두 단일 index lookup이라 빠름.
  const [
    vehicleCount,
    studentCount,
    stopCount,
    routeCount,
    pendingAbsenceCount,
    pendingStopChangeCount,
    todayNoShowCount,
    todayTripsTotal,
    runningTripsCount,
    finishedTripsCount,
    org,
  ] = await Promise.all([
    db.vehicle.count({ where: { orgId } }),
    db.student.count({ where: { orgId } }),
    db.stop.count({ where: { orgId } }),
    db.route.count({ where: { vehicle: { orgId } } }),
    db.absenceRequest.count({
      where: {
        student: { orgId },
        status: { in: ["PENDING", "NOTIFIED_DRIVER"] },
      },
    }),
    db.stopChangeRequest.count({
      where: { orgId, status: "PENDING" },
    }),
    db.boardingEvent.count({
      where: {
        type: { in: ["NO_SHOW", "NO_DROPOFF"] },
        trip: { vehicle: { orgId }, date: todayDate },
      },
    }),
    db.trip.count({ where: { vehicle: { orgId }, date: todayDate } }),
    db.trip.count({
      where: {
        vehicle: { orgId },
        date: todayDate,
        startedAt: { not: null },
        endedAt: null,
      },
    }),
    db.trip.count({
      where: {
        vehicle: { orgId },
        date: todayDate,
        endedAt: { not: null },
      },
    }),
    db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, createdAt: true },
    }),
  ]);

  const scheduledTripsCount =
    todayTripsTotal - runningTripsCount - finishedTripsCount;
  const studentLabel = user.org.type === "ACADEMY" ? "학생" : "원아";

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
      <OrgDashboardRefresher orgId={orgId} />

      {/* 운행 중 셔틀 멀티 라이브 지도 — 별도 fetch (Suspense) */}
      <Suspense fallback={<MultiTripLiveSkeleton />}>
        <MultiTripLiveServer orgId={orgId} todayDate={todayDate} />
      </Suspense>

      {/* 인사 + 푸시 토글 — 즉시 */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight lg:text-3xl">
            {user.org.name}
          </h2>
          <p className="text-muted-foreground mt-1 text-sm font-medium">
            {ORG_TYPE_LABEL[user.org.type]} · 요금제{" "}
            {org ? PLAN_LABEL[org.plan] : "-"}
          </p>
        </div>
        {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
          <StaffNotificationToggle
            vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
        ) : null}
      </section>

      {/* KPI 4 cards — 즉시 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label="오늘 운행"
          value={todayTripsTotal}
          subtext={
            todayTripsTotal > 0
              ? `진행 ${runningTripsCount} · 예정 ${scheduledTripsCount} · 완료 ${finishedTripsCount}`
              : "운행 없음"
          }
          Icon={Bus}
          tone="info"
        />
        <KpiCard
          label="오늘 미탑승·미하차"
          value={todayNoShowCount}
          subtext={
            todayNoShowCount > 0
              ? "학생이 정류장에 안 나옴·셔틀에서 안 내림"
              : "이상 없음"
          }
          Icon={AlertTriangle}
          tone={todayNoShowCount > 0 ? "destructive" : "muted"}
          pulse={todayNoShowCount > 0}
        />
        <KpiCard
          label="대기 요청"
          value={pendingAbsenceCount + pendingStopChangeCount}
          subtext={`결석 ${pendingAbsenceCount}건 / 정류장 ${pendingStopChangeCount}건`}
          Icon={ShieldAlert}
          tone={
            pendingAbsenceCount + pendingStopChangeCount > 0
              ? "warning"
              : "muted"
          }
        />
        <KpiCard
          label="등록 자원"
          value={studentCount}
          subtext={`${studentLabel} · 차량 ${vehicleCount} · 노선 ${routeCount}`}
          Icon={Users}
          tone="muted"
        />
      </section>

      {/* 오늘 운행 모니터 — Suspense (todayTrips with includes + boarding stats) */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">
              오늘 운행 모니터
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              지금 진행 중·예정·완료된 운행. 카드 클릭하면 실시간 화면으로 이동.
            </p>
          </div>
        </div>
        <Suspense fallback={<TodayTripsMonitorSkeleton />}>
          <TodayTripsMonitor orgId={orgId} todayDate={todayDate} />
        </Suspense>
      </section>

      {/* 알림 sections — 모두 Suspense로 stream. 각자 독립 fetch */}
      <Suspense fallback={null}>
        <RepeatNoShowAlert orgId={orgId} studentLabel={studentLabel} />
      </Suspense>

      <Suspense fallback={null}>
        <TrainingAlert orgId={orgId} />
      </Suspense>

      <Suspense fallback={null}>
        <ExpiringVehicleAlert orgId={orgId} />
      </Suspense>

      {/* W23: 기사용 RN 앱 공유 카드 */}
      <DriverAppShareCard
        apkUrl={process.env.DRIVER_APP_LATEST_APK_URL ?? null}
        helpUrl={`${process.env.NEXT_PUBLIC_BASE_URL ?? "https://shuttlee.kr"}/help/driver-app`}
      />

      {/* 빠른 이동 — 즉시 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <QuickLink
          href="/vehicles"
          label="차량"
          value={vehicleCount}
          Icon={Bus}
        />
        <QuickLink
          href="/stops"
          label="정류장"
          value={stopCount}
          Icon={MapPin}
        />
        <QuickLink
          href="/routes"
          label="노선"
          value={routeCount}
          Icon={Route}
        />
        <QuickLink
          href="/students"
          label={studentLabel}
          value={studentCount}
          Icon={Users}
        />
      </section>
    </main>
  );
}

// ────────────────────────────────────────────────────────────────────
// Helpers (sub-components)
// ────────────────────────────────────────────────────────────────────

type Tone = "info" | "bus" | "warning" | "destructive" | "muted";

const TONE_CLS: Record<Tone, { bg: string; text: string }> = {
  info: { bg: "bg-info-soft", text: "text-info" },
  bus: { bg: "bg-bus-soft", text: "text-bus-foreground" },
  warning: { bg: "bg-warning-soft", text: "text-warning" },
  destructive: { bg: "bg-destructive/10", text: "text-destructive" },
  muted: { bg: "bg-muted", text: "text-muted-foreground" },
};

function KpiCard({
  label,
  value,
  subtext,
  Icon,
  tone,
  pulse,
}: {
  label: string;
  value: number;
  subtext: string;
  Icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
  pulse?: boolean;
}) {
  const t = TONE_CLS[tone];
  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <div className="flex items-start gap-2">
        <span
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${t.bg} ${t.text}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-muted-foreground min-w-0 flex-1 pt-1 text-[11px] font-extrabold tracking-wide uppercase leading-tight">
          {label}
        </p>
        {pulse ? (
          <span className="bg-bus mt-2 inline-block h-2 w-2 shrink-0 animate-pulse rounded-full" />
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-1 text-[11px] font-medium leading-tight">
        {subtext}
      </p>
    </div>
  );
}

function QuickLink({
  href,
  label,
  value,
  Icon,
}: {
  href: string;
  label: string;
  value: number;
  Icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="bg-card hover:border-primary hover:bg-muted/40 flex items-center justify-between rounded-lg border p-4 shadow-sm transition-colors"
    >
      <div>
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          {label}
        </p>
        <p className="mt-1 text-2xl font-extrabold tracking-tight">{value}</p>
      </div>
      <Icon className="text-muted-foreground h-6 w-6" />
    </Link>
  );
}
