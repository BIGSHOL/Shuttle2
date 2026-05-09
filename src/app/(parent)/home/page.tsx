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

// W25 P0-A: ground truth Parent App.html §1번 frame 풀 매칭.
// 1. GreetingSection — "안녕하세요, {보호자}님" + 날짜
// 2. TodayTripsSection (Suspense) — 노란 hero + 우리 아이 + 오늘 일정 mini grid
// 3. HomeActionsGrid — 빠른 처리 (결석·정류장 변경)
// 4. AbsencesPreview — 내 신청 현황 (W20-D 유지)
// 5. PwaInstallBanner + NotificationToggle — 보조 정보 (하단)
export default async function ParentHomePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);
  const today = todayUtcDateKst();

  const [studentRows, upcomingAbsences] = await Promise.all([
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
  ]);
  const studentInfo = new Map(studentRows.map((s) => [s.id, s] as const));

  return (
    <main className="space-y-4 pb-6">
      <GreetingSection guardianName={me.guardian.name} />

      <Suspense fallback={<TodayTripsSectionSkeleton />}>
        <TodayTripsSection
          students={me.students.map((s) => ({ id: s.id, name: s.name }))}
          studentInfo={studentInfo}
        />
      </Suspense>

      <HomeActionsGrid />

      <AbsencesPreview
        items={upcomingAbsences.map((a) => ({
          id: a.id,
          studentName: a.student.name,
          dateISO: a.date.toISOString().slice(0, 10),
          type: a.type,
          status: a.status,
        }))}
      />

      {/* 하단 보조 — PWA 설치·알림 권한 */}
      <PwaInstallBanner />
      {env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ? (
        <div className="px-4 pt-2">
          <GuardianNotificationToggle
            vapidPublicKey={env.NEXT_PUBLIC_VAPID_PUBLIC_KEY}
          />
        </div>
      ) : null}
    </main>
  );
}
