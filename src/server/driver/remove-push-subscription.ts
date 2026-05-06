// 기사 Web Push 구독 해제.
// staffId 필터로 본인 endpoint만 삭제 (다른 staff의 endpoint 보호).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export async function removeDriverPushSubscription(
  actor: CurrentUser,
  endpoint: string,
): Promise<void> {
  await db.staffPushSubscription.deleteMany({
    where: { endpoint, staffId: actor.staff.id },
  });
}
