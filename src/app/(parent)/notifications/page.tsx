import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

import { NotificationList } from "./notification-list";

export default async function NotificationsPage() {
  // requireGuardian이 미인증이면 throw → middleware가 /login으로 보냄.
  const me = await requireGuardian();

  const notifications = await db.notification.findMany({
    where: { userId: me.authUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="space-y-3 px-4 pt-4 pb-6">
      <NotificationList items={notifications} />
    </main>
  );
}
