// 미탑승·미하차 mark 해제 (실수로 누른 경우).
// 같은 trip + studentId + type 모든 row 삭제.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";

import type { UnmarkIssueInput } from "./types";

export async function unmarkBoardingIssue(
  actor: CurrentUser,
  input: UnmarkIssueInput,
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

  await db.boardingEvent.deleteMany({
    where: {
      tripId: input.tripId,
      studentId: input.studentId,
      type: input.type,
    },
  });

  await publishTripUpdate(input.tripId, "issue", actor.org.id);
}
