"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

import { buildOwnerNav, findActiveNavHref } from "./_owner-nav";

// 학원장 모바일 하단 nav. 항목 11개 — 4-tab 등분으로 부족해서 가로 스크롤.
// 큰 아이콘 + 라벨로 모바일 엄지 조작 친화. safe-area-inset-bottom으로 iOS
// home indicator 가림 방지.
//
// 좌우 끝 fade(mask-image)로 "더 있음" 시각 시그널 — 사용자가 스크롤 가능성을
// 곧바로 인지. 끝 항목은 살짝 투명하게 페이드되며, 우측 끝까지 스크롤하면
// 우측 페이드가 자연스럽게 사라짐.
//
// lg 이상에서는 데스크톱 헤더 안의 nav가 활성화되므로 이 컴포넌트는 lg:hidden.
export function OwnerBottomNav({
  orgType,
}: {
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN";
}) {
  const pathname = usePathname();
  const nav = buildOwnerNav(orgType);
  // 가장 긴 prefix match 1개만 active — sub-route 진입 시 부모도 active 되는 버그 방지.
  const activeHref = findActiveNavHref(pathname, nav);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 페이지 전환 시 active 항목을 화면 가운데로 자동 스크롤. 사용자가 현재 위치
  // + 양쪽에 다른 항목이 더 있음을 자연스럽게 인지.
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    const active = container.querySelector<HTMLElement>(
      '[aria-current="page"]',
    );
    if (!active) return;
    const targetLeft =
      active.offsetLeft - (container.clientWidth - active.offsetWidth) / 2;
    container.scrollTo({ left: Math.max(0, targetLeft), behavior: "smooth" });
  }, [pathname]);

  return (
    <nav
      aria-label="주 탐색"
      className="bg-background/95 supports-backdrop-filter:backdrop-blur fixed inset-x-0 bottom-0 z-30 border-t pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <div
        ref={scrollRef}
        className="scrollbar-hide flex items-stretch gap-0.5 overflow-x-auto px-3 py-2 [mask-image:linear-gradient(to_right,transparent_0,black_1.25rem,black_calc(100%-1.25rem),transparent_100%)] [-webkit-mask-image:linear-gradient(to_right,transparent_0,black_1.25rem,black_calc(100%-1.25rem),transparent_100%)]"
      >
        {nav.map(({ href, label, Icon }) => {
          const active = href === activeHref;
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
