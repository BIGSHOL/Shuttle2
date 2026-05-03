"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
import { cn } from "@/lib/utils";

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

function buildNav(orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN") {
  const studentLabel = orgType === "ACADEMY" ? "학생" : "원아";
  return [
    { href: "/dashboard", label: "대시보드" },
    { href: "/vehicles", label: "차량" },
    { href: "/stops", label: "정류장" },
    { href: "/routes", label: "노선" },
    { href: "/students", label: studentLabel },
    { href: "/staff", label: "직원" },
    { href: "/guardians", label: "보호자" },
    { href: "/absences", label: "결석" },
    { href: "/stop-change-requests", label: "정류장 변경" },
    { href: "/training", label: "안전교육" },
    { href: "/safety-report", label: "안전기록" },
  ];
}

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
  const nav = buildNav(orgType);

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
          <nav className="hidden items-center gap-0.5 lg:flex">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary/10 text-primary font-bold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {item.label}
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
            <DropdownMenuContent align="end">
              <DropdownMenuLabel className="font-normal">
                <p className="text-sm font-medium">{email}</p>
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

      {/* 모바일/태블릿: 가로 스크롤 nav */}
      <nav className="border-t lg:hidden">
        <div className="scrollbar-hide flex items-center gap-0.5 overflow-x-auto px-2 py-1.5">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary font-bold"
                    : "text-muted-foreground hover:bg-muted",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
