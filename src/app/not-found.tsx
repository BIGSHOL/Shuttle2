import Link from "next/link";
import { Bus, Home } from "lucide-react";

import { Button } from "@/components/ui/button";

// 전역 404 — 어떤 role의 사용자든 진입 시 자기 home으로 안내.
// 셔틀이는 학원장/기사/동승자/학부모로 home이 다 다르므로 단순히 한 곳으로
// redirect 안 하고 사용자에게 선택권을 줌.
export default function NotFound() {
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
            <Link href="/">
              <Home className="mr-1.5 h-4 w-4" />
              메인으로
            </Link>
          </Button>
          <p className="text-muted-foreground text-[11px] font-medium">
            로그인 후라면 자동으로 본인 home으로 이동합니다.
          </p>
        </div>
      </div>
    </main>
  );
}
