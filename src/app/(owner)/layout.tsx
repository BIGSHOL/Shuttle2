import { redirect } from "next/navigation";

import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";
import { isShuttleAdmin } from "@/lib/auth/admin";
import { readImpersonateCookie } from "@/lib/auth/impersonate";
import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";

import { ImpersonationBanner } from "./_components/impersonation-banner";
import { OwnerSidebar } from "./_components/owner-sidebar";
import { OwnerBottomNav } from "./owner-bottom-nav";
import { OwnerHeader } from "./header";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 그룹은 OWNER 전용 — 단, 매니저가 학원장 시점으로 임시 진입(impersonate)
  // 한 경우는 OWNER role이 아니어도 통과 (cookie + 본인이 admin인지 검증).
  const user = await getCurrentUser();
  if (!user) {
    const guardian = await getCurrentGuardian();
    if (guardian) redirect("/home");
    redirect("/login?redirectTo=/dashboard");
  }

  const impersonate =
    isShuttleAdmin(user.email) ? await readImpersonateCookie() : null;

  if (!impersonate && user.staff.role !== "OWNER") {
    redirect(homePathForRole(user.staff.role));
  }
  if (!impersonate && user.org.status !== "ACTIVE") {
    redirect("/login?suspended=1");
  }

  let orgInfo = {
    id: user.org.id,
    name: user.org.name,
    type: user.org.type,
  };
  if (impersonate) {
    const target = await db.organization.findUnique({
      where: { id: impersonate.orgId },
      select: { id: true, name: true, type: true },
    });
    if (target) orgInfo = target;
  }

  // 사이드바·하단 nav에 미처리 카운트 dot 표시 — 알림·결석·정류장 변경.
  const [unreadCount, pendingAbsences, pendingStopChanges] = await Promise.all([
    db.notification.count({
      where: { userId: user.authUserId, readAt: null },
    }),
    db.absenceRequest.count({
      where: {
        student: { orgId: orgInfo.id },
        status: { in: ["PENDING", "NOTIFIED_DRIVER"] },
      },
    }),
    db.stopChangeRequest.count({
      where: {
        student: { orgId: orgInfo.id },
        status: "PENDING",
      },
    }),
  ]);

  return (
    // 모바일: bottom nav 가림 방지 pb-20. 데스크톱: 좌측 사이드바 만큼 pl-60.
    <div className="bg-muted/40 min-h-screen pb-20 lg:pb-0 lg:pl-60">
      {impersonate ? (
        <ImpersonationBanner
          orgName={orgInfo.name}
          adminEmail={impersonate.adminEmail}
        />
      ) : null}

      {/* 데스크톱 사이드바 (lg+ 좌측 fixed) */}
      <OwnerSidebar
        orgName={orgInfo.name}
        orgType={orgInfo.type}
        email={user.email}
        unreadCount={unreadCount}
        pendingAbsences={pendingAbsences}
        pendingStopChanges={pendingStopChanges}
      />

      {/* 모바일 헤더 (lg 미만 sticky top) */}
      <OwnerHeader
        orgName={orgInfo.name}
        orgType={orgInfo.type}
        email={user.email}
        unreadCount={unreadCount}
      />
      <SwRegister />
      {children}

      {/* 모바일 하단 nav (lg 미만 fixed bottom) */}
      <OwnerBottomNav orgType={orgInfo.type} />
    </div>
  );
}
