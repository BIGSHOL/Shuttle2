// W23: 기사 RN 앱 FCM 토큰 해제 (앱 logout 시).
// staffId 필터로 본인 토큰만 삭제 (다른 staff의 토큰 보호).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export async function removeDriverFcmSubscription(
  actor: CurrentUser,
  fcmToken: string,
): Promise<void> {
  await db.staffFcmSubscription.deleteMany({
    where: { fcmToken, staffId: actor.staff.id },
  });
}
