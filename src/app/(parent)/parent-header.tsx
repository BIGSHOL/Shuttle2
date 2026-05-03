"use client";

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

// 학부모용 모바일 헤더. docs/02 spec:
// 좌측 셔틀이 로고 + 자녀 N명 sub, 우측 알림 벨(준비 중) + 사용자 메뉴.
// /notifications 라우트는 다음 세션 — 이번엔 벨 disabled.
export function ParentHeader({
  name,
  email,
  childCount,
}: {
  name: string;
  email: string;
  childCount: number;
}) {
  const [pending, startTransition] = useTransition();

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
            variant="ghost"
            size="icon"
            disabled
            aria-label="알림 (준비 중)"
            className="text-muted-foreground"
          >
            <Bell className="h-4 w-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                {name} ▾
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{email}</p>
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
