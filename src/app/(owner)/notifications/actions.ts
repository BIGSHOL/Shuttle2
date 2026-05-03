"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";

// OWNER push 구독 등록·해제. 학부모용과 같은 흐름, Staff(OWNER) 대상.
// driver/helper로 확장 시 별도 헬퍼 추가.

const SubscribeInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});

export async function saveStaffPushSubscriptionAction(
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireOwner();
  const parsed = SubscribeInput.safeParse(raw);
  if (!parsed.success) {
    return { error: "구독 정보 형식이 올바르지 않습니다." };
  }
  const { endpoint, p256dh, auth, userAgent } = parsed.data;

  await db.staffPushSubscription.upsert({
    where: { endpoint },
    create: {
      endpoint,
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      staffId: me.staff.id,
    },
    update: {
      p256dh,
      auth,
      userAgent: userAgent ?? null,
      staffId: me.staff.id,
    },
  });

  return { ok: true };
}

export async function removeStaffPushSubscriptionAction(
  endpoint: string,
): Promise<void> {
  const me = await requireOwner();
  await db.staffPushSubscription.deleteMany({
    where: { endpoint, staffId: me.staff.id },
  });
}
