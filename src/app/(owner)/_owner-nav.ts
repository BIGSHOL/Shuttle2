import {
  BarChart3,
  Bus,
  FileCheck,
  GraduationCap,
  IdCard,
  Inbox,
  LayoutDashboard,
  MapPin,
  Route,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

// 학원장 nav 공용 정의. 헤더(데스크톱)와 BottomNav(모바일)가 동일 항목을 사용.
// 항목 12개 — 아이콘 + 라벨로 표시.
export type OwnerNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
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
    { href: "/dashboard", label: "대시보드", Icon: LayoutDashboard },
    { href: "/pending", label: "처리 큐", Icon: Inbox },
    { href: "/vehicles", label: "차량", Icon: Bus },
    { href: "/stops", label: "정류장", Icon: MapPin },
    { href: "/routes", label: "노선", Icon: Route },
    { href: "/students", label: studentLabel, Icon: Users },
    { href: "/staff", label: "직원", Icon: IdCard },
    { href: "/guardians", label: "보호자", Icon: ShieldCheck },
    { href: "/training", label: "안전교육", Icon: GraduationCap },
    { href: "/dashboard/analytics", label: "분석", Icon: BarChart3 },
    { href: "/safety-report", label: "안전기록", Icon: FileCheck },
  ];
}
