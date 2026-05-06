"use server";

import { revalidatePath } from "next/cache";

import { requireDriverOrHelper } from "@/lib/auth/session";
import { markAllNotificationsRead } from "@/server/driver/mark-all-notifications-read";
import { markNotificationRead } from "@/server/driver/mark-notification-read";

// 기사·동승자가 본인 알림 읽음 처리. authUserId 일치 검증.
// W23: 비즈니스 로직은 `src/server/driver/*`로 추출. 이 파일은 SA wrapper.

export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const me = await requireDriverOrHelper();
  await markNotificationRead(me, notificationId);
  revalidatePath("/run/notifications");
  revalidatePath("/run");
}

export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await requireDriverOrHelper();
  await markAllNotificationsRead(me);
  revalidatePath("/run/notifications");
  revalidatePath("/run");
}
