import { redirect } from "next/navigation";

import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";
import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";

import { DriverHeader } from "@/app/(driver)/driver-header";

// 동승보호자(HELPER) 레이아웃. driver와 동일한 모바일 우선 구조.
export default async function HelperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 그룹은 HELPER 전용. 다른 역할이 잘못 진입하면 본인 home으로.
  const user = await getCurrentUser();
  if (!user) {
    const guardian = await getCurrentGuardian();
    if (guardian) redirect("/home");
    redirect("/login?redirectTo=/helper-run");
  }
  if (user.staff.role !== "HELPER") {
    redirect(homePathForRole(user.staff.role));
  }
  // W24: 학원이 SUSPENDED·TRIAL_EXPIRED면 진입 차단 (재진입 차단).
  if (user.org.status !== "ACTIVE") {
    redirect("/login?suspended=1");
  }

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
