"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, HelpCircle } from "lucide-react";
import { useTransition } from "react";

import { logoutAction } from "@/app/(auth)/login/actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 학부모용 모바일 헤더. 알림 벨에 unread count 점.
export function ParentHeader({
  name,
  email,
  childCount,
  unreadCount,
}: {
  name: string;
  email: string;
  childCount: number;
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();

  // W24-D Phase 1 home: refac data/refac/design-files/Parent App.html "01 · /home"
  // 에서 셔틀이 로고·dropdown 헤더 없음 — page hero(GreetingSection)가 헤더 역할.
  // 다른 parent 화면(/notifications, /my-absences 등)은 자체 페이지에 뒤로가기
  // 헤더가 있으므로 ParentHeader 자체를 home에서 숨겨도 안전.
  if (pathname === "/home") return null;

  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="flex items-center justify-between gap-3 p-3">
        <div>
          <h1 className="text-base font-bold tracking-tight">셔틀이</h1>
          <p className="text-muted-foreground text-xs font-medium">
            {name} · 자녀 {childCount}명
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="도움말"
          >
            <Link href="/help?role=guardian">
              <HelpCircle className="h-4 w-4" />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`알림 (${unreadCount}건 안 읽음)`}
            className="relative"
          >
            <Link href="/notifications">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 ? (
                <span className="bg-destructive text-destructive-foreground absolute top-1.5 right-1.5 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] font-bold leading-none">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {name} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium break-all">{email}</p>
                <p className="text-muted-foreground text-xs">학부모</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                disabled={pending}
                onSelect={(e) => {
                  e.preventDefault();
                  startTransition(async () => {
                    await logoutAction();
                  });
                }}
              >
                {pending ? "로그아웃 중..." : "로그아웃"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
