"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireDriverOrHelper } from "@/lib/auth/session";

// 기사·동승자가 본인 알림 1건을 읽음 처리. authUserId 일치 검증.
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const me = await requireDriverOrHelper();
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: me.authUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/run/notifications");
  revalidatePath("/run");
}

// 모두 읽음 처리.
export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await requireDriverOrHelper();
  await db.notification.updateMany({
    where: { userId: me.authUserId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/run/notifications");
  revalidatePath("/run");
}
