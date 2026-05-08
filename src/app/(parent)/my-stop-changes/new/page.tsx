// W24-B C8: 정류장 변경 신청 — 같은 노선의 기존 stop picker.
// 자유 좌표 입력 폐기 (학원장이 새 정류장을 만들 부담 제거).
import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { StopChangeForm } from "./stop-change-form";

export default async function NewStopChangePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  // 자녀 → 노선 → 그 노선의 모든 stops fetch (picker source).
  // RouteStudent로 자녀-노선-현재 stop 매핑, RouteStop으로 같은 노선의 모든 후보.
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
            include: {
              stop: { select: { id: true, name: true, address: true } },
            },
          },
        },
      },
    },
  });

  return (
    <main className="px-4 pt-4 pb-6">
      <StopChangeForm
        items={routeStudents.map((rs) => ({
          routeStudentId: rs.id,
          studentId: rs.student.id,
          studentName: rs.student.name,
          routeName: rs.route.name,
          direction: rs.route.direction,
          fromStopId: rs.stop.id,
          fromStopName: rs.stop.name,
          // 같은 노선의 다른 stops (현재 stop 제외) — picker 후보
          candidates: rs.route.stops
            .filter((rsStop) => rsStop.stop.id !== rs.stop.id)
            .map((rsStop) => ({
              stopId: rsStop.stop.id,
              stopName: rsStop.stop.name,
              stopAddress: rsStop.stop.address,
              order: rsStop.order,
            })),
        }))}
      />
    </main>
  );
}
