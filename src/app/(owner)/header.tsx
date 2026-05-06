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
import { cn } from "@/lib/utils";

import { buildOwnerNav, findActiveNavHref } from "./_owner-nav";

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
  const pathname = usePathname();
  const nav = buildOwnerNav(orgType);
  // 가장 긴 prefix match 1개만 active — sub-route 진입 시 부모도 active 되는 버그 방지.
  const activeHref = findActiveNavHref(pathname, nav);

  return (
    <header className="bg-background sticky top-0 z-30 border-b">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 lg:px-6">
        <div className="flex min-w-0 items-center gap-4 lg:gap-6">
          <Link
            href="/dashboard"
            className="block shrink-0 transition-opacity hover:opacity-80"
          >
            <h1 className="truncate text-base font-extrabold tracking-tight lg:text-lg">
              {orgName}
            </h1>
            <p className="text-muted-foreground text-[10px] font-medium lg:text-xs">
              {ORG_TYPE_LABEL[orgType]} · 셔틀이
            </p>
          </Link>
          {/* 데스크톱 — 아이콘 + 라벨 (라벨 아래에 위치) */}
          <nav
            aria-label="주 탐색"
            className="hidden items-stretch gap-0.5 lg:flex"
          >
            {nav.map(({ href, label, Icon }) => {
              const active = href === activeHref;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex flex-col items-center justify-center gap-0.5 rounded-md px-2.5 py-1 text-[11px] font-bold tracking-tight transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-extrabold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className="h-4 w-4"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>
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
      {/* 모바일/태블릿 nav는 OwnerBottomNav (layout에서 fixed bottom으로 마운트) */}
    </header>
  );
}
