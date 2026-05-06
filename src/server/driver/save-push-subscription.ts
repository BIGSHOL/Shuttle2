// 기사 Web Push 구독 저장.
// 같은 endpoint가 다른 staff에 묶여 있을 수 있으므로 staffId도 update.
// (RN 앱의 FCM 토큰은 별도 함수·테이블 — Day 8에 추가 예정.)

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

import type { PushSubscribeInput } from "./types";

export async function saveDriverPushSubscription(
  actor: CurrentUser,
  input: PushSubscribeInput,
): Promise<void> {
  await db.staffPushSubscription.upsert({
    where: { endpoint: input.endpoint },
    create: {
      endpoint: input.endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      staffId: actor.staff.id,
    },
    update: {
      p256dh: input.p256dh,
      auth: input.auth,
      userAgent: input.userAgent ?? null,
      staffId: actor.staff.id,
    },
  });
}
