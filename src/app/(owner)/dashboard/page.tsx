import { Suspense } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Bus,
  Download,
  MapPin,
  Plus,
  Route,
  ShieldAlert,
  Users,
} from "lucide-react";

import { OrgDashboardRefresher } from "@/components/org-dashboard-refresher";
import { Button } from "@/components/ui/button";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";

import { StaffNotificationToggle } from "../notifications/staff-notification-toggle";

import { DriverAppShareCard } from "./_components/driver-app-share-card";
import { ExpiringVehicleAlert } from "./_components/expiring-vehicle-alert";
import { KpiGrid, type KpiCard } from "./_components/kpi-grid";
import {
  MultiTripLiveServer,
  MultiTripLiveSkeleton,
} from "./_components/multi-trip-live-server";
import { QuickLinks, type QuickLinkItem } from "./_components/quick-links";
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

  const kpiItems: KpiCard[] = [
    {
      label: "오늘 운행",
      value: todayTripsTotal,
      subtext:
        todayTripsTotal > 0
          ? `진행 ${runningTripsCount} · 예정 ${scheduledTripsCount} · 완료 ${finishedTripsCount}`
          : "운행 없음",
      Icon: Bus,
      tone: "info",
    },
    {
      label: "오늘 미탑승·미하차",
      value: todayNoShowCount,
      subtext:
        todayNoShowCount > 0
          ? "학생이 정류장에 안 나옴·셔틀에서 안 내림"
          : "이상 없음",
      Icon: AlertTriangle,
      tone: todayNoShowCount > 0 ? "destructive" : "muted",
      pulse: todayNoShowCount > 0,
    },
    {
      label: "대기 요청",
      value: pendingAbsenceCount + pendingStopChangeCount,
      subtext: `결석 ${pendingAbsenceCount}건 / 정류장 ${pendingStopChangeCount}건`,
      Icon: ShieldAlert,
      tone:
        pendingAbsenceCount + pendingStopChangeCount > 0 ? "warning" : "muted",
    },
    {
      label: "등록 자원",
      value: studentCount,
      subtext: `${studentLabel} · 차량 ${vehicleCount} · 노선 ${routeCount}`,
      Icon: Users,
      tone: "muted",
    },
  ];

  const quickLinkItems: QuickLinkItem[] = [
    { href: "/vehicles", label: "차량", value: vehicleCount, Icon: Bus },
    { href: "/stops", label: "정류장", value: stopCount, Icon: MapPin },
    { href: "/routes", label: "노선", value: routeCount, Icon: Route },
    {
      href: "/students",
      label: studentLabel,
      value: studentCount,
      Icon: Users,
    },
  ];

  // KST 오늘 날짜 한국어 표기 — refac topbar sub "2026년 5월 7일 (목) · 해솔초등학교 통학버스"
  // React 19 react-hooks/purity는 Date.now() 직접 호출 금지 — new Date()는 OK.
  const nowMs = new Date().getTime();
  const kstNow = new Date(nowMs + 9 * 60 * 60 * 1000);
  const todayKstLabel = `${kstNow.getUTCFullYear()}년 ${
    kstNow.getUTCMonth() + 1
  }월 ${kstNow.getUTCDate()}일 (${
    ["일", "월", "화", "수", "목", "금", "토"][kstNow.getUTCDay()]
  })`;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
      <OrgDashboardRefresher orgId={orgId} />

      {/* W24-D Phase 3 dashboard: refac owner-dashboard.jpg topbar idiom.
          "오늘 운행 현황" + date sub + "운행 리포트" outline + "+ 새 학생 등록" bus CTA. */}
      <section className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-3xl font-black tracking-tight lg:text-4xl leading-tight">
            오늘 운행 현황
          </h1>
          <p className="text-muted-foreground mt-1.5 text-sm font-bold">
            {todayKstLabel} · {user.org.name}
            <span className="bg-muted text-muted-foreground ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-extrabold align-middle">
              {ORG_TYPE_LABEL[user.org.type]}
            </span>
            <span className="bg-bus-soft text-bus-foreground ml-1 inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-extrabold align-middle">
              {org ? PLAN_LABEL[org.plan] : "-"} 요금제
            </span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
            <StaffNotificationToggle
              vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
            />
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href="/safety-report">
              <Download className="mr-1 h-4 w-4" />
              운행 리포트
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="bg-bus hover:bg-bus/90 text-bus-foreground font-extrabold"
          >
            <Link href="/students/new">
              <Plus className="mr-1 h-4 w-4" />새 {studentLabel} 등록
            </Link>
          </Button>
        </div>
      </section>

      {/* 운행 중 셔틀 멀티 라이브 지도 — 별도 fetch (Suspense) */}
      <Suspense fallback={<MultiTripLiveSkeleton />}>
        <MultiTripLiveServer orgId={orgId} todayDate={todayDate} />
      </Suspense>

      {/* KPI 4 cards — 즉시 */}
      <section className="space-y-3">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          오늘 한눈에
        </p>
        <KpiGrid items={kpiItems} />
      </section>

      {/* 오늘 운행 모니터 — Suspense (todayTrips with includes + boarding stats) */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
              실시간 모니터링
            </p>
            <h3 className="mt-1 text-xl font-black tracking-tight">
              오늘 운행 모니터
            </h3>
            <p className="text-muted-foreground mt-1 text-xs font-semibold">
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
      <section className="space-y-3">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          빠른 이동
        </p>
        <QuickLinks items={quickLinkItems} />
      </section>
    </main>
  );
}
