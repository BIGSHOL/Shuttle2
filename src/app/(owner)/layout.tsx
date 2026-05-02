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

  return (
    <div className="bg-muted/40 min-h-screen">
      <OwnerHeader
        orgName={user.org.name}
        orgType={user.org.type}
        email={user.email}
      />
      {children}
    </div>
  );
}
