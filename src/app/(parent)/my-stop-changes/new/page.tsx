import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { StopChangeForm } from "./stop-change-form";

export default async function NewStopChangePage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  // 자녀별로 현재 RouteStudent (route + stop) 정보. 자녀 1명이 여러 노선·
  // 정류장에 배정되어 있을 수 있으므로 (자녀, 기존정류장) 조합으로 펼침.
  const routeStudents = await db.routeStudent.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      student: { select: { id: true, name: true } },
      stop: { select: { id: true, name: true, lat: true, lng: true } },
      route: { select: { id: true, name: true, direction: true } },
    },
  });

  return (
    <main className="px-4 pt-4 pb-6">
      <StopChangeForm
        items={routeStudents.map((rs) => ({
          studentId: rs.student.id,
          studentName: rs.student.name,
          fromStopId: rs.stop.id,
          fromStopName: rs.stop.name,
          fromStopLat: rs.stop.lat,
          fromStopLng: rs.stop.lng,
          routeName: rs.route.name,
          direction: rs.route.direction,
        }))}
      />
    </main>
  );
}
