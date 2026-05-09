// W24-B C6: 결석·정류장 변경 결정 이력 통합 뷰. /audit-log.
// 우리 schema는 decidedAt/decidedBy(staffId, FK 없음). staff 이름은 batch lookup.
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, UserX, X } from "lucide-react";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

type Kind = "all" | "absence" | "stop-change";
const VALID_DAYS = ["7", "30", "90"] as const;
type DaysOpt = (typeof VALID_DAYS)[number];

const ABSENCE_KIND_LABEL: Record<string, string> = {
  ABSENT_BOTH: "등·하원",
  ABSENT_PICKUP: "등원만",
  ABSENT_DROPOFF: "하원만",
};

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ kind?: string; days?: string }>;
}) {
  await requireOwner();
  const orgId = await getOrgId();
  const { kind: kindParam, days: daysParam } = await searchParams;

  const kind: Kind =
    kindParam === "absence" || kindParam === "stop-change" ? kindParam : "all";
  const days: DaysOpt = (VALID_DAYS as readonly string[]).includes(
    daysParam ?? "",
  )
    ? (daysParam as DaysOpt)
    : "30";

  const since = new Date();
  since.setDate(since.getDate() - Number(days));

  const [absences, stopChanges] = await Promise.all([
    kind === "stop-change"
      ? Promise.resolve([] as Awaited<ReturnType<typeof fetchAbsences>>)
      : fetchAbsences(orgId, since),
    kind === "absence"
      ? Promise.resolve([] as Awaited<ReturnType<typeof fetchStopChanges>>)
      : fetchStopChanges(orgId, since),
  ]);

  // staff 이름 batch lookup (decidedBy = staffId)
  const staffIds = new Set<string>();
  for (const a of absences) if (a.decidedBy) staffIds.add(a.decidedBy);
  for (const s of stopChanges) if (s.decidedBy) staffIds.add(s.decidedBy);
  const staffById = new Map<string, string>();
  if (staffIds.size > 0) {
    const staff = await db.staff.findMany({
      where: { id: { in: Array.from(staffIds) } },
      select: { id: true, name: true },
    });
    for (const s of staff) staffById.set(s.id, s.name);
  }

  const rows = [
    ...absences.map((a) => ({
      key: `absence-${a.id}`,
      kind: "absence" as const,
      when: a.decidedAt as Date,
      item: a,
    })),
    ...stopChanges.map((s) => ({
      key: `stop-change-${s.id}`,
      kind: "stop-change" as const,
      when: s.decidedAt as Date,
      item: s,
    })),
  ].sort((a, b) => b.when.getTime() - a.when.getTime());

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
      <header className="mb-5 flex items-start gap-3">
        <Link
          href="/dashboard"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="대시보드로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div className="flex-1">
          <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
            감사 로그
          </p>
          <h1 className="mt-1 text-2xl font-black tracking-tight">결정 이력</h1>
          <p className="text-muted-foreground mt-1.5 text-xs font-semibold">
            최근 {days}일 · {rows.length}건. 결석 확인·정류장 변경 승인/반려
            결과를 통합 표시.
          </p>
        </div>
      </header>

      {/* 탭 + 일자 필터 */}
      <div className="bg-card mb-4 flex flex-wrap items-center gap-1 rounded-lg border p-1.5 shadow-sm">
        <Tab
          href={`?kind=all&days=${days}`}
          active={kind === "all"}
          label={`전체 (${rows.length})`}
        />
        <Tab
          href={`?kind=absence&days=${days}`}
          active={kind === "absence"}
          label={`결석 (${absences.length})`}
        />
        <Tab
          href={`?kind=stop-change&days=${days}`}
          active={kind === "stop-change"}
          label={`정류장 (${stopChanges.length})`}
        />
        <div className="ml-auto flex gap-1">
          {VALID_DAYS.map((d) => (
            <Link
              key={d}
              href={`?kind=${kind}&days=${d}`}
              className={`rounded-md px-3 py-1.5 text-[11px] font-extrabold transition-colors ${
                days === d
                  ? "bg-bus-soft text-bus-foreground"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              {d}일
            </Link>
          ))}
        </div>
      </div>

      <div className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr className="text-muted-foreground text-[10px] font-extrabold tracking-[0.06em] uppercase">
                <Th>시각</Th>
                <Th>학생</Th>
                <Th>결정</Th>
                <Th>상세</Th>
                <Th>신청자</Th>
                <Th>처리자</Th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="text-muted-foreground px-4 py-12 text-center text-sm font-bold"
                  >
                    이 기간에 처리된 항목이 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr key={row.key} className="border-t font-medium">
                    <td className="text-muted-foreground px-4 py-3 font-mono text-[11px] font-bold tabular-nums">
                      {fmtKstDateTime(row.when)}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/students/${row.item.student.id}`}
                        className="hover:text-info text-[13px] font-extrabold hover:underline"
                      >
                        {row.item.student.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      {row.kind === "absence" ? (
                        row.item.status === "ACKNOWLEDGED" ||
                        row.item.status === "NOTIFIED_DRIVER" ? (
                          <Pill
                            icon={<UserX className="h-3 w-3" />}
                            cls="bg-warning-soft text-warning"
                          >
                            결석 확인
                          </Pill>
                        ) : (
                          <Pill
                            icon={<X className="h-3 w-3" />}
                            cls="bg-destructive/10 text-destructive"
                          >
                            결석 반려
                          </Pill>
                        )
                      ) : row.item.status === "APPROVED" ? (
                        <Pill
                          icon={<Check className="h-3 w-3" />}
                          cls="bg-success-soft text-success"
                        >
                          변경 승인
                        </Pill>
                      ) : (
                        <Pill
                          icon={<X className="h-3 w-3" />}
                          cls="bg-destructive/10 text-destructive"
                        >
                          변경 반려
                        </Pill>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      {row.kind === "absence" ? (
                        <span className="text-muted-foreground">
                          {fmtKstDate(row.item.date)} ·{" "}
                          {ABSENCE_KIND_LABEL[row.item.type] ?? row.item.type}
                        </span>
                      ) : (
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-bold line-through">
                            {row.item.fromStop?.name ?? "—"}
                          </span>
                          <ArrowRight className="text-muted-foreground h-3 w-3" />
                          <span className="bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[11px] font-extrabold">
                            {row.item.resultStop?.name ?? "—"}
                          </span>
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[12px]">
                      <span className="font-bold">
                        {row.item.guardian?.name ?? "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] font-bold">
                      {row.item.decidedBy
                        ? (staffById.get(row.item.decidedBy) ?? "—")
                        : "자동"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

async function fetchAbsences(orgId: string, since: Date) {
  return db.absenceRequest.findMany({
    where: {
      student: { orgId },
      decidedAt: { gte: since, not: null },
    },
    select: {
      id: true,
      decidedAt: true,
      decidedBy: true,
      type: true,
      date: true,
      status: true,
      student: { select: { id: true, name: true } },
      guardian: { select: { name: true } },
    },
    orderBy: { decidedAt: "desc" },
    take: 100,
  });
}

async function fetchStopChanges(orgId: string, since: Date) {
  return db.stopChangeRequest.findMany({
    where: {
      orgId,
      decidedAt: { gte: since, not: null },
    },
    select: {
      id: true,
      decidedAt: true,
      decidedBy: true,
      status: true,
      fromStop: { select: { name: true } },
      resultStop: { select: { name: true } },
      student: { select: { id: true, name: true } },
      guardian: { select: { name: true } },
    },
    orderBy: { decidedAt: "desc" },
    take: 100,
  });
}

function Tab({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-[11px] font-extrabold transition-colors ${
        active
          ? "bg-bus-soft text-bus-foreground"
          : "text-muted-foreground hover:bg-muted"
      }`}
    >
      {label}
    </Link>
  );
}

function Pill({
  icon,
  cls,
  children,
}: {
  icon: React.ReactNode;
  cls: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-black tracking-[0.06em] uppercase ${cls}`}
    >
      {icon}
      {children}
    </span>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-2.5 text-left">{children}</th>;
}

function fmtKstDateTime(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Seoul",
  }).format(d);
}

function fmtKstDate(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}
