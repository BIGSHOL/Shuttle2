import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";
import { getTodayChildTrips } from "@/lib/parent/today-trips";

import { GuardianNotificationToggle } from "../notifications/guardian-notification-toggle";
import { AbsencesPreview } from "./_components/absences-preview";
import { GreetingSection } from "./_components/greeting-section";
import { HomeActionsGrid } from "./_components/home-actions-grid";
import { IdleTripCard } from "./_components/idle-trip-card";
import { LiveTripCard } from "./_components/live-trip-card";
import { PwaInstallBanner } from "./_components/pwa-install-banner";

function fmtKstHHmm(d: Date): string {
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16);
}

export default async function ParentHomePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);
  const today = todayUtcDateKst();

  // 3개 sequential await → Promise.all 1번 (-100~250ms).
  // 모두 자녀 ID 기반이지만 의존성 없이 독립.
  const [
    studentRows,
    todayCards,
    upcomingAbsences,
    pendingAbsenceCount,
    pendingStopChangeCount,
  ] = await Promise.all([
    db.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        org: { select: { name: true, type: true } },
      },
    }),
    getTodayChildTrips(me.students.map((s) => ({ id: s.id, name: s.name }))),
    db.absenceRequest.findMany({
      where: {
        studentId: { in: studentIds },
        date: { gte: today },
        status: { notIn: ["ACKNOWLEDGED", "REJECTED"] },
      },
      orderBy: { date: "asc" },
      take: 5,
      include: { student: { select: { id: true, name: true } } },
    }),
    // W20-D1: 학부모 홈 actions grid에 대기 카운트 표시용
    db.absenceRequest.count({
      where: {
        createdBy: me.guardian.id,
        status: { in: ["PENDING", "NOTIFIED_DRIVER"] },
      },
    }),
    db.stopChangeRequest.count({
      where: {
        createdBy: me.guardian.id,
        status: "PENDING",
      },
    }),
  ]);
  const studentInfo = new Map(studentRows.map((s) => [s.id, s] as const));

  // 운행 중 카드 카운트 (인사말의 "오늘 N건")
  const tripCount = todayCards.reduce(
    (acc, c) =>
      acc +
      c.cards.filter(
        (k) =>
          k.kind === "running" ||
          k.kind === "scheduled" ||
          k.kind === "finished",
      ).length,
    0,
  );

  return (
    <main className="space-y-4 pb-6">
      <GreetingSection todayCount={tripCount} />

      {/* W20-D2: PWA 설치 안내 (이미 standalone이거나 30일 내 닫음 시 자동 숨김) */}
      <PwaInstallBanner />

      {/* 알림 토글 (W6-1 그대로 유지) */}
      {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
        <div className="px-4 pt-2">
          <GuardianNotificationToggle
            vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
        </div>
      ) : null}

      {todayCards.length === 0 ? (
        <div className="bg-card mx-4 rounded-lg border p-6 text-center">
          <p className="text-base font-bold">연결된 자녀가 아직 없어요</p>
          <p className="text-muted-foreground mt-1 text-xs font-medium">
            학원장·원장님께 보호자 초대를 다시 요청해 주세요.
          </p>
        </div>
      ) : (
        <section className="space-y-3 px-4">
          {todayCards.flatMap((c) =>
            c.cards.map((card, i) => {
              const info = studentInfo.get(c.studentId);
              const orgName = info?.org.name ?? "";
              const orgType = info?.org.type ?? "ACADEMY";
              const key = `${c.studentId}-${i}`;

              if (card.kind === "running") {
                return (
                  <LiveTripCard
                    key={key}
                    tripId={card.tripId}
                    childName={c.studentName}
                    orgName={orgName}
                    direction={card.route.direction}
                    routeName={card.route.name}
                    childStopName={card.childStop.name}
                  />
                );
              }
              if (card.kind === "scheduled") {
                return (
                  <IdleTripCard
                    key={key}
                    kind="scheduled"
                    childName={c.studentName}
                    orgName={orgName}
                    orgType={orgType}
                    mode={card.route.vehicle.mode}
                    routeName={card.route.name}
                    direction={card.route.direction}
                    childStopName={card.childStop.name}
                    scheduledFirstAt={card.route.scheduledFirstAt}
                  />
                );
              }
              if (card.kind === "finished") {
                return (
                  <IdleTripCard
                    key={key}
                    kind="finished"
                    childName={c.studentName}
                    orgName={orgName}
                    orgType={orgType}
                    mode={card.route.vehicle.mode}
                    routeName={card.route.name}
                    direction={card.route.direction}
                    endedAtKstHHmm={fmtKstHHmm(new Date(card.endedAtISO))}
                  />
                );
              }
              // none
              return (
                <IdleTripCard
                  key={key}
                  kind="none"
                  childName={c.studentName}
                  orgName={orgName}
                  orgType={orgType}
                  mode="GENERAL"
                  reason={card.reason}
                />
              );
            }),
          )}
        </section>
      )}

      <HomeActionsGrid
        pendingAbsenceCount={pendingAbsenceCount}
        pendingStopChangeCount={pendingStopChangeCount}
      />

      <AbsencesPreview
        items={upcomingAbsences.map((a) => ({
          id: a.id,
          studentName: a.student.name,
          dateISO: a.date.toISOString().slice(0, 10),
          type: a.type,
          status: a.status,
        }))}
      />
    </main>
  );
}
