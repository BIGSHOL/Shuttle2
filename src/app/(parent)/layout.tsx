import { requireGuardian } from "@/lib/auth/session";

import { ParentHeader } from "./parent-header";
import { SwRegister } from "./sw-register";

// 학부모 레이아웃. 모바일 우선 — 데스크톱에서도 max-w-md로 모바일 폭 고정.
// 100dvh로 iOS Safari address bar 변화에도 안정. trip-live는 본인이 fixed
// inset-0 z-50으로 풀스크린 띄워 헤더를 시각적으로 가린다.
export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const me = await requireGuardian();

  return (
    <div className="bg-muted/40 mx-auto flex min-h-[100dvh] max-w-md flex-col">
      <ParentHeader
        name={me.guardian.name}
        email={me.email}
        childCount={me.students.length}
      />
      <SwRegister />
      <div className="flex-1">{children}</div>
    </div>
  );
}
