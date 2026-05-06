// 기사용 trip 상세 fetch — RN 앱이 운행 시작/이어가기 후 호출.
// 운행 진행 화면에 필요한 모든 정보:
// - trip 자체 (시작·종료 시각, helper 지정 여부)
// - route + 정류장 (GPS STOP_PASS 판정 + 화면 표시용)
// - 정류장별 학생 (BoardingRow 렌더링용)
// - 현재 BoardingEvent / SafetyCheck 상태

import type { TripDetailPayload } from "@shuttlee/shared-contracts";

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export type { TripDetailPayload };

export async function getTripDetail(
  actor: CurrentUser,
  tripId: string,
): Promise<TripDetailPayload> {
  // trip 접근 권한: driver 또는 helper
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      vehicle: { orgId: actor.org.id },
      OR: [{ driverId: actor.staff.id }, { helperId: actor.staff.id }],
    },
    include: {
      route: {
        select: { id: true, name: true, direction: true },
      },
      vehicle: {
        select: { id: true, plate: true, mode: true },
      },
      events: {
        select: {
          id: true,
          studentId: true,
          type: true,
          at: true,
          notes: true,
        },
      },
      safetyCheck: true,
    },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");

  // 노선 정류장 + 학생 목록
  const routeStops = await db.routeStop.findMany({
    where: { routeId: trip.routeId },
    orderBy: { order: "asc" },
    include: {
      stop: {
        select: { id: true, name: true, lat: true, lng: true, radiusM: true },
      },
    },
  });

  const routeStudents = await db.routeStudent.findMany({
    where: { routeId: trip.routeId },
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  const studentsByStop = new Map<string, Array<{ id: string; name: string }>>();
  for (const rs of routeStudents) {
    const arr = studentsByStop.get(rs.stopId) ?? [];
    arr.push(rs.student);
    studentsByStop.set(rs.stopId, arr);
  }

  return {
    trip: {
      id: trip.id,
      startedAt: trip.startedAt?.toISOString() ?? null,
      endedAt: trip.endedAt?.toISOString() ?? null,
      helperId: trip.helperId,
      routeId: trip.routeId,
      vehicleId: trip.vehicleId,
    },
    route: trip.route,
    vehicle: trip.vehicle,
    stops: routeStops.map((rs) => ({
      routeStopId: rs.id,
      stopId: rs.stop.id,
      name: rs.stop.name,
      lat: rs.stop.lat,
      lng: rs.stop.lng,
      radiusM: rs.stop.radiusM,
      order: rs.order,
      scheduledAt: rs.scheduledAt,
      students: studentsByStop.get(rs.stop.id) ?? [],
    })),
    events: trip.events.map((e) => ({
      id: e.id,
      studentId: e.studentId,
      type: e.type,
      at: e.at.toISOString(),
      notes: e.notes,
    })),
    safetyCheck: trip.safetyCheck
      ? {
          seatbeltAllOk: trip.safetyCheck.seatbeltAllOk,
          helperPresent: trip.safetyCheck.helperPresent,
          allAlightedOk: trip.safetyCheck.allAlightedOk,
          seatbeltCheckedAt:
            trip.safetyCheck.seatbeltCheckedAt?.toISOString() ?? null,
          alightCheckedAt:
            trip.safetyCheck.alightCheckedAt?.toISOString() ?? null,
        }
      : null,
  };
}
