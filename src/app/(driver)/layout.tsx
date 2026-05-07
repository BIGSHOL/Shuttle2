import { redirect } from "next/navigation";

import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";
import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";

import { DriverHeader } from "./driver-header";

// 기사 레이아웃. 모바일 우선 — 데스크톱에서도 max-w-md로 모바일 폭 고정.
// 운행 화면은 본인이 풀스크린(fixed inset-0)으로 띄울 수 있음.
export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 그룹은 DRIVER 전용. 다른 역할이 잘못 진입하면 본인 home으로,
  // 미인증은 /login으로 보내 throw 500이 노출되지 않도록.
  const user = await getCurrentUser();
  if (!user) {
    const guardian = await getCurrentGuardian();
    if (guardian) redirect("/home");
    redirect("/login?redirectTo=/run");
  }
  if (user.staff.role !== "DRIVER") {
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
        role="DRIVER"
        email={user.email}
        staffName={user.staff.name}
        unreadCount={unreadCount}
      />
      <SwRegister />
      <div className="flex-1">{children}</div>
    </div>
  );
}
