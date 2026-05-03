"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";

// 학원장이 본인 알림 1건을 읽음 처리.
export async function markNotificationReadAction(
  notificationId: string,
): Promise<void> {
  const me = await requireOwner();
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: me.authUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}

// 모두 읽음 처리.
export async function markAllNotificationsReadAction(): Promise<void> {
  const me = await requireOwner();
  await db.notification.updateMany({
    where: { userId: me.authUserId, readAt: null },
    data: { readAt: new Date() },
  });
  revalidatePath("/dashboard/notifications");
  revalidatePath("/dashboard");
}
