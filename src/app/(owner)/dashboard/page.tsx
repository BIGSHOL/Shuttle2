import { Suspense } from "react";
import {
  AlertTriangle,
  Bus,
  GraduationCap,
  ShieldAlert,
  Users,
} from "lucide-react";

import { KpiCard } from "@/components/kpi-card";
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

const DOW_KO = ["일", "월", "화", "수", "목", "금", "토"] as const;

function formatTodayKst(today: Date): string {
  // todayUtcDateKst는 KST 자정 → UTC. KST 표시용으로 + 9시간 효과를 위해
  // UTC 컴포넌트 직접 사용 (자정 기준이라 KST date == UTC date).
  const y = today.getUTCFullYear();
  const m = today.getUTCMonth() + 1;
  const d = today.getUTCDate();
  const dow = DOW_KO[today.getUTCDay()];
  return `${y}년 ${m}월 ${d}일 (${dow})`;
}

// C안 Suspense 스트리밍: 빠른 KPI count + org만 page에서 직접 fetch.
// 무거운 부분은 모두 별도 server component로 분리, Suspense로 감싸 streaming.
export default async function DashboardPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();
  const todayDate = todayUtcDateKst();

  // 30일 안에 안전교육 만료 임박·미입력 카운트 — KPI 5번째.
  const thirtyDaysFromNow = new Date(todayDate);
  thirtyDaysFromNow.setUTCDate(thirtyDaysFromNow.getUTCDate() + 30);

  const [
    vehicleCount,
    studentCount,
    routeCount,
    pendingAbsenceCount,
    pendingStopChangeCount,
    todayNoShowCount,
    todayTripsTotal,
    runningTripsCount,
    finishedTripsCount,
    trainingExpiringCount,
    org,
  ] = await Promise.all([
    db.vehicle.count({ where: { orgId } }),
    db.student.count({ where: { orgId } }),
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
    // 안전교육 미이수·만료 임박 — staff(OWNER/DRIVER/HELPER) 중 expiresAt이 30일 내
    // 또는 미입력. 각 staff의 마지막 training record가 expired되거나 없는 경우.
    // 단순 staff count - 유효 training이 있는 staff count.
    (async () => {
      const totalStaff = await db.staff.count({
        where: { orgId, role: { in: ["OWNER", "DRIVER", "HELPER"] } },
      });
      const validStaff = await db.staff.count({
        where: {
          orgId,
          role: { in: ["OWNER", "DRIVER", "HELPER"] },
          trainings: {
            some: {
              expiresOn: { gt: thirtyDaysFromNow },
            },
          },
        },
      });
      return totalStaff - validStaff;
    })(),
    db.organization.findUnique({
      where: { id: orgId },
      select: { plan: true, createdAt: true },
    }),
  ]);

  const scheduledTripsCount =
    todayTripsTotal - runningTripsCount - finishedTripsCount;
  const studentLabel = user.org.type === "ACADEMY" ? "학생" : "원아";

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-8">
      <OrgDashboardRefresher orgId={orgId} />

      {/* 페이지 헤더 — "오늘 운행 현황" + 날짜·조직 + 액션 */}
      <section className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
            오늘 운행 현황
          </h2>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <p className="text-muted-foreground text-xs font-semibold">
              {formatTodayKst(todayDate)} · {ORG_TYPE_LABEL[user.org.type]}
            </p>
            <span className="bg-bus-soft text-bus-foreground rounded-md px-2 py-0.5 text-[10px] font-extrabold">
              {org ? PLAN_LABEL[org.plan] : "-"} 요금제
            </span>
          </div>
        </div>
        {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
          <StaffNotificationToggle
            vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
        ) : null}
      </section>

      {/* KPI 5 cards — 즉시 (모바일 2-col / 데스크톱 5-col) */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-5">
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
              ? "정류장에 안 나옴·셔틀에서 안 내림"
              : "이상 없음"
          }
          Icon={AlertTriangle}
          tone={todayNoShowCount > 0 ? "destructive" : "muted"}
          pulse={todayNoShowCount > 0}
        />
        <KpiCard
          label="대기 요청"
          value={pendingAbsenceCount + pendingStopChangeCount}
          subtext={`결석 ${pendingAbsenceCount}건 · 정류장 ${pendingStopChangeCount}건`}
          Icon={ShieldAlert}
          tone={
            pendingAbsenceCount + pendingStopChangeCount > 0
              ? "warning"
              : "muted"
          }
          href="/absences"
        />
        <KpiCard
          label="등록 자원"
          value={studentCount}
          subtext={`${studentLabel} · 차량 ${vehicleCount} · 노선 ${routeCount}`}
          Icon={Users}
          tone="muted"
          href="/students"
        />
        <KpiCard
          label="안전교육 임박"
          value={trainingExpiringCount}
          subtext={
            trainingExpiringCount > 0
              ? "30일 내 만료·미입력"
              : "전원 유효"
          }
          Icon={GraduationCap}
          tone={trainingExpiringCount > 0 ? "warning" : "success"}
          href="/training"
        />
      </section>

      {/* W25 P1-A: ground truth Owner Dashboard.html grid `[1fr_400px]` —
          좌측 multi-trip 지도 + 우측 오늘 운행 list 풀세트 (12개) */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="min-w-0">
          <Suspense fallback={<MultiTripLiveSkeleton />}>
            <MultiTripLiveServer orgId={orgId} todayDate={todayDate} />
          </Suspense>
        </div>
        <aside className="space-y-2">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-[0.1em] uppercase">
                실시간 모니터링
              </p>
              <h3 className="mt-0.5 text-base font-black tracking-tight">
                오늘 운행
              </h3>
            </div>
          </div>
          <Suspense fallback={<TodayTripsMonitorSkeleton />}>
            <TodayTripsMonitor orgId={orgId} todayDate={todayDate} dense />
          </Suspense>
        </aside>
      </section>

      {/* 알림 sections — 모두 Suspense로 stream */}
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
    </main>
  );
}
