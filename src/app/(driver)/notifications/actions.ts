"use server";

import { z } from "zod";

import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";

// 기사용 push 구독. OWNER/Helper와 별도 action으로 분리해 권한 검증 명확.
// 같은 StaffPushSubscription 테이블 사용 (Staff.id로 묶임).

const SubscribeInput = z.object({
  endpoint: z.string().url(),
  p256dh: z.string().min(1),
  auth: z.string().min(1),
  userAgent: z.string().max(500).optional(),
});

export async function saveDriverPushSubscriptionAction(
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireDriver();
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

export async function removeDriverPushSubscriptionAction(
  endpoint: string,
): Promise<void> {
  const me = await requireDriver();
  await db.staffPushSubscription.deleteMany({
    where: { endpoint, staffId: me.staff.id },
  });
}
