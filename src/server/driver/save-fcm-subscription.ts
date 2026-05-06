// W23: 기사 RN 앱 FCM 토큰 저장.
// 같은 fcmToken이 다른 staff에 묶여 있을 수 있으므로 staffId도 update
// (앱 reinstall 시 기존 토큰을 새 staff로 재할당).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import type { FcmSubscribeInput } from "@shuttlee/shared-contracts";

export async function saveDriverFcmSubscription(
  actor: CurrentUser,
  input: FcmSubscribeInput,
): Promise<void> {
  await db.staffFcmSubscription.upsert({
    where: { fcmToken: input.fcmToken },
    create: {
      fcmToken: input.fcmToken,
      platform: input.platform,
      appVersion: input.appVersion ?? null,
      userAgent: input.userAgent ?? null,
      staffId: actor.staff.id,
    },
    update: {
      platform: input.platform,
      appVersion: input.appVersion ?? null,
      userAgent: input.userAgent ?? null,
      staffId: actor.staff.id,
    },
  });
}
