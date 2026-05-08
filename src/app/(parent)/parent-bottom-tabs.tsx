"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, MapPin, User, type LucideIcon } from "lucide-react";

// W24-D Phase 1: refac Parent App.html .bottom-nav 4탭 idiom.
// 픽셀 단위 align — refac CSS:
//
//   .bottom-nav{position:absolute;bottom:0;background:rgba(255,255,255,0.94);
//               backdrop-filter:blur(12px);border-top:1px solid var(--border);
//               display:grid;grid-template-columns:repeat(4,1fr);padding:8px 8px 18px}
//   .bn{display:flex;flex-direction:column;align-items:center;gap:2px;
//       font-size:10px;font-weight:800;color:var(--muted-foreground);padding:6px 4px}
//   .bn.on{color:var(--bus-foreground)}
//   .bn svg{width:20px;height:20px;stroke-width:2.25}
//   .bn.on svg{color:var(--bus-foreground);fill:var(--bus-soft)}

type TabDef = {
  href: string;
  matchPrefixes: string[];
  label: string;
  Icon: LucideIcon;
  badge?: number;
};

export function ParentBottomTabs({ unreadCount }: { unreadCount: number }) {
  const pathname = usePathname();

  // refac form pages(absences/new·stop-change/new)는 자체 bottom-cta sticky이고
  // bottom-nav 없음. trip-live는 fullscreen이라 z-50으로 가려져도 무방.
  const HIDE_ON: (string | RegExp)[] = [
    "/my-absences/new",
    "/my-stop-changes/new",
    /^\/trip-live(\/|$)/,
  ];
  const hide = HIDE_ON.some((p) =>
    typeof p === "string" ? pathname === p : p.test(pathname),
  );
  if (hide) return null;

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
      className="border-border sticky bottom-0 z-30 mx-auto grid w-full max-w-md grid-cols-4 border-t bg-white/95 px-2 pt-2 pb-[18px] backdrop-blur-md"
      style={{ paddingBottom: "max(18px, env(safe-area-inset-bottom))" }}
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
            className={`relative flex flex-col items-center gap-0.5 px-1 py-1.5 text-[10px] font-extrabold ${
              isActive ? "text-bus-foreground" : "text-muted-foreground"
            }`}
          >
            <span className="relative">
              {/* refac .bn.on svg{fill:var(--bus-soft)} — 활성 탭 아이콘 안쪽이 노란 soft fill */}
              <Icon
                className="h-5 w-5"
                strokeWidth={2.25}
                fill={isActive ? "var(--bus-soft)" : "none"}
              />
              {badge && badge > 0 ? (
                <span className="bg-destructive border-card absolute -top-0.5 -right-1.5 inline-flex h-[7px] min-w-[7px] items-center justify-center rounded-full border-[1.5px]" />
              ) : null}
            </span>
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
