"use client";

import Link from "next/link";
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

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

export function OwnerHeader({
  orgName,
  orgType,
  email,
  unreadCount,
}: {
  orgName: string;
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
  email: string;
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();

  // 모바일/태블릿(<lg) 전용 헤더. 데스크톱은 OwnerSidebar가 모든 nav·사용자
  // 메뉴를 담당해서 헤더 자체를 숨김(lg:hidden). 모바일에서는 sticky top에
  // 학원명 + 알림 종 + 도움말 + 사용자 메뉴만 노출. 좌측 위에 OwnerBottomNav
  // (lg:hidden)가 메인 nav 항목을 담당.
  return (
    <header className="bg-background sticky top-0 z-30 border-b lg:hidden">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3">
        <div className="flex min-w-0 items-center gap-4">
          <Link
            href="/dashboard"
            className="block shrink-0 transition-opacity hover:opacity-80"
          >
            <h1 className="truncate text-base font-extrabold tracking-tight">
              {orgName}
            </h1>
            <p className="text-muted-foreground text-[10px] font-medium">
              {ORG_TYPE_LABEL[orgType]} · 셔틀이
            </p>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label="도움말"
          >
            <Link href="/help?role=owner">
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
            <Link href="/dashboard/notifications">
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
                {email.split("@")[0]} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[220px]">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium break-all">{email}</p>
                <p className="text-muted-foreground text-xs">학원장·원장</p>
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
