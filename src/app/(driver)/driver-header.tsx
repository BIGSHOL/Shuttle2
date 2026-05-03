"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
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

const ROLE_LABEL = {
  DRIVER: "기사",
  HELPER: "동승보호자",
  OWNER: "학원장·원장",
} as const;

// 기사용 모바일 헤더. parent-header와 동일 스타일. 알림 벨 unread 배지.
export function DriverHeader({
  orgName,
  role,
  email,
  staffName,
  unreadCount,
}: {
  orgName: string;
  role: "DRIVER" | "HELPER";
  email: string;
  staffName: string;
  unreadCount: number;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-bold tracking-tight">
            {orgName}
          </h1>
          <p className="text-muted-foreground text-xs font-medium">
            {ROLE_LABEL[role]} · {staffName}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={`알림 (${unreadCount}건 안 읽음)`}
            className="relative"
          >
            <Link href="/run/notifications">
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
                {staffName} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{email}</p>
                <p className="text-muted-foreground text-xs">
                  {ROLE_LABEL[role]}
                </p>
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
