import {
  BarChart3,
  Bell,
  Bus,
  CalendarOff,
  CreditCard,
  FileCheck,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  MapPin,
  MapPinned,
  Route,
  Settings,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

// 학원장 nav 공용 정의. 헤더(데스크톱)와 BottomNav(모바일)가 동일 항목을 사용.
// 항목 12개 — 아이콘 + 라벨로 표시.
export type OwnerNavGroup = "main" | "manage" | "request" | "legal" | "footer";

export type OwnerNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
  group: OwnerNavGroup;
  /**
   * 사이드바·하단 nav에 미처리 카운트 dot 표시용 키.
   * layout에서 db count 결과를 props로 주입할 때 매칭.
   */
  countKey?: "absences" | "stopChanges" | "notifications";
};

/**
 * pathname에 가장 잘 매칭되는 nav 항목의 href를 반환. 매칭 없으면 null.
 *
 * 단순 `pathname.startsWith(href + "/")` 만 쓰면 `/dashboard/analytics` 진입 시
 * "대시보드"(`/dashboard`)와 "분석"(`/dashboard/analytics`) 둘 다 매칭돼서 두
 * nav 항목이 동시에 active로 보이는 버그가 발생. 가장 긴 prefix match만 active로
 * 잡아 sub-route 항목이 우선되게 한다.
 */
export function findActiveNavHref(
  pathname: string,
  items: readonly { href: string }[],
): string | null {
  let best: { href: string; len: number } | null = null;
  for (const item of items) {
    const matches =
      pathname === item.href || pathname.startsWith(`${item.href}/`);
    if (!matches) continue;
    if (!best || item.href.length > best.len) {
      best = { href: item.href, len: item.href.length };
    }
  }
  return best?.href ?? null;
}

export function buildOwnerNav(
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN",
): OwnerNavItem[] {
  const studentLabel = orgType === "ACADEMY" ? "학생" : "원아";
  return [
    // 메인
    { href: "/dashboard", label: "대시보드", Icon: LayoutDashboard, group: "main" },
    { href: "/dashboard/analytics", label: "운행 분석", Icon: BarChart3, group: "main" },
    {
      href: "/dashboard/notifications",
      label: "알림",
      Icon: Bell,
      group: "main",
      countKey: "notifications",
    },
    // 관리
    { href: "/students", label: studentLabel, Icon: Users, group: "manage" },
    { href: "/vehicles", label: "차량", Icon: Bus, group: "manage" },
    { href: "/routes", label: "노선", Icon: Route, group: "manage" },
    { href: "/stops", label: "정류장", Icon: MapPin, group: "manage" },
    { href: "/staff", label: "직원", Icon: IdCard, group: "manage" },
    { href: "/guardians", label: "보호자", Icon: ShieldCheck, group: "manage" },
    { href: "/training", label: "안전교육", Icon: GraduationCap, group: "manage" },
    // 요청
    {
      href: "/absences",
      label: "결석",
      Icon: CalendarOff,
      group: "request",
      countKey: "absences",
    },
    {
      href: "/stop-change-requests",
      label: "정류장 변경",
      Icon: MapPinned,
      group: "request",
      countKey: "stopChanges",
    },
    // 법규
    { href: "/safety-report", label: "안전운행기록", Icon: FileCheck, group: "legal" },
    // 푸터 (데스크톱 사이드바 하단 / 모바일은 사용자 메뉴 dropdown에서)
    { href: "/billing", label: "요금·청구", Icon: CreditCard, group: "footer" },
    { href: "/settings", label: "설정", Icon: Settings, group: "footer" },
  ];
}

export const OWNER_NAV_GROUP_LABEL: Record<OwnerNavGroup, string> = {
  main: "메인",
  manage: "관리",
  request: "요청",
  legal: "법규",
  footer: "기타",
};
