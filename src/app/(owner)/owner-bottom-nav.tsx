"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

import { buildOwnerNav } from "./_owner-nav";

// 학원장 모바일 하단 nav. 항목 11개 — 4-tab 등분으로 부족해서 가로 스크롤.
// 큰 아이콘 + 라벨로 모바일 엄지 조작 친화. safe-area-inset-bottom으로 iOS
// home indicator 가림 방지. scrollbar-hide로 스크롤바 숨김 (스와이프는 가능).
//
// lg 이상에서는 데스크톱 헤더 안의 nav가 활성화되므로 이 컴포넌트는 lg:hidden.
export function OwnerBottomNav({
  orgType,
}: {
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
}) {
  const pathname = usePathname();
  const nav = buildOwnerNav(orgType);

  return (
    <nav
      aria-label="주 탐색"
      className="bg-background/95 supports-backdrop-filter:backdrop-blur fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div className="scrollbar-hide flex items-stretch gap-0.5 overflow-x-auto px-2 py-2">
        {nav.map(({ href, label, Icon }) => {
          const active =
            pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex shrink-0 flex-col items-center justify-center gap-1 rounded-md px-3 py-1.5 text-[10px] font-bold tracking-tight transition-colors",
                active
                  ? "bg-primary/10 text-primary font-extrabold"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
