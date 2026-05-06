// 본인 모든 미읽음 알림 읽음 처리.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export async function markAllNotificationsRead(
  actor: CurrentUser,
): Promise<void> {
  await db.notification.updateMany({
    where: { userId: actor.authUserId, readAt: null },
    data: { readAt: new Date() },
  });
}
