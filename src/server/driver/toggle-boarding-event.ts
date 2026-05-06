// BoardingEvent toggle — 학생 탑승·하차 (정류장에서).
// 같은 trip + studentId + type이 이미 있으면 가장 최근 것 삭제 (토글),
// 없으면 추가. driver/helper 둘 다 가능 (호출 측 role 검증).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";

import type { BoardingInput } from "./types";

export async function toggleBoardingEvent(
  actor: CurrentUser,
  input: BoardingInput,
): Promise<void> {
  const trip = await db.trip.findFirst({
    where: {
      id: input.tripId,
      vehicle: { orgId: actor.org.id },
      OR: [{ driverId: actor.staff.id }, { helperId: actor.staff.id }],
    },
    select: { id: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");

  const existing = await db.boardingEvent.findFirst({
    where: {
      tripId: input.tripId,
      studentId: input.studentId,
      type: input.type,
    },
    orderBy: { at: "desc" },
  });

  if (existing) {
    await db.boardingEvent.delete({ where: { id: existing.id } });
  } else {
    await db.boardingEvent.create({
      data: {
        tripId: input.tripId,
        studentId: input.studentId,
        type: input.type,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        notes: input.notes ?? null,
      },
    });
  }

  await publishTripUpdate(input.tripId, "boarding", actor.org.id);
}
