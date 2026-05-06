import { Suspense } from "react";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { env } from "@/lib/env";

import { GuardianNotificationToggle } from "../notifications/guardian-notification-toggle";
import { AbsencesPreview } from "./_components/absences-preview";
import { GreetingSection } from "./_components/greeting-section";
import { HomeActionsGrid } from "./_components/home-actions-grid";
import { PwaInstallBanner } from "./_components/pwa-install-banner";
import {
  TodayTripsSection,
  TodayTripsSectionSkeleton,
} from "./_components/today-trips-section";

// C안 Suspense 스트리밍: studentRows + upcomingAbsences + 2 counts (가벼움)는
// 즉시 렌더, getTodayChildTrips (자녀 N명 × 노선 × 오늘 운행 nested fetch — 무거움)는
// Suspense로 분리. 첫 paint 100~250ms 빨라지고 trip 카드만 늦게 stream.
export default async function ParentHomePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);
  const today = todayUtcDateKst();

  const [
    studentRows,
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

  return (
    <main className="space-y-4 pb-6">
      <GreetingSection />

      <PwaInstallBanner />

      {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
        <div className="px-4 pt-2">
          <GuardianNotificationToggle
            vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
        </div>
      ) : null}

      <Suspense fallback={<TodayTripsSectionSkeleton />}>
        <TodayTripsSection
          students={me.students.map((s) => ({ id: s.id, name: s.name }))}
          studentInfo={studentInfo}
        />
      </Suspense>

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
