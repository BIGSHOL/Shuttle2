import { SwRegister } from "@/components/sw-register";
import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";

import { OwnerHeader } from "./header";

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // (owner) 진입점 가드 — 미인증·비OWNER 차단.
  // React cache 덕분에 같은 요청에서 자식이 또 호출해도 DB 추가 호출 없음.
  const user = await requireOwner();

  // 안 읽은 알림 카운트 (헤더 벨 뱃지)
  const unreadCount = await db.notification.count({
    where: { userId: user.authUserId, readAt: null },
  });

  return (
    <div className="bg-muted/40 min-h-screen">
      <OwnerHeader
        orgName={user.org.name}
        orgType={user.org.type}
        email={user.email}
        unreadCount={unreadCount}
      />
      <SwRegister />
      {children}
    </div>
  );
}
