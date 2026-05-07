import { redirect } from "next/navigation";

import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";
import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";

import { OwnerBottomNav } from "./owner-bottom-nav";
import { OwnerHeader } from "./header";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 그룹은 OWNER 전용. 학부모·기사·동승자가 잘못 진입하면 본인 home으로,
  // 미인증은 /login으로 보내 throw 500이 노출되지 않도록.
  // React cache 덕분에 같은 요청에서 자식이 또 호출해도 DB 추가 호출 없음.
  const user = await getCurrentUser();
  if (!user) {
    const guardian = await getCurrentGuardian();
    if (guardian) redirect("/home");
    redirect("/login?redirectTo=/dashboard");
  }
  if (user.staff.role !== "OWNER") {
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
    // pb-20 lg:pb-0 — 모바일에서 fixed bottom nav 가림 방지, 데스크톱은 0.
    <div className="bg-muted/40 min-h-screen pb-20 lg:pb-0">
      <OwnerHeader
        orgName={user.org.name}
        orgType={user.org.type}
        email={user.email}
        unreadCount={unreadCount}
      />
      <SwRegister />
      {children}
      <OwnerBottomNav orgType={user.org.type} />
    </div>
  );
}
