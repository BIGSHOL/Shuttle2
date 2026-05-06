// 운행 종료.
// driver 본인이 시작한 trip만 종료 가능. 이미 endedAt이면 throw.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";

export async function endTrip(
  actor: CurrentUser,
  tripId: string,
): Promise<void> {
  const orgId = actor.org.id;

  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      driverId: actor.staff.id,
      vehicle: { orgId },
    },
    select: { id: true, endedAt: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");
  if (trip.endedAt) throw new Error("이미 종료된 운행입니다");

  await db.trip.update({
    where: { id: trip.id },
    data: { endedAt: new Date() },
  });

  await publishTripUpdate(trip.id, "trip-state", orgId);
}
