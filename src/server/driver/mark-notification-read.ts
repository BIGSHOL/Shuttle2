// 본인 알림 1건 읽음 처리. authUserId 일치 검증 (Notification.userId는
// Supabase auth.users.id이며 이건 기사·동승자·학원장·학부모 누구나 가질 수
// 있으므로 actor의 authUserId로 1차 검증).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

export async function markNotificationRead(
  actor: CurrentUser,
  notificationId: string,
): Promise<void> {
  await db.notification.updateMany({
    where: {
      id: notificationId,
      userId: actor.authUserId,
      readAt: null,
    },
    data: { readAt: new Date() },
  });
}
