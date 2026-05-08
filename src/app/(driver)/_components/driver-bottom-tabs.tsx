"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  CircleHelp,
  Home,
  User,
  type LucideIcon,
} from "lucide-react";
import { useTransition } from "react";

import { logoutAction } from "@/app/(auth)/login/actions";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// 기사 모바일 BottomTabBar (W24-A). 학부모 ParentBottomTabs 패턴 동일.
// 운행 화면이 풀스크린이 아니라 inline main이라 BottomTabBar가 항상 보임.

type TabDef = {
  href: string;
  matchPrefixes: string[];
  label: string;
  Icon: LucideIcon;
  badge?: number;
};

export function DriverBottomTabs({
  unreadCount,
  email,
  staffName,
}: {
  unreadCount: number;
  email: string;
  staffName: string;
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  // 홈/알림/도움말 — 일반 link 탭
  const linkTabs: TabDef[] = [
    {
      href: "/run",
      // /run 자체와 /trip/* (운행 화면) 모두 홈 탭으로 활성
      matchPrefixes: ["/run", "/trip"],
      label: "홈",
      Icon: Home,
    },
    {
      href: "/run/notifications",
      matchPrefixes: ["/run/notifications"],
      label: "알림",
      Icon: Bell,
      badge: unreadCount,
    },
    {
      href: "/help?role=driver",
      matchPrefixes: ["/help"],
      label: "도움말",
      Icon: CircleHelp,
    },
  ];

  function isActiveTab(t: TabDef): boolean {
    // /run 탭은 정확 매칭 우선 (/run/notifications가 알림 탭으로만 활성)
    if (t.href === "/run") {
      return pathname === "/run" || pathname.startsWith("/trip/");
    }
    return t.matchPrefixes.some(
      (p) => pathname === p || pathname.startsWith(`${p}/`),
    );
  }

  return (
    <nav
      aria-label="주 탐색"
      className="bg-background/95 supports-backdrop-filter:backdrop-blur sticky bottom-0 z-30 mx-auto flex w-full max-w-md border-t pb-[env(safe-area-inset-bottom)]"
    >
      {linkTabs.map((t) => {
        const isActive = isActiveTab(t);
        const { Icon, label, badge, href } = t;
        return (
          <Link
            key={href}
            href={href}
            aria-current={isActive ? "page" : undefined}
            aria-label={badge ? `${label} (${badge}건 안 읽음)` : label}
            className={`relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-extrabold tracking-wide ${
              isActive ? "text-bus" : "text-muted-foreground"
            }`}
          >
            <span className="relative">
              <Icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              {badge && badge > 0 ? (
                <span className="bg-destructive text-destructive-foreground absolute -top-1 -right-2 inline-flex h-3.5 min-w-[14px] items-center justify-center rounded-full px-1 text-[9px] leading-none">
                  {badge > 99 ? "99+" : badge}
                </span>
              ) : null}
            </span>
            <span>{label}</span>
            {isActive ? (
              <span
                aria-hidden
                className="bg-bus absolute -top-px left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full"
              />
            ) : null}
          </Link>
        );
      })}

      {/* 프로필 탭 — DriverHeader 우측 dropdown 트리거 외부화 */}
      <DropdownMenu>
        <DropdownMenuTrigger
          className="text-muted-foreground hover:text-foreground relative flex flex-1 flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-extrabold tracking-wide outline-none focus-visible:text-foreground"
          aria-label="프로필"
        >
          <User className="h-5 w-5" strokeWidth={2} />
          <span>프로필</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" side="top" className="min-w-[220px]">
          <DropdownMenuLabel className="font-normal">
            <p className="text-sm font-medium">{staffName}</p>
            <p className="text-muted-foreground text-xs break-all">{email}</p>
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
    </nav>
  );
}
