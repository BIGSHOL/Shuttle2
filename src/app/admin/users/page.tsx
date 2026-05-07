import Link from "next/link";

import { db } from "@/lib/db";

const STAFF_ROLE_LABEL = {
  OWNER: "학원장",
  DRIVER: "기사",
  HELPER: "동승자",
} as const;

// W24: 매니저 — Staff·Guardian 통합 검색.
// query: ?q=loginId|name|phone|email
export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  const [staffs, guardians] = await Promise.all([
    db.staff.findMany({
      where: query
        ? {
            OR: [
              { loginId: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { recoveryEmail: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
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
    }),
    db.guardian.findMany({
      where: query
        ? {
            OR: [
              { loginId: { contains: query, mode: "insensitive" } },
              { name: { contains: query, mode: "insensitive" } },
              { phone: { contains: query } },
              { recoveryEmail: { contains: query, mode: "insensitive" } },
            ],
          }
        : undefined,
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
    }),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">사용자 관리</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          Staff·학부모 통합 검색. 비밀번호 reset 대행, recoveryEmail 수정, 강제
          로그아웃 처리.
        </p>
      </div>

      <form className="flex gap-2" action="/admin/users">
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="loginId·이름·전화·이메일 검색"
          className="bg-card border-input flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 text-sm font-bold"
        >
          검색
        </button>
      </form>

      <section>
        <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
          직원 ({staffs.length})
        </h3>
        <div className="bg-card rounded-lg border shadow-sm">
          {staffs.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">결과 없음</p>
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
                          : " · recoveryEmail 미등록"}
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

      <section>
        <h3 className="text-foreground mb-2 text-sm font-extrabold tracking-wide uppercase">
          학부모 ({guardians.length})
        </h3>
        <div className="bg-card rounded-lg border shadow-sm">
          {guardians.length === 0 ? (
            <p className="text-muted-foreground p-4 text-sm">결과 없음</p>
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
                          : " · recoveryEmail 미등록"}
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
    </div>
  );
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  if (local.length <= 2) return `${local[0] ?? ""}***@${domain}`;
  return `${local.slice(0, 2)}***@${domain}`;
}
