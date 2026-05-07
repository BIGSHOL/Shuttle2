import Link from "next/link";
import { redirect } from "next/navigation";

import {
  getCurrentGuardian,
  getCurrentUser,
  homePathForRole,
} from "@/lib/auth/session";
import { isShuttleAdmin } from "@/lib/auth/admin";

// W24: 셔틀이 플랫폼 매니저 진입 가드 + 사이드 nav.
// 비-admin 진입 시 throw 대신 redirect (W18-C 패턴) — 영어 stack trace 차단.
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    const guardian = await getCurrentGuardian();
    if (guardian) redirect("/home");
    redirect("/login?redirectTo=/admin");
  }
  if (!isShuttleAdmin(user.email)) {
    redirect(homePathForRole(user.staff.role));
  }

  return (
    <div className="bg-muted/40 min-h-screen">
      <header className="bg-card sticky top-0 z-30 border-b shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-3">
          <Link href="/admin" className="flex items-center gap-2">
            <span className="bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-extrabold tracking-wide">
              매니저
            </span>
            <span className="text-foreground text-base font-extrabold tracking-tight">
              셔틀이 운영 콘솔
            </span>
          </Link>
          <p className="text-muted-foreground hidden text-xs font-medium sm:block">
            {user.email}
          </p>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl gap-4 p-4">
        <aside className="hidden w-44 shrink-0 lg:block">
          <nav className="bg-card sticky top-20 space-y-0.5 rounded-lg border p-2 shadow-sm">
            <AdminNavLink href="/admin">홈</AdminNavLink>
            <AdminNavLink href="/admin/orgs">학원·기관</AdminNavLink>
            <AdminNavLink href="/admin/stops">정류장</AdminNavLink>
            <AdminNavLink href="/admin/vehicles">차량</AdminNavLink>
            <AdminNavLink href="/admin/trips">운행</AdminNavLink>
            <AdminNavLink href="/admin/users">사용자</AdminNavLink>
            <AdminNavLink href="/admin/apk">APK 관리</AdminNavLink>
            <AdminNavLink href="/admin/notifications">푸시 테스트</AdminNavLink>
            <AdminNavLink href="/admin/audit-log">작업 이력</AdminNavLink>
            <div className="my-1.5 border-t" />
            <AdminNavLink href="/admin/kpi">KPI</AdminNavLink>
            <AdminNavLink href="/admin/pre-registrations">사전등록</AdminNavLink>
          </nav>
        </aside>

        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}

function AdminNavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="text-foreground hover:bg-muted/60 block rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors"
    >
      {children}
    </Link>
  );
}
