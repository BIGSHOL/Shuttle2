import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";
import { requireHelper } from "@/lib/auth/session";

import { DriverHeader } from "@/app/(driver)/driver-header";

// 동승보호자(HELPER) 레이아웃. driver와 동일한 모바일 우선 구조.
export default async function HelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireHelper();

  // 안 읽은 알림 카운트 (헤더 벨 뱃지)
  const unreadCount = await db.notification.count({
    where: { userId: user.authUserId, readAt: null },
  });

  return (
    <div className="bg-muted/40 mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <DriverHeader
        orgName={user.org.name}
        role="HELPER"
        email={user.email}
        staffName={user.staff.name}
        unreadCount={unreadCount}
      />
      <SwRegister />
      <div className="flex-1">{children}</div>
    </div>
  );
}
