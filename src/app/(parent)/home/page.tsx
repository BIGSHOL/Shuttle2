import { Suspense } from "react";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { GreetingSection } from "./_components/greeting-section";
import { HomeActionsGrid } from "./_components/home-actions-grid";
import { OurChildrenSection } from "./_components/our-children-section";
import { RecentNotifications } from "./_components/recent-notifications";
import {
  TodayTripsSection,
  TodayTripsSectionSkeleton,
} from "./_components/today-trips-section";

// W24-D Phase 1: data/refac/design-files/Parent App.html "01 · /home" 풀 reproduce.
//
// 영역 순서 (refac):
// 1. app-bar (인사 + 날짜 + bell) → ParentHeader는 layout, page는 GreetingSection
// 2. hero LIVE 카드 (running trip) → TodayTripsSection이 우선 렌더
// 3. "우리 아이" 섹션 (자녀 list)
// 4. "오늘 일정" 2-card grid (idle trip)
// 5. "빠른 처리" 2-card (결석·정류장 변경)
// 6. "최근 알림" inline list
//
// PWA banner·notification toggle·결석 list는 /me 페이지로 이동.
// BottomTabBar는 4탭(홈/실시간/알림/내 정보).
const CURRENT_YEAR = new Date().getFullYear();

export default async function ParentHomePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  const [
    studentRows,
    pendingAbsenceCount,
    pendingStopChangeCount,
    recentNotifs,
  ] = await Promise.all([
    db.student.findMany({
      where: { id: { in: studentIds } },
      select: {
        id: true,
        name: true,
        birthYear: true,
        org: { select: { name: true, type: true } },
        routes: {
          select: { route: { select: { name: true } } },
          take: 1,
        },
      },
    }),
    db.absenceRequest.count({
      where: {
        createdBy: me.guardian.id,
        status: { in: ["PENDING", "NOTIFIED_DRIVER"] },
      },
    }),
    db.stopChangeRequest.count({
      where: { createdBy: me.guardian.id, status: "PENDING" },
    }),
    db.notification.findMany({
      where: { userId: me.authUserId },
      orderBy: { createdAt: "desc" },
      take: 3,
      select: {
        id: true,
        category: true,
        title: true,
        body: true,
        url: true,
        createdAt: true,
      },
    }),
  ]);

  const ourChildren = studentRows.map((s) => ({
    id: s.id,
    name: s.name,
    age: CURRENT_YEAR - s.birthYear,
    orgName: s.org.name,
    orgType: s.org.type,
    routeName: s.routes[0]?.route.name ?? null,
    classLabel: null,
  }));

  return (
    <main className="space-y-4 pb-6">
      <GreetingSection guardianName={me.guardian.name} />

      <Suspense fallback={<TodayTripsSectionSkeleton />}>
        <TodayTripsSection
          students={me.students.map((s) => ({ id: s.id, name: s.name }))}
        />
      </Suspense>

      <OurChildrenSection items={ourChildren} />

      <HomeActionsGrid
        pendingAbsenceCount={pendingAbsenceCount}
        pendingStopChangeCount={pendingStopChangeCount}
      />

      <RecentNotifications
        items={recentNotifs.map((n) => ({
          id: n.id,
          category: n.category,
          title: n.title,
          body: n.body,
          url: n.url,
          createdAtISO: n.createdAt.toISOString(),
        }))}
      />
    </main>
  );
}
