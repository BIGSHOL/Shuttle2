// W24-B C7: 결석·정류장 변경 PENDING 통합 큐.
// 결정 액션은 기존 (owner)/absences·(owner)/stop-change-requests의 server action 재사용.
// 본 페이지는 통합 list view. 자세한 결정 입력(승인/반려·새 stop 이름 등)은
// 기존 페이지로 이동해 처리 — 학원장 효율을 위한 한눈 보기 화면.
import Link from "next/link";
import {
  ArrowRight,
  CalendarOff,
  Filter,
  MapPin,
  MapPinned,
  ShieldCheck,
} from "lucide-react";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const ABSENCE_TYPE_LABEL: Record<string, string> = {
  ABSENT_BOTH: "등·하원",
  ABSENT_PICKUP: "등원만",
  ABSENT_DROPOFF: "하원만",
};

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireOwner();
  const orgId = await getOrgId();
  const { tab: tabParam } = await searchParams;
  const tab: "all" | "absence" | "stop-change" =
    tabParam === "absence" || tabParam === "stop-change" ? tabParam : "all";

  const [absences, stopChanges] = await Promise.all([
    tab === "stop-change"
      ? Promise.resolve([] as Awaited<ReturnType<typeof fetchAbsences>>)
      : fetchAbsences(orgId),
    tab === "absence"
      ? Promise.resolve([] as Awaited<ReturnType<typeof fetchStopChanges>>)
      : fetchStopChanges(orgId),
  ]);

  const totalAll =
    (await db.absenceRequest.count({
      where: {
        student: { orgId },
        status: { in: ["PENDING", "NOTIFIED_DRIVER"] },
      },
    })) +
    (await db.stopChangeRequest.count({
      where: { orgId, status: "PENDING" },
    }));

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-6 lg:px-6">
      <header className="mb-5">
        <p className="text-muted-foreground text-[11px] font-extrabold tracking-[0.1em] uppercase">
          처리 큐
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-black tracking-tight">대기 요청</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/audit-log"
              className="bg-card hover:bg-muted/40 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[11px] font-bold transition-colors"
            >
              <Filter className="h-3 w-3" />
              결정 이력
            </Link>
            <Link
              href="/settings/policies"
              className="bg-card hover:bg-muted/40 inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[11px] font-bold transition-colors"
            >
              <ShieldCheck className="h-3 w-3" />
              정책 설정
            </Link>
          </div>
        </div>
        <p className="text-muted-foreground mt-1.5 text-xs font-semibold">
          학부모가 보낸 결석·정류장 변경 신청 한 화면에서 처리. 자세한 결정은
          항목 클릭.
        </p>
      </header>

      {/* 통계 + 탭 */}
      <div className="bg-card mb-4 flex flex-wrap items-center gap-1 rounded-lg border p-1.5 shadow-sm">
        <Tab
          href="?tab=all"
          active={tab === "all"}
          label="전체"
          count={totalAll}
        />
        <Tab
          href="?tab=absence"
          active={tab === "absence"}
          label="결석"
          count={absences.length}
        />
        <Tab
          href="?tab=stop-change"
          active={tab === "stop-change"}
          label="정류장 변경"
          count={stopChanges.length}
        />
      </div>

      {/* 리스트 */}
      <ul className="space-y-2">
        {absences.map((a) => (
          <li key={`absence-${a.id}`}>
            <Link
              href="/absences"
              className="bg-card hover:bg-muted/40 active:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 shadow-sm transition-colors"
            >
              <span className="bg-warning-soft text-warning flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                <CalendarOff className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-warning-soft text-warning rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                    결석
                  </span>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {a.student.name}
                  </h3>
                  <span className="text-muted-foreground text-[11px] font-bold">
                    · {a.guardian.name}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs font-semibold">
                  <span className="text-foreground font-bold tabular-nums">
                    {fmtKstDate(a.date)}
                  </span>{" "}
                  · {ABSENCE_TYPE_LABEL[a.type] ?? a.type}
                  {a.reason ? ` · ${a.reason}` : ""}
                </p>
                <p className="text-muted-foreground mt-1 text-[11px] font-medium">
                  신청 {fmtKstAgo(a.createdAt)}
                </p>
              </div>
              <ArrowRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
            </Link>
          </li>
        ))}
        {stopChanges.map((s) => (
          <li key={`stop-change-${s.id}`}>
            <Link
              href="/stop-change-requests"
              className="bg-card hover:bg-muted/40 active:bg-muted/40 flex items-start gap-3 rounded-lg border p-4 shadow-sm transition-colors"
            >
              <span className="bg-info-soft text-info flex h-9 w-9 shrink-0 items-center justify-center rounded-md">
                <MapPin className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-[0.06em] uppercase">
                    정류장 변경
                  </span>
                  <h3 className="text-sm font-extrabold tracking-tight">
                    {s.student.name}
                  </h3>
                  <span className="text-muted-foreground text-[11px] font-bold">
                    · {s.guardian.name}
                  </span>
                </div>
                <p className="text-muted-foreground mt-1 text-xs font-semibold">
                  <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[11px] font-bold line-through">
                    {s.fromStop.name}
                  </span>{" "}
                  → {s.toAddress ?? `${s.toLat.toFixed(4)}, ${s.toLng.toFixed(4)}`}
                </p>
                {s.reason ? (
                  <p className="text-muted-foreground mt-1 text-[11px] font-medium">
                    사유: {s.reason}
                  </p>
                ) : null}
                <p className="text-muted-foreground mt-1 text-[11px] font-medium">
                  적용 {fmtKstDate(s.effectiveAt)} · 신청 {fmtKstAgo(s.createdAt)}
                </p>
              </div>
              <ArrowRight className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
            </Link>
          </li>
        ))}

        {absences.length === 0 && stopChanges.length === 0 ? (
          <li className="bg-card text-muted-foreground rounded-lg border p-8 text-center text-sm font-bold">
            <MapPinned className="mx-auto mb-2 h-8 w-8 opacity-40" />
            처리할 대기 요청이 없습니다.
          </li>
        ) : null}
      </ul>
    </div>
  );
}

async function fetchAbsences(orgId: string) {
  return db.absenceRequest.findMany({
    where: {
      student: { orgId },
      status: { in: ["PENDING", "NOTIFIED_DRIVER"] },
    },
    select: {
      id: true,
      date: true,
      type: true,
      reason: true,
      createdAt: true,
      student: { select: { name: true } },
      guardian: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

async function fetchStopChanges(orgId: string) {
  return db.stopChangeRequest.findMany({
    where: { orgId, status: "PENDING" },
    select: {
      id: true,
      effectiveAt: true,
      reason: true,
      toAddress: true,
      toLat: true,
      toLng: true,
      createdAt: true,
      fromStop: { select: { name: true } },
      student: { select: { name: true } },
      guardian: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

function Tab({
  href,
  active,
  label,
  count,
}: {
  href: string;
  active: boolean;
  label: string;
  count: number;
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
      {label}{" "}
      <span
        className={
          active
            ? "ml-0.5 tabular-nums"
            : "text-muted-foreground/70 ml-0.5 tabular-nums"
        }
      >
        ({count})
      </span>
    </Link>
  );
}

function fmtKstDate(d: Date) {
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    timeZone: "Asia/Seoul",
  }).format(d);
}

function fmtKstAgo(d: Date) {
  const diffMs = Date.now() - d.getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 60) return `${min}분 전`;
  const hour = Math.floor(min / 60);
  if (hour < 24) return `${hour}시간 전`;
  const day = Math.floor(hour / 24);
  return `${day}일 전`;
}
