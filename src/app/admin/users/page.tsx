import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

const STAFF_ROLE_LABEL = {
  OWNER: "학원장",
  DRIVER: "기사",
  HELPER: "동승자",
} as const;

const ROLES = ["OWNER", "DRIVER", "HELPER"] as const;
type StaffRole = (typeof ROLES)[number];
type UserKind = "STAFF" | "GUARDIAN";

// W24: 매니저 — 직원·학부모 통합 검색.
// query: ?q=로그인 아이디·이름·전화·복구용 이메일
// 추가: ?kind=STAFF|GUARDIAN, ?role=OWNER|DRIVER|HELPER (직원 한정)
// 학원 ID도 옵션: ?orgId=xxx
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    kind?: string;
    role?: string;
    orgId?: string;
  }>;
}) {
  const sp = await searchParams;
  const query = (sp.q ?? "").trim();
  const kindFilter: UserKind | null =
    sp.kind === "STAFF" || sp.kind === "GUARDIAN" ? sp.kind : null;
  const roleFilter = isRole(sp.role) ? sp.role : null;
  const orgIdFilter = sp.orgId && sp.orgId !== "all" ? sp.orgId : null;

  const staffWhere: Prisma.StaffWhereInput = {
    ...(query
      ? {
          OR: [
            { loginId: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query } },
            {
              recoveryEmail: { contains: query, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
    ...(roleFilter ? { role: roleFilter } : {}),
    ...(orgIdFilter ? { orgId: orgIdFilter } : {}),
  };

  const guardianWhere: Prisma.GuardianWhereInput = {
    ...(query
      ? {
          OR: [
            { loginId: { contains: query, mode: "insensitive" as const } },
            { name: { contains: query, mode: "insensitive" as const } },
            { phone: { contains: query } },
            {
              recoveryEmail: { contains: query, mode: "insensitive" as const },
            },
          ],
        }
      : {}),
    ...(orgIdFilter
      ? { links: { some: { student: { orgId: orgIdFilter } } } }
      : {}),
  };

  const showStaff = kindFilter === null || kindFilter === "STAFF";
  const showGuardian = kindFilter === null || kindFilter === "GUARDIAN";

  const [staffs, guardians, allOrgs] = await Promise.all([
    showStaff
      ? db.staff.findMany({
          where: staffWhere,
          orderBy: [{ org: { name: "asc" } }, { name: "asc" }],
          select: {
            id: true,
            name: true,
            role: true,
            loginId: true,
            phone: true,
            recoveryEmail: true,
            userId: true,
            org: { select: { id: true, name: true } },
          },
          take: 100,
        })
      : Promise.resolve([]),
    showGuardian && !roleFilter
      ? db.guardian.findMany({
          where: guardianWhere,
          orderBy: [{ name: "asc" }],
          select: {
            id: true,
            name: true,
            loginId: true,
            phone: true,
            recoveryEmail: true,
            userId: true,
            _count: { select: { links: true } },
          },
          take: 100,
        })
      : Promise.resolve([]),
    db.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">사용자 관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          직원·학부모 통합 검색. 비밀번호 재설정 메일 대행, 복구용 이메일 수정,
          강제 로그아웃 처리.
        </p>
      </div>

      <form
        action="/admin/users"
        className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm"
      >
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="로그인 아이디·이름·전화·이메일"
          className="bg-card border-input min-w-40 flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          name="kind"
          defaultValue={kindFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">직원·학부모</option>
          <option value="STAFF">직원만</option>
          <option value="GUARDIAN">학부모만</option>
        </select>
        <select
          name="role"
          defaultValue={roleFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 직급</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {STAFF_ROLE_LABEL[r]}
            </option>
          ))}
        </select>
        <select
          name="orgId"
          defaultValue={orgIdFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 학원</option>
          {allOrgs.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-bold"
        >
          검색
        </button>
        {(query || kindFilter || roleFilter || orgIdFilter) && (
          <Link
            href="/admin/users"
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
          >
            초기화
          </Link>
        )}
      </form>

      {showStaff && (
        <section>
          <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
            직원 ({staffs.length})
          </h3>
          <div className="bg-card rounded-lg border shadow-sm">
            {staffs.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                조건에 맞는 직원이 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {staffs.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/users/STAFF/${s.id}`}
                      className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                            {s.org.name}
                          </span>
                          <h3 className="text-sm font-extrabold tracking-tight">
                            {s.name}
                          </h3>
                          <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                            {STAFF_ROLE_LABEL[s.role]}
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs font-medium">
                          {s.loginId ? `@${s.loginId} · ` : ""}
                          {s.phone}
                          {s.recoveryEmail
                            ? ` · ${maskEmail(s.recoveryEmail)}`
                            : " · 복구용 이메일 미등록"}
                          {!s.userId ? " · 미가입" : ""}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-xs">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {showGuardian && !roleFilter && (
        <section>
          <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
            학부모 ({guardians.length})
          </h3>
          <div className="bg-card rounded-lg border shadow-sm">
            {guardians.length === 0 ? (
              <p className="text-muted-foreground p-4 text-sm">
                조건에 맞는 학부모가 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {guardians.map((g) => (
                  <li key={g.id}>
                    <Link
                      href={`/admin/users/GUARDIAN/${g.id}`}
                      className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <h3 className="text-sm font-extrabold tracking-tight">
                            {g.name}
                          </h3>
                          <span className="bg-success-soft text-success rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                            학부모
                          </span>
                        </div>
                        <p className="text-muted-foreground mt-1 text-xs font-medium">
                          {g.loginId ? `@${g.loginId} · ` : ""}
                          {g.phone}
                          {g.recoveryEmail
                            ? ` · ${maskEmail(g.recoveryEmail)}`
                            : " · 복구용 이메일 미등록"}
                          {" · 자녀 "}
                          {g._count.links}명
                          {!g.userId ? " · 미가입" : ""}
                        </p>
                      </div>
                      <span className="text-muted-foreground text-xs">→</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}

function isRole(v: string | undefined): v is StaffRole {
  return v != null && (ROLES as readonly string[]).includes(v);
}
