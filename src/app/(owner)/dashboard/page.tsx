import Link from "next/link";
import {
  Bus,
  Calendar,
  GraduationCap,
  MapPin,
  Route,
  ShieldAlert,
  Users,
} from "lucide-react";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";

import { StaffNotificationToggle } from "../notifications/staff-notification-toggle";

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

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function fmtKstHHmm(d: Date): string {
  return new Date(d.getTime() + 9 * 60 * 60 * 1000)
    .toISOString()
    .slice(11, 16);
}

export default async function DashboardPage() {
  const user = await requireOwner();
  const orgId = await getOrgId();
  const todayDate = todayUtcDateKst();

  // 멀티테넌시 1차 가드 — 모든 count는 반드시 orgId로 필터.
  const [
    vehicleCount,
    studentCount,
    stopCount,
    routeCount,
    pendingAbsenceCount,
    pendingStopChangeCount,
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
  ]);

  const org = await db.organization.findUnique({
    where: { id: orgId },
    select: { plan: true, createdAt: true },
  });

  // 오늘 운행 — 진행중·종료 모두 (orgId는 vehicle 통해 필터)
  const todayTrips = await db.trip.findMany({
    where: { vehicle: { orgId }, date: todayDate },
    orderBy: [{ startedAt: "asc" }],
    include: {
      route: {
        select: {
          name: true,
          direction: true,
          _count: { select: { stops: true } },
        },
      },
      vehicle: { select: { plate: true, mode: true } },
      driver: { select: { name: true } },
      _count: { select: { events: true } },
    },
  });

  const runningTrips = todayTrips.filter(
    (t) => t.startedAt !== null && t.endedAt === null,
  );
  const finishedTrips = todayTrips.filter((t) => t.endedAt !== null);
  const scheduledCount = todayTrips.filter((t) => t.startedAt === null).length;

  // 진행중 trip별 boarding 진행률 (BOARD/ALIGHT 카운트)
  const runningTripIds = runningTrips.map((t) => t.id);
  const runningBoardings =
    runningTripIds.length > 0
      ? await db.boardingEvent.findMany({
          where: { tripId: { in: runningTripIds } },
          select: { tripId: true, type: true },
        })
      : [];
  const boardingsByTrip = new Map<string, { board: number; alight: number }>();
  for (const tid of runningTripIds) {
    boardingsByTrip.set(tid, { board: 0, alight: 0 });
  }
  for (const e of runningBoardings) {
    const stat = boardingsByTrip.get(e.tripId);
    if (!stat) continue;
    if (e.type === "BOARD") stat.board++;
    else stat.alight++;
  }

  // 보험 만료 D-30 alert (KIDS 모드 차량 한정)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d30 = new Date(today);
  d30.setUTCDate(d30.getUTCDate() + 30);
  const expiringVehicles = await db.vehicle.findMany({
    where: {
      orgId,
      mode: "KIDS",
      OR: [{ insuranceUntil: null }, { insuranceUntil: { lte: d30 } }],
    },
    orderBy: [{ insuranceUntil: "asc" }],
    select: { id: true, plate: true, insuranceUntil: true },
  });

  // 안전교육 D-30 alert
  const staffWithTraining = await db.staff.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      role: true,
      trainings: {
        orderBy: { completedOn: "desc" },
        take: 1,
        select: { expiresOn: true },
      },
    },
  });
  const trainingAlerts = staffWithTraining
    .map((s) => {
      const latest = s.trainings[0];
      if (!latest) return { ...s, kind: "none" as const };
      if (latest.expiresOn < today)
        return { ...s, kind: "expired" as const, expiresOn: latest.expiresOn };
      if (latest.expiresOn <= d30)
        return { ...s, kind: "soon" as const, expiresOn: latest.expiresOn };
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const studentLabel = user.org.type === "ACADEMY" ? "학생" : "원아";
  const totalAlerts =
    trainingAlerts.length +
    expiringVehicles.length +
    pendingAbsenceCount +
    pendingStopChangeCount;

  return (
    <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 lg:px-6">
      {/* 인사 + 푸시 토글 */}
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

      {/* KPI 4 cards */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="오늘 운행"
          value={todayTrips.length}
          subtext={
            todayTrips.length > 0
              ? `진행 ${runningTrips.length} · 예정 ${scheduledCount} · 완료 ${finishedTrips.length}`
              : "운행 없음"
          }
          Icon={Bus}
          tone="info"
        />
        <KpiCard
          label="진행 중 차량"
          value={runningTrips.length}
          subtext={
            runningTrips.length > 0
              ? "지금 운행 중"
              : "진행 중 운행 없음"
          }
          Icon={Route}
          tone={runningTrips.length > 0 ? "bus" : "muted"}
          pulse={runningTrips.length > 0}
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

      {/* 오늘 운행 모니터 */}
      <section className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-lg font-extrabold tracking-tight">
              오늘 운행 모니터
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              지금 진행 중·예정·완료된 운행. 카드 클릭하면 실시간 화면으로
              이동.
            </p>
          </div>
          {totalAlerts === 0 ? (
            <span className="bg-success-soft text-success rounded-full px-2.5 py-1 text-xs font-bold">
              모든 운행 정상
            </span>
          ) : null}
        </div>

        {todayTrips.length === 0 ? (
          <div className="bg-card rounded-2xl border p-6 text-center shadow-sm">
            <Bus className="text-muted-foreground mx-auto h-8 w-8" />
            <p className="mt-3 text-base font-bold">오늘 운행이 없어요</p>
            <p className="text-muted-foreground mt-1 text-xs font-medium">
              요일 비트마스크에 오늘이 켜진 노선이 없거나 기사가 운행을 시작하지
              않았습니다.
            </p>
          </div>
        ) : (
          <ul className="grid gap-3 lg:grid-cols-2">
            {[
              ...runningTrips,
              ...todayTrips.filter((t) => t.startedAt === null),
              ...finishedTrips,
            ].map((t) => {
              const stats = boardingsByTrip.get(t.id);
              const total = t.route._count.stops;
              const passedKind =
                t.startedAt && !t.endedAt
                  ? "running"
                  : t.endedAt
                    ? "finished"
                    : "scheduled";
              return (
                <TripMonitorCard
                  key={t.id}
                  tripId={t.id}
                  routeName={t.route.name}
                  direction={t.route.direction}
                  vehiclePlate={t.vehicle.plate}
                  isKids={t.vehicle.mode === "KIDS"}
                  driverName={t.driver?.name ?? "—"}
                  startedAt={t.startedAt}
                  endedAt={t.endedAt}
                  totalEvents={t._count.events}
                  totalStops={total}
                  boarded={stats ? stats.board + stats.alight : 0}
                  kind={passedKind}
                />
              );
            })}
          </ul>
        )}
      </section>

      {/* 미해결 알림 */}
      {trainingAlerts.length > 0 ? (
        <section>
          <div className="border-warning bg-warning-soft/40 rounded-2xl border p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="bg-warning text-warning-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <GraduationCap className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold tracking-tight">
                  안전교육 만료 임박·미입력 ({trainingAlerts.length}명)
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                  도교법상 운영자·기사·동승보호자는 2년마다 이수 의무.
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {trainingAlerts.map((s) => {
                const expired = s.kind === "expired";
                const tone = expired
                  ? "bg-destructive/10 text-destructive"
                  : s.kind === "soon"
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted text-muted-foreground";
                const label = expired
                  ? `만료됨 (${s.expiresOn.toISOString().slice(0, 10)})`
                  : s.kind === "soon"
                    ? `30일 이내 (${s.expiresOn.toISOString().slice(0, 10)})`
                    : "기록 없음";
                return (
                  <li key={s.id}>
                    <Link
                      href="/training"
                      className="bg-background hover:bg-muted/40 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold">
                        {s.name}
                        <span className="text-muted-foreground text-[11px] font-medium">
                          ·{" "}
                          {s.role === "OWNER"
                            ? "학원장·원장"
                            : s.role === "DRIVER"
                              ? "기사"
                              : "동승보호자"}
                        </span>
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}
                      >
                        {label}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {expiringVehicles.length > 0 ? (
        <section>
          <div className="border-warning bg-warning-soft/40 rounded-2xl border p-4 shadow-sm">
            <div className="flex items-start gap-2">
              <span className="bg-warning text-warning-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
                <ShieldAlert className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-extrabold tracking-tight">
                  보험 만료 임박·미입력 차량 ({expiringVehicles.length})
                </h3>
                <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                  어린이통학버스(KIDS) 보험은 도교법상 필수.
                </p>
              </div>
            </div>
            <ul className="mt-3 space-y-1.5">
              {expiringVehicles.map((v) => {
                const expired = v.insuranceUntil && v.insuranceUntil < today;
                const dateLabel = v.insuranceUntil
                  ? v.insuranceUntil.toISOString().slice(0, 10)
                  : "미입력";
                const tone = expired
                  ? "bg-destructive/10 text-destructive"
                  : v.insuranceUntil
                    ? "bg-warning text-warning-foreground"
                    : "bg-muted text-muted-foreground";
                return (
                  <li key={v.id}>
                    <Link
                      href={`/vehicles/${v.id}/edit`}
                      className="bg-background hover:bg-muted/40 flex items-center justify-between gap-3 rounded-xl border px-3 py-2 transition-colors"
                    >
                      <span className="flex items-center gap-2 text-sm font-bold font-mono">
                        {v.plate}
                        <span className="text-muted-foreground text-[11px] font-medium">
                          만료 {dateLabel}
                        </span>
                      </span>
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}
                      >
                        {expired
                          ? "만료됨"
                          : v.insuranceUntil
                            ? "30일 이내"
                            : "미입력"}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      ) : null}

      {/* 빠른 이동 (작은 KPI grid) */}
      <section className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <QuickLink href="/vehicles" label="차량" value={vehicleCount} Icon={Bus} />
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

  // ────────────────────────────────────────────────────────────────────
  // Helpers (sub-components)
  // ────────────────────────────────────────────────────────────────────
}

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
    <div className="bg-card rounded-2xl border p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span
          className={`flex h-8 w-8 items-center justify-center rounded-full ${t.bg} ${t.text}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
          {label}
        </p>
        {pulse ? (
          <span className="bg-bus ml-auto inline-block h-2 w-2 animate-pulse rounded-full" />
        ) : null}
      </div>
      <p className="mt-3 text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="text-muted-foreground mt-1 text-[11px] font-medium">
        {subtext}
      </p>
    </div>
  );
}

function TripMonitorCard({
  tripId,
  routeName,
  direction,
  vehiclePlate,
  isKids,
  driverName,
  startedAt,
  endedAt,
  totalEvents,
  totalStops,
  kind,
  boarded,
}: {
  tripId: string;
  routeName: string;
  direction: "PICKUP" | "DROPOFF";
  vehiclePlate: string;
  isKids: boolean;
  driverName: string;
  startedAt: Date | null;
  endedAt: Date | null;
  totalEvents: number;
  totalStops: number;
  kind: "running" | "scheduled" | "finished";
  boarded: number;
}) {
  const dirCls =
    direction === "PICKUP"
      ? "bg-success-soft text-success"
      : "bg-info-soft text-info";

  if (kind === "running") {
    // dark gradient + 노란 stripe (parent live card 스타일)
    // W15-A: owner trip 상세 view link 복원
    return (
      <li>
        <Link
          href={`/dashboard/trip/${tripId}`}
          className="relative block overflow-hidden rounded-2xl p-4 text-white shadow-md transition-opacity hover:opacity-95"
          style={{
            background: "linear-gradient(155deg, #1a1c22, #0f1014)",
          }}
        >
          <div className="bg-bus absolute inset-x-0 top-0 h-[3px]" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="bg-bus text-bus-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                  <span className="bg-bus-foreground inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                  진행 중
                </span>
                <span
                  className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${dirCls}`}
                >
                  {DIRECTION_LABEL[direction]}
                </span>
                {isKids ? (
                  <span className="bg-white/15 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                    KIDS
                  </span>
                ) : null}
              </div>
              <p className="mt-1.5 truncate text-base font-extrabold tracking-tight">
                {routeName}
              </p>
              <p className="mt-0.5 text-xs font-medium opacity-70">
                {driverName} · {vehiclePlate}
              </p>
            </div>
            {startedAt ? (
              <div className="text-right">
                <p className="text-[10px] font-extrabold tracking-wide uppercase opacity-60">
                  시작
                </p>
                <p className="font-mono text-base font-extrabold">
                  {fmtKstHHmm(startedAt)}
                </p>
              </div>
            ) : null}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-[11px] font-medium">
              <span className="bg-white/10 rounded-md px-1.5 py-0.5 font-bold">
                정류장 {totalStops}
              </span>
              <span className="bg-white/10 rounded-md px-1.5 py-0.5 font-bold">
                탑승·하차 {boarded}
              </span>
            </div>
            <span className="text-[11px] font-bold opacity-70">
              상세 보기 →
            </span>
          </div>
        </Link>
      </li>
    );
  }

  // scheduled / finished — white card
  const tone =
    kind === "finished"
      ? { bg: "bg-success-soft", text: "text-success", label: "완료" }
      : { bg: "bg-muted", text: "text-muted-foreground", label: "예정" };

  // 완료된 trip은 상세 view 클릭 가능 (요약·안전점검 확인용)
  const Wrapper = kind === "finished" ? Link : "div";
  const wrapperProps =
    kind === "finished"
      ? {
          href: `/dashboard/trip/${tripId}`,
          className:
            "bg-card hover:bg-muted/40 block rounded-2xl border p-4 shadow-sm transition-colors",
        }
      : { className: "bg-card rounded-2xl border p-4 shadow-sm" };

  return (
    <li>
      <Wrapper {...(wrapperProps as { href: string; className: string })}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${tone.bg} ${tone.text}`}
              >
                {tone.label}
              </span>
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${dirCls}`}
              >
                {DIRECTION_LABEL[direction]}
              </span>
              {isKids ? (
                <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                  KIDS
                </span>
              ) : null}
            </div>
            <p className="mt-1.5 truncate text-sm font-extrabold tracking-tight">
              {routeName}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              {driverName} · {vehiclePlate}
            </p>
          </div>
          {endedAt ? (
            <div className="text-right">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                종료
              </p>
              <p className="font-mono text-sm font-extrabold">
                {fmtKstHHmm(endedAt)}
              </p>
            </div>
          ) : null}
        </div>
        <div className="text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] font-medium">
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            정류장 {totalStops}
          </span>
          {kind === "finished" ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              이벤트 {totalEvents}
            </span>
          ) : null}
        </div>
      </Wrapper>
    </li>
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
      className="bg-card hover:border-primary hover:bg-muted/40 flex items-center justify-between rounded-2xl border p-4 shadow-sm transition-colors"
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
