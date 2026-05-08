"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  Home,
  MapPin,
  User,
  type LucideIcon,
} from "lucide-react";

// W24-D Phase 1: refac data/refac/design-files/Parent App.html 의 .bottom-nav
// 4탭 idiom. 홈·실시간·알림·내 정보. 결석·정류장 변경은 home의 "빠른 처리"
// 또는 내 정보 페이지 list로 진입.
//
// trip-live 풀스크린(fixed inset-0 z-50)는 이 탭바를 가려도 OK — z-30 < z-50.

type TabDef = {
  href: string;
  // 정확 매칭 + 자식 path까지 active로 칠 prefix들
  matchPrefixes: string[];
  label: string;
  Icon: LucideIcon;
  badge?: number;
};

export function ParentBottomTabs({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  const tabs: TabDef[] = [
    { href: "/home", matchPrefixes: ["/home"], label: "홈", Icon: Home },
    {
      href: "/trip-live",
      matchPrefixes: ["/trip-live"],
      label: "실시간",
      Icon: MapPin,
    },
    {
      href: "/notifications",
      matchPrefixes: ["/notifications"],
      label: "알림",
      Icon: Bell,
      badge: unreadCount,
    },
    {
      href: "/me",
      matchPrefixes: ["/me", "/my-absences", "/my-stop-changes"],
      label: "내 정보",
      Icon: User,
    },
  ];

  return (
    <nav
      aria-label="주 탐색"
      className="bg-background/95 supports-backdrop-filter:backdrop-blur sticky bottom-0 z-30 mx-auto flex w-full max-w-md border-t pb-[env(safe-area-inset-bottom)]"
    >
      {tabs.map(({ href, matchPrefixes, label, Icon, badge }) => {
        const isActive = matchPrefixes.some(
          (p) => pathname === p || pathname.startsWith(`${p}/`),
        );
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
    </nav>
  );
}
