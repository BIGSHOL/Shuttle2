import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";

import { NotificationList } from "./notification-list";

export default async function OwnerNotificationsPage() {
  const me = await requireOwner();

  const notifications = await db.notification.findMany({
    where: { userId: me.authUserId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <main className="mx-auto max-w-3xl space-y-3 px-4 pt-4 pb-6 lg:px-6">
      <NotificationList items={notifications} />
    </main>
  );
}
