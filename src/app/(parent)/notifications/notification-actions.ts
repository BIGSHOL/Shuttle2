"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

// 학부모가 본인 알림 1건을 읽음 처리. userId(auth.users.id) 일치 검증.
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const me = await requireGuardian();
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: me.authUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
}

// 모두 읽음 처리.
export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await requireGuardian();
  await db.notification.updateMany({
    where: { userId: me.authUserId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/notifications");
  revalidatePath("/home");
}
