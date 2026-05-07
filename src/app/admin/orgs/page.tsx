import Link from "next/link";

import { db } from "@/lib/db";

const ORG_TYPE_LABEL = {
  ACADEMY: "학원·교습소",
  DAYCARE: "어린이집",
  KINDERGARTEN: "유치원",
} as const;

const PLAN_LABEL = {
  TRIAL: "체험판",
  BASIC: "기본",
  PRO: "프로",
} as const;

// W24: 매니저 — 전체 학원·기관 list. 행 클릭 → /admin/orgs/[id] 360.
// 활동성 정렬 (최근 trip 시작 desc + createdAt desc).
export default async function AdminOrgsListPage() {
  const orgs = await db.organization.findMany({
    orderBy: [{ createdAt: "desc" }],
    select: {
      id: true,
      name: true,
      type: true,
      plan: true,
      status: true,
      createdAt: true,
      _count: {
        select: { vehicles: true, students: true, staffs: true },
      },
    },
  });

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">학원·기관</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          전체 가입 학원·기관 ({orgs.length}곳). 행 클릭 시 360° 상세로
          이동합니다.
        </p>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <ul className="divide-y">
          {orgs.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              아직 가입한 학원·기관이 없습니다.
            </li>
          ) : (
            orgs.map((o) => (
              <li key={o.id}>
                <Link
                  href={`/admin/orgs/${o.id}`}
                  className="hover:bg-muted/40 flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <h3 className="text-sm font-extrabold tracking-tight">
                        {o.name}
                      </h3>
                      <StatusBadge status={o.status} />
                      <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                        {PLAN_LABEL[o.plan]}
                      </span>
                    </div>
                    <p className="text-muted-foreground mt-1 text-xs font-medium">
                      {ORG_TYPE_LABEL[o.type]} · 차량 {o._count.vehicles} ·
                      학생 {o._count.students} · 직원 {o._count.staffs} · 가입{" "}
                      {o.createdAt.toISOString().slice(0, 10)}
                    </p>
                  </div>
                  <span className="text-muted-foreground text-xs font-medium">
                    →
                  </span>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "ACTIVE" | "SUSPENDED" | "TRIAL_EXPIRED" }) {
  const cls =
    status === "ACTIVE"
      ? "bg-success-soft text-success"
      : status === "SUSPENDED"
        ? "bg-destructive/10 text-destructive"
        : "bg-warning-soft text-warning";
  const label =
    status === "ACTIVE" ? "운영" : status === "SUSPENDED" ? "정지" : "만료";
  return (
    <span
      className={`${cls} rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide`}
    >
      {label}
    </span>
  );
}
