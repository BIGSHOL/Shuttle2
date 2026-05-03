import { db } from "@/lib/db";
import { requireDriverOrHelper } from "@/lib/auth/session";

import { NotificationList } from "./notification-list";

export default async function DriverNotificationsPage() {
  const me = await requireDriverOrHelper();

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
