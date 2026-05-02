import { db } from "@/lib/db";
import {
  getCurrentGuardian,
  type CurrentGuardian,
} from "@/lib/auth/session";

// CLAUDE.md "학부모는 본인 자녀의 운행 trip만 조회 가능".
// trip의 RouteStudent 중에 학부모의 자녀 student.id가 하나라도 있으면 허용.
// 자녀가 여러 명이라도 그 중 한 명이 이 trip 노선에 배정되어 있으면 OK.
export async function requireGuardianTripAccess(tripId: string): Promise<{
  guardian: CurrentGuardian;
  trip: { id: string; routeId: string; vehicleId: string; orgId: string };
  childStudent: { id: string; name: string; stopId: string }; // 매칭된 첫 자녀
}> {
  const guardian = await getCurrentGuardian();
  if (!guardian) throw new Error("UNAUTHENTICATED: GUARDIAN required");

  const studentIds = guardian.students.map((s) => s.id);
  if (studentIds.length === 0) {
    throw new Error("FORBIDDEN: no children linked");
  }

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    select: {
      id: true,
      routeId: true,
      vehicleId: true,
      vehicle: { select: { orgId: true } },
      route: {
        select: {
          students: {
            where: { studentId: { in: studentIds } },
            select: {
              studentId: true,
              stopId: true,
              student: { select: { id: true, name: true } },
            },
            take: 1,
          },
        },
      },
    },
  });

  if (!trip) throw new Error("FORBIDDEN: trip not found");

  const match = trip.route.students[0];
  if (!match) {
    throw new Error("FORBIDDEN: child not assigned to this trip");
  }

  return {
    guardian,
    trip: {
      id: trip.id,
      routeId: trip.routeId,
      vehicleId: trip.vehicleId,
      orgId: trip.vehicle.orgId,
    },
    childStudent: {
      id: match.student.id,
      name: match.student.name,
      stopId: match.stopId,
    },
  };
}
