"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bus, HelpCircle, LogOut } from "lucide-react";
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

import {
  buildOwnerNav,
  findActiveNavHref,
  OWNER_NAV_GROUP_LABEL,
  type OwnerNavGroup,
  type OwnerNavItem,
} from "../_owner-nav";

const ORG_TYPE_LABEL: Record<"ACADEMY" | "DAYCARE" | "KINDERGARTEN", string> = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
};

// 데스크톱(lg+) 전용 좌측 사이드바. 셔틀이 로고 + 학원명 / 그룹별 nav / 하단
// 푸터(요금·설정) + 사용자 메뉴. 모바일은 OwnerBottomNav가 담당.
export function OwnerSidebar({
  orgName,
  orgType,
  email,
  unreadCount,
  pendingAbsences,
  pendingStopChanges,
}: {
  orgName: string;
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
  email: string;
  unreadCount: number;
  pendingAbsences: number;
  pendingStopChanges: number;
}) {
  const pathname = usePathname();
  const nav = buildOwnerNav(orgType);
  const activeHref = findActiveNavHref(pathname, nav);
  const [pending, startTransition] = useTransition();

  const counts: Record<NonNullable<OwnerNavItem["countKey"]>, number> = {
    absences: pendingAbsences,
    stopChanges: pendingStopChanges,
    notifications: unreadCount,
  };

  // 그룹별로 묶기. footer 그룹은 별도 영역에 렌더.
  const grouped = nav.reduce<Record<OwnerNavGroup, OwnerNavItem[]>>(
    (acc, item) => {
      (acc[item.group] ??= []).push(item);
      return acc;
    },
    { main: [], manage: [], request: [], legal: [], footer: [] },
  );
  const navGroups: OwnerNavGroup[] = ["main", "manage", "request", "legal"];

  return (
    <aside className="bg-background hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-30 lg:flex lg:w-60 lg:flex-col lg:border-r">
      {/* 상단: 로고 + 학원명 */}
      <Link
        href="/dashboard"
        className="hover:bg-muted/40 flex items-center gap-3 border-b px-4 py-4 transition-colors"
      >
        <span className="bg-bus text-bus-foreground border-bus-foreground/15 flex h-9 w-9 shrink-0 items-center justify-center rounded-md border-2 shadow-sm">
          <Bus className="h-5 w-5" strokeWidth={2.5} />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-extrabold tracking-tight">
            {orgName}
          </h1>
          <p className="text-muted-foreground truncate text-[11px] font-medium">
            {ORG_TYPE_LABEL[orgType]} · 셔틀이
          </p>
        </div>
      </Link>

      {/* nav 그룹들 */}
      <nav
        aria-label="주 탐색"
        className="scrollbar-hide flex-1 space-y-5 overflow-y-auto px-3 py-4"
      >
        {navGroups.map((g) => {
          const items = grouped[g];
          if (items.length === 0) return null;
          return (
            <div key={g}>
              <h3 className="text-muted-foreground/80 mb-1.5 px-2 text-[10px] font-semibold tracking-wider uppercase">
                {OWNER_NAV_GROUP_LABEL[g]}
              </h3>
              <ul className="space-y-0.5">
                {items.map(({ href, label, Icon, countKey }) => {
                  const active = href === activeHref;
                  const count = countKey ? counts[countKey] : 0;
                  return (
                    <li key={href}>
                      <Link
                        href={href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-bold tracking-tight transition-colors",
                          active
                            ? "bg-bus-soft text-bus-foreground font-extrabold"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground",
                        )}
                      >
                        <Icon
                          className="h-4 w-4 shrink-0"
                          strokeWidth={active ? 2.5 : 2}
                        />
                        <span className="flex-1 truncate">{label}</span>
                        {count > 0 ? (
                          <span className="bg-destructive text-destructive-foreground inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none">
                            {count > 99 ? "99+" : count}
                          </span>
                        ) : null}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      {/* 하단: 푸터 nav (요금·설정) + 사용자 메뉴 */}
      <div className="space-y-1 border-t px-3 py-3">
        <ul className="space-y-0.5">
          {grouped.footer.map(({ href, label, Icon }) => {
            const active = href === activeHref;
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-bold tracking-tight transition-colors",
                    active
                      ? "bg-bus-soft text-bus-foreground font-extrabold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <Icon
                    className="h-4 w-4 shrink-0"
                    strokeWidth={active ? 2.5 : 2}
                  />
                  <span className="flex-1 truncate">{label}</span>
                </Link>
              </li>
            );
          })}
          <li>
            <Link
              href="/help?role=owner"
              className="text-muted-foreground hover:bg-muted hover:text-foreground flex items-center gap-3 rounded-md px-2.5 py-2 text-sm font-bold tracking-tight transition-colors"
            >
              <HelpCircle className="h-4 w-4 shrink-0" />
              <span>도움말</span>
            </Link>
          </li>
        </ul>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              className="hover:bg-muted h-auto w-full justify-start gap-2 rounded-md px-2.5 py-2 text-left"
            >
              <span className="bg-primary text-primary-foreground flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold">
                {email[0]?.toUpperCase() ?? "?"}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-xs font-bold">
                  {email.split("@")[0]}
                </span>
                <span className="text-muted-foreground block truncate text-[10px]">
                  학원장·원장
                </span>
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="min-w-[220px]"
          >
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
              <LogOut className="mr-2 h-3.5 w-3.5" />
              {pending ? "로그아웃 중..." : "로그아웃"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
