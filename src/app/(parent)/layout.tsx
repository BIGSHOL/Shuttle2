import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";

import { SwRegister } from "@/components/sw-register";

import { ParentBottomTabs } from "./parent-bottom-tabs";
import { ParentHeader } from "./parent-header";

// 학부모 레이아웃. 모바일 우선 — 데스크톱에서도 max-w-md로 모바일 폭 고정.
// 100dvh로 iOS Safari address bar 변화에도 안정. trip-live는 본인이 fixed
// inset-0 z-50으로 풀스크린 띄워 헤더를 시각적으로 가린다.
export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 그룹은 GUARDIAN 전용. OWNER·DRIVER·HELPER는 자기 역할 home으로,
  // 미인증은 /login으로 보내 throw 500이 노출되지 않도록.
  const me = await getCurrentGuardian();
  if (!me) {
    const staff = await getCurrentUser();
    if (staff) redirect(homePathForRole(staff.staff.role));
    redirect("/login?redirectTo=/home");
  }
  // W24: 자녀 학원이 모두 비-ACTIVE이면 차단. 1곳이라도 ACTIVE면 통과.
  if (me.students.length > 0) {
    const anyActive = me.students.some((s) => s.orgStatus === "ACTIVE");
    if (!anyActive) redirect("/login?suspended=1");
  }

  // 안 읽은 알림 카운트 (헤더 벨 뱃지)
  const unreadCount = await db.notification.count({
    where: { userId: me.authUserId, readAt: null },
  });

  return (
    <div className="bg-muted/40 mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <ParentHeader
        name={me.guardian.name}
        email={me.email}
        childCount={me.students.length}
        unreadCount={unreadCount}
      />
      <SwRegister />
      <div className="flex-1">{children}</div>
      <ParentBottomTabs unreadCount={unreadCount} />
    </div>
  );
}
