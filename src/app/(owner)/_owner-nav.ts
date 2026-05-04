import {
  Bus,
  CalendarOff,
  FileCheck,
  GraduationCap,
  IdCard,
  LayoutDashboard,
  MapPin,
  MapPinned,
  Route,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react";

// 학원장 nav 공용 정의. 헤더(데스크톱)와 BottomNav(모바일)가 동일 항목을 사용.
// 항목 11개 — 아이콘 + 라벨로 표시.
export type OwnerNavItem = {
  href: string;
  label: string;
  Icon: LucideIcon;
};

export function buildOwnerNav(
  orgType: "ACADEMY" | "DAYCARE" | "KINDERGARTEN",
): OwnerNavItem[] {
  const studentLabel = orgType === "ACADEMY" ? "학생" : "원아";
  return [
    { href: "/dashboard", label: "대시보드", Icon: LayoutDashboard },
    { href: "/vehicles", label: "차량", Icon: Bus },
    { href: "/stops", label: "정류장", Icon: MapPin },
    { href: "/routes", label: "노선", Icon: Route },
    { href: "/students", label: studentLabel, Icon: Users },
    { href: "/staff", label: "직원", Icon: IdCard },
    { href: "/guardians", label: "보호자", Icon: ShieldCheck },
    { href: "/absences", label: "결석", Icon: CalendarOff },
    { href: "/stop-change-requests", label: "정류장 변경", Icon: MapPinned },
    { href: "/training", label: "안전교육", Icon: GraduationCap },
    { href: "/safety-report", label: "안전기록", Icon: FileCheck },
  ];
}
