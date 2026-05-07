import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";

import { db } from "@/lib/db";

import { OrgStatusToggle } from "./_components/org-status-toggle";

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

const STATUSES = ["ACTIVE", "SUSPENDED", "TRIAL_EXPIRED"] as const;
const PLANS = ["TRIAL", "BASIC", "PRO"] as const;
const TYPES = ["ACADEMY", "DAYCARE", "KINDERGARTEN"] as const;

type OrgStatus = (typeof STATUSES)[number];
type OrgPlan = (typeof PLANS)[number];
type OrgType = (typeof TYPES)[number];

// W24: 매니저 — 전체 학원·기관 목록. 행 클릭 → /admin/orgs/[id] 상세.
// 검색(이름)·요금제·상태·기관 종류 필터 + 정지 inline 토글.
export default async function AdminOrgsListPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    plan?: string;
    status?: string;
    type?: string;
  }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const planFilter = isPlan(sp.plan) ? sp.plan : null;
  const statusFilter = isStatus(sp.status) ? sp.status : null;
  const typeFilter = isType(sp.type) ? sp.type : null;

  const where: Prisma.OrganizationWhereInput = {
    ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    ...(planFilter ? { plan: planFilter } : {}),
    ...(statusFilter ? { status: statusFilter } : {}),
    ...(typeFilter ? { type: typeFilter } : {}),
  };

  const [orgs, summary] = await Promise.all([
    db.organization.findMany({
      where,
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
    }),
    db.organization.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
  ]);

  const total = summary.reduce((acc, s) => acc + s._count._all, 0);
  const byStatus: Record<OrgStatus, number> = {
    ACTIVE: 0,
    SUSPENDED: 0,
    TRIAL_EXPIRED: 0,
  };
  for (const s of summary) byStatus[s.status as OrgStatus] = s._count._all;

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">학원·기관</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          전체 가입 학원·기관 ({total}곳). 검색·필터로 조건에 맞는 학원만
          확인하세요. 행을 클릭하면 상세 페이지로 이동합니다.
        </p>
      </div>

      {/* 요약 카드 */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="전체" value={total} />
        <Stat label="운영" value={byStatus.ACTIVE} tone="success" />
        <Stat
          label="정지"
          value={byStatus.SUSPENDED}
          tone={byStatus.SUSPENDED > 0 ? "destructive" : undefined}
        />
        <Stat
          label="만료"
          value={byStatus.TRIAL_EXPIRED}
          tone={byStatus.TRIAL_EXPIRED > 0 ? "warning" : undefined}
        />
      </section>

      {/* 검색·필터 */}
      <form
        action="/admin/orgs"
        className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm"
      >
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="학원·기관 이름"
          className="bg-card border-input min-w-40 flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <Select
          name="plan"
          value={planFilter ?? "all"}
          options={[
            { value: "all", label: "전체 요금제" },
            ...PLANS.map((p) => ({ value: p, label: PLAN_LABEL[p] })),
          ]}
        />
        <Select
          name="status"
          value={statusFilter ?? "all"}
          options={[
            { value: "all", label: "전체 상태" },
            { value: "ACTIVE", label: "운영" },
            { value: "SUSPENDED", label: "정지" },
            { value: "TRIAL_EXPIRED", label: "만료" },
          ]}
        />
        <Select
          name="type"
          value={typeFilter ?? "all"}
          options={[
            { value: "all", label: "전체 종류" },
            ...TYPES.map((t) => ({ value: t, label: ORG_TYPE_LABEL[t] })),
          ]}
        />
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-bold"
        >
          검색
        </button>
        {(q || planFilter || statusFilter || typeFilter) && (
          <Link
            href="/admin/orgs"
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 결과 목록 */}
      <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-2.5">
          <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
            결과 ({orgs.length}곳)
          </p>
        </div>
        <ul className="divide-y">
          {orgs.length === 0 ? (
            <li className="text-muted-foreground p-4 text-sm">
              조건에 맞는 학원·기관이 없습니다.
            </li>
          ) : (
            orgs.map((o) => (
              <li
                key={o.id}
                className="hover:bg-muted/40 flex items-center gap-3 px-4 py-3 transition-colors"
              >
                <Link
                  href={`/admin/orgs/${o.id}`}
                  className="min-w-0 flex-1"
                >
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
                    {ORG_TYPE_LABEL[o.type]} · 차량 {o._count.vehicles}대 ·
                    학생 {o._count.students}명 · 직원 {o._count.staffs}명 ·
                    가입 {o.createdAt.toISOString().slice(0, 10)}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-2">
                  <OrgStatusToggle
                    orgId={o.id}
                    orgName={o.name}
                    status={o.status}
                  />
                  <span className="text-muted-foreground text-xs font-medium">
                    →
                  </span>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: OrgStatus }) {
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

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone?: "success" | "warning" | "destructive";
}) {
  const cls =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "destructive"
          ? "text-destructive"
          : "text-foreground";
  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm">
      <p className="text-muted-foreground text-[11px] font-extrabold tracking-wide uppercase">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-extrabold tracking-tight ${cls}`}>
        {value}
      </p>
    </div>
  );
}

function Select({
  name,
  value,
  options,
}: {
  name: string;
  value: string;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      name={name}
      defaultValue={value}
      className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function isPlan(v: string | undefined): v is OrgPlan {
  return v != null && (PLANS as readonly string[]).includes(v);
}
function isStatus(v: string | undefined): v is OrgStatus {
  return v != null && (STATUSES as readonly string[]).includes(v);
}
function isType(v: string | undefined): v is OrgType {
  return v != null && (TYPES as readonly string[]).includes(v);
}
