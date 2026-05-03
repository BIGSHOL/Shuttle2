"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

// 학부모 push 구독 등록·해제. 클라이언트가 navigator.serviceWorker.ready의
// PushSubscription.toJSON()을 그대로 보내면, 본인 guardianId로 upsert.

const SubscribeInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});

export async function saveGuardianPushSubscriptionAction(
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireGuardian();
  const parsed = SubscribeInput.safeParse(raw);
  if (!parsed.success) {
    return { error: "구독 정보 형식이 올바르지 않습니다." };
  }
  const { endpoint, p256dh, auth, userAgent } = parsed.data;

  // endpoint unique. 이미 있으면 owner 갱신 (다른 학부모가 같은 endpoint를
  // 가지는 일은 거의 없음 — device·브라우저 1:1).
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      guardianId: me.guardian.id,
    },
    update: {
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      guardianId: me.guardian.id,
    },
  });

  return { ok: true };
}

export async function removeGuardianPushSubscriptionAction(
  endpoint: string,
): Promise<void> {
  const me = await requireGuardian();
  await db.pushSubscription.deleteMany({
    where: { endpoint, guardianId: me.guardian.id },
  });
}
