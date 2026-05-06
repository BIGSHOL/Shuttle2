// Trip helper 지정 — driver만 (호출 측에서 role 검증).
// helperId === null이면 해제.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";

import type { AssignHelperInput } from "./types";

export async function assignHelper(
  actor: CurrentUser,
  input: AssignHelperInput,
): Promise<void> {
  const orgId = actor.org.id;

  // helper로 지정하려면 같은 org의 HELPER role 검증
  if (input.helperId !== null) {
    const helper = await db.staff.findFirst({
      where: { id: input.helperId, orgId, role: "HELPER" },
      select: { id: true },
    });
    if (!helper) throw new Error("선택한 동승자를 찾을 수 없습니다");
  }

  const result = await db.trip.updateMany({
    where: { id: input.tripId, driverId: actor.staff.id },
    data: { helperId: input.helperId },
  });
  if (result.count === 0) throw new Error("운행을 찾을 수 없습니다");

  await publishTripUpdate(input.tripId, "trip-state", orgId);
}
