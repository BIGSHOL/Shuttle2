import Link from "next/link";

import type { Prisma } from "@/generated/prisma/client";

import { requireShuttleAdmin } from "@/lib/auth/admin";
import {
  AUDIT_ACTION_OPTIONS,
  auditActionLabel,
} from "@/lib/auth/audit-labels";
import { db } from "@/lib/db";

// W24: 매니저 — 통합 작업 이력. 학원 detail의 "최근 30일 매니저 작업 이력"
// 대비 cross-org·기간·작업자 필터 + 페이지네이션을 제공.
// layout 가드 외에 페이지 레벨에서도 requireShuttleAdmin()을 재호출 —
// 향후 layout 우회 경로(API Route, 미들웨어 변경 등)가 생겨도 cross-org
// 민감 데이터가 노출되지 않도록 defense-in-depth.

const PAGE_SIZE = 50;

export default async function AdminAuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{
    actor?: string;
    action?: string;
    orgId?: string;
    from?: string;
    to?: string;
    page?: string;
  }>;
}) {
  await requireShuttleAdmin();
  const sp = await searchParams;
  const actorFilter = (sp.actor ?? "").trim();
  const actionFilter = sp.action && sp.action !== "all" ? sp.action : null;
  const orgIdFilter = sp.orgId && sp.orgId !== "all" ? sp.orgId : null;
  const fromRaw = sp.from ?? "";
  const toRaw = sp.to ?? "";

  const fromDate = parseDate(fromRaw);
  const toDate = parseDate(toRaw);
  if (toDate) toDate.setUTCDate(toDate.getUTCDate() + 1); // inclusive

  const pageNum = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const skip = (pageNum - 1) * PAGE_SIZE;

  const where: Prisma.AdminAuditLogWhereInput = {
    ...(actorFilter
      ? { actorEmail: { contains: actorFilter, mode: "insensitive" as const } }
      : {}),
    ...(actionFilter ? { action: actionFilter } : {}),
    ...(orgIdFilter ? { targetOrgId: orgIdFilter } : {}),
    ...(fromDate || toDate
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lt: toDate } : {}),
          },
        }
      : {}),
  };

  const [logs, total, allOrgs] = await Promise.all([
    db.adminAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: PAGE_SIZE,
    }),
    db.adminAuditLog.count({ where }),
    db.organization.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
  ]);

  const orgNameById = new Map(allOrgs.map((o) => [o.id, o.name]));

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const baseQs = (page: number) => {
    const params = new URLSearchParams();
    if (actorFilter) params.set("actor", actorFilter);
    if (actionFilter) params.set("action", actionFilter);
    if (orgIdFilter) params.set("orgId", orgIdFilter);
    if (fromRaw) params.set("from", fromRaw);
    if (toRaw) params.set("to", toRaw);
    if (page > 1) params.set("page", String(page));
    const qs = params.toString();
    return qs ? `?${qs}` : "";
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-extrabold tracking-tight">
          매니저 작업 이력
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          모든 매니저 작업 이력을 작업자·액션·학원·기간으로 필터해서 확인합니다.
          요금제 변경, 학원 정지, 임시 진입, APK 활성화, 푸시 발송 등 모든 critical
          한 작업이 자동 기록됩니다.
        </p>
      </div>

      {/* 필터 */}
      <form
        action="/admin/audit-log"
        className="bg-card flex flex-wrap gap-2 rounded-lg border p-3 shadow-sm"
      >
        <input
          type="text"
          name="actor"
          defaultValue={actorFilter}
          placeholder="작업자 이메일"
          className="bg-card border-input min-w-40 flex-1 rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        />
        <select
          name="action"
          defaultValue={actionFilter ?? "all"}
          className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          <option value="all">전체 작업</option>
          {AUDIT_ACTION_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
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
        <div className="flex items-center gap-1.5">
          <input
            type="date"
            name="from"
            defaultValue={fromRaw}
            aria-label="시작일"
            className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
          <span className="text-muted-foreground text-xs">~</span>
          <input
            type="date"
            name="to"
            defaultValue={toRaw}
            aria-label="종료일"
            className="bg-card border-input rounded-md border px-3 py-2 text-sm shadow-sm focus:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
        <button
          type="submit"
          className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-md px-4 py-2 text-sm font-bold"
        >
          검색
        </button>
        {(actorFilter ||
          actionFilter ||
          orgIdFilter ||
          fromRaw ||
          toRaw) && (
          <Link
            href="/admin/audit-log"
            className="text-muted-foreground hover:text-foreground inline-flex items-center rounded-md border px-3 py-2 text-sm font-medium"
          >
            초기화
          </Link>
        )}
      </form>

      {/* 결과 */}
      <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-2.5">
          <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
            결과 ({total.toLocaleString()}건 중 {skip + 1}–{Math.min(
              skip + PAGE_SIZE,
              total,
            )})
          </p>
        </div>
        {logs.length === 0 ? (
          <p className="text-muted-foreground p-4 text-sm">
            조건에 맞는 작업 이력이 없습니다.
          </p>
        ) : (
          <ul className="divide-y">
            {logs.map((l) => {
              const orgName = l.targetOrgId
                ? orgNameById.get(l.targetOrgId)
                : null;
              return (
                <li key={l.id} className="px-4 py-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="bg-info-soft text-info rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide">
                          {auditActionLabel(l.action)}
                        </span>
                        {l.targetOrgId && orgName ? (
                          <Link
                            href={`/admin/orgs/${l.targetOrgId}`}
                            className="bg-muted text-muted-foreground hover:text-foreground rounded-md px-2 py-0.5 text-[11px] font-extrabold tracking-wide"
                          >
                            {orgName}
                          </Link>
                        ) : null}
                      </div>
                      <p className="text-foreground mt-1 text-xs font-medium">
                        {l.actorEmail}
                        {l.targetUserId ? (
                          <>
                            {" · 대상 "}
                            <code className="font-mono text-[10px]">
                              {l.targetUserId}
                            </code>
                          </>
                        ) : null}
                      </p>
                      {l.payload ? (
                        <pre className="bg-muted/40 text-muted-foreground mt-1 max-w-full overflow-x-auto rounded-md p-2 text-[10px] leading-tight">
                          {JSON.stringify(l.payload, null, 2)}
                        </pre>
                      ) : null}
                    </div>
                    <p className="text-muted-foreground shrink-0 font-mono text-xs">
                      {l.createdAt.toISOString().slice(0, 16).replace("T", " ")}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 페이지네이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-muted-foreground text-xs font-medium">
            {pageNum} / {totalPages} 페이지
          </p>
          <div className="flex gap-2">
            {pageNum > 1 ? (
              <Link
                href={`/admin/audit-log${baseQs(pageNum - 1)}`}
                className="bg-card hover:bg-muted/40 rounded-md border px-3 py-1.5 text-xs font-medium"
              >
                ← 이전
              </Link>
            ) : null}
            {pageNum < totalPages ? (
              <Link
                href={`/admin/audit-log${baseQs(pageNum + 1)}`}
                className="bg-card hover:bg-muted/40 rounded-md border px-3 py-1.5 text-xs font-medium"
              >
                다음 →
              </Link>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

function parseDate(raw: string): Date | null {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const d = new Date(`${raw}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
