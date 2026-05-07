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
import { OwnerBottomNav } from "./owner-bottom-nav";
import { OwnerHeader } from "./header";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 이 그룹은 OWNER 전용 — 단, 매니저가 학원장 시점으로 임시 진입(impersonate)
  // 한 경우는 OWNER role이 아니어도 통과 (cookie + 본인이 admin인지 검증).
  // 학부모·기사·동승자가 잘못 진입하면 본인 home으로,
  // 미인증은 /login으로 보내 throw 500이 노출되지 않도록.
  const user = await getCurrentUser();
  if (!user) {
    const guardian = await getCurrentGuardian();
    if (guardian) redirect("/home");
    redirect("/login?redirectTo=/dashboard");
  }

  // W24: 매니저 impersonate cookie 검증 — 본인이 admin이고 cookie 있으면 통과.
  const impersonate =
    isShuttleAdmin(user.email) ? await readImpersonateCookie() : null;

  if (!impersonate && user.staff.role !== "OWNER") {
    redirect(homePathForRole(user.staff.role));
  }
  // W24: 학원이 SUSPENDED·TRIAL_EXPIRED면 진입 차단 (재진입 차단).
  // 단, impersonation 중이면 매니저 점검을 위해 통과 (운영팀 의도적 진입).
  if (!impersonate && user.org.status !== "ACTIVE") {
    redirect("/login?suspended=1");
  }

  // impersonation 중이면 그 학원의 정보를 헤더에 표시.
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

  // 안 읽은 알림 카운트 (헤더 벨 뱃지) — 본인 계정 기준.
  const unreadCount = await db.notification.count({
    where: { userId: user.authUserId, readAt: null },
  });

  return (
    // pb-20 lg:pb-0 — 모바일에서 fixed bottom nav 가림 방지, 데스크톱은 0.
    <div className="bg-muted/40 min-h-screen pb-20 lg:pb-0">
      {impersonate ? (
        <ImpersonationBanner
          orgName={orgInfo.name}
          adminEmail={impersonate.adminEmail}
        />
      ) : null}
      <OwnerHeader
        orgName={orgInfo.name}
        orgType={orgInfo.type}
        email={user.email}
        unreadCount={unreadCount}
      />
      <SwRegister />
      {children}
      <OwnerBottomNav orgType={orgInfo.type} />
    </div>
  );
}
