"use server";

import { requireDriver } from "@/lib/auth/session";
import { removeDriverPushSubscription } from "@/server/driver/remove-push-subscription";
import { saveDriverPushSubscription } from "@/server/driver/save-push-subscription";
import { PushSubscribeInputSchema } from "@/server/driver/types";

// 기사용 push 구독. OWNER/Helper와 별도 action으로 분리해 권한 검증 명확.
// 같은 StaffPushSubscription 테이블 사용 (Staff.id로 묶임).
// W23: 비즈니스 로직은 `src/server/driver/*`로 추출. 이 파일은 SA wrapper.

export async function saveDriverPushSubscriptionAction(
  raw: unknown,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireDriver();
  const parsed = PushSubscribeInputSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: "구독 정보 형식이 올바르지 않습니다." };
  }
  await saveDriverPushSubscription(me, parsed.data);
  return { ok: true };
}

export async function removeDriverPushSubscriptionAction(
  endpoint: string,
): Promise<void> {
  const me = await requireDriver();
  await removeDriverPushSubscription(me, endpoint);
}
