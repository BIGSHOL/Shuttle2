import Link from "next/link";
import { Bus, Home } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";

// 전역 404 — 세션에 따라 본인 home 경로를 미리 resolve해 버튼 링크에 반영.
// 학원장→/dashboard, 기사→/run, 동승자→/helper-run, 학부모→/home, 비-로그인→/.
async function resolveHomeHref(): Promise<{ href: string; label: string }> {
  try {
    const user = await getCurrentUser();
    if (user) return { href: homePathForRole(user.staff.role), label: "내 home으로" };
    const guardian = await getCurrentGuardian();
    if (guardian) return { href: "/home", label: "내 home으로" };
  } catch {
    // 세션 조회 실패는 무시하고 marketing landing으로 fallback.
  }
  return { href: "/", label: "메인으로" };
}

export default async function NotFound() {
  const { href, label } = await resolveHomeHref();

  return (
    <main className="bg-muted/30 flex min-h-screen items-center justify-center p-6">
      <div className="bg-card w-full max-w-md space-y-6 rounded-lg border p-8 text-center shadow-sm">
        <div className="bg-bus-soft text-bus mx-auto flex h-14 w-14 items-center justify-center rounded-full">
          <Bus className="h-7 w-7" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight">
            페이지를 찾을 수 없어요
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            주소가 바뀌었거나, 더 이상 존재하지 않는 페이지입니다.
          </p>
        </div>
        <div className="flex flex-col gap-2">
          <Button asChild className="w-full">
            <Link href={href}>
              <Home className="mr-1.5 h-4 w-4" />
              {label}
            </Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
