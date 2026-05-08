// W24-D Phase 1 stop-change/new: data/refac/screenshots/parent-app.jpg "04 · /stop-change/new".
// 자녀 → 노선 → 그 노선의 모든 stops fetch (picker source).
// hi-fi opt sub "{routeName} · {driverName}님" 노출 위해 노선의 가장 최근
// driver를 1인 추출(자녀가 노선 변경 안 한 경우 일관). 데이터 없으면 fallback.
import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { StopChangeForm } from "./stop-change-form";

export default async function NewStopChangePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  const routeStudents = await db.routeStudent.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: { select: { id: true, name: true } },
      stop: { select: { id: true, name: true } },
      route: {
        select: {
          id: true,
          name: true,
          direction: true,
          stops: {
            orderBy: { order: "asc" },
            select: {
              order: true,
              scheduledAt: true,
              stop: { select: { id: true, name: true, address: true } },
            },
          },
          // hi-fi opt sub에 표기할 기사 — 가장 최근 trip에서 추출. trip 없으면 null.
          trips: {
            orderBy: { date: "desc" },
            take: 1,
            select: { driver: { select: { name: true } } },
          },
        },
      },
    },
  });

  return (
    <StopChangeForm
      items={routeStudents.map((rs) => {
        const totalStops = rs.route.stops.length;
        return {
          routeStudentId: rs.id,
          studentId: rs.student.id,
          studentName: rs.student.name,
          routeName: rs.route.name,
          direction: rs.route.direction,
          driverName: rs.route.trips[0]?.driver?.name ?? null,
          fromStopId: rs.stop.id,
          fromStopName: rs.stop.name,
          fromStopOrder:
            rs.route.stops.find((s) => s.stop.id === rs.stop.id)?.order ??
            null,
          // 같은 노선의 모든 stops — picker UI에서 현재 stop과 disabled stop도 함께 표시
          allStops: rs.route.stops.map((rsStop) => ({
            stopId: rsStop.stop.id,
            stopName: rsStop.stop.name,
            stopAddress: rsStop.stop.address,
            scheduledAt: rsStop.scheduledAt,
            order: rsStop.order,
            // RouteStop.order는 1-indexed (route-stops-section의 nextOrder=lastOrder+1, default 0+1=1).
            // PICKUP 방향: 마지막 stop(order=N) = 도착지(학원·기관) → 하차 불가
            // DROPOFF 방향: 첫 stop(order=1) = 출발지(학원·기관) → 승차 불가
            isTerminal:
              (rs.route.direction === "PICKUP" &&
                rsStop.order === totalStops) ||
              (rs.route.direction === "DROPOFF" && rsStop.order === 1),
          })),
        };
      })}
    />
  );
}
