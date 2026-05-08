// W24-D Phase 1: BottomTabBar "실시간" 탭의 진입점.
// 자녀의 진행 중(running) trip을 찾아 그 trip-live url로 redirect.
// 없으면 home으로 redirect + 토스트 안내(다음 ?fallback=no-active 검증).
//
// refac BottomTabBar에 "실시간"이 항상 활성처럼 보이도록 단일 entry point.

import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";

export default async function TripLiveIndexPage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);
  const today = todayUtcDateKst();

  // 자녀가 매핑된 노선의 오늘 진행 중(startedAt 있고 endedAt null) trip 1건
  const trip = await db.trip.findFirst({
    where: {
      date: today,
      startedAt: { not: null },
      endedAt: null,
      route: { students: { some: { studentId: { in: studentIds } } } },
    },
    select: { id: true },
    orderBy: { startedAt: "desc" },
  });

  if (trip) redirect(`/trip-live/${trip.id}`);
  redirect("/home");
}
