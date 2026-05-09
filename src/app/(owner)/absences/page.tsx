import { CalendarOff, CheckCircle2, Clock, Zap } from "lucide-react";

import { KpiStrip, KpiStripCell } from "@/components/kpi-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { studentTerm } from "@/lib/i18n/org-terms";

import { AckAbsenceButton } from "./_components/ack-absence-button";
import { RejectAbsenceButton } from "./_components/reject-absence-button";

const ABSENCE_TYPE_LABEL = {
  ABSENT_BOTH: "등·하원 모두",
  ABSENT_PICKUP: "등원만",
  ABSENT_DROPOFF: "하원만",
} as const;

const STATUS_COLOR = {
  PENDING: "bg-warning-soft text-warning",
  NOTIFIED_DRIVER: "bg-info-soft text-info",
  ACKNOWLEDGED: "bg-success-soft text-success",
  REJECTED: "bg-destructive/10 text-destructive",
} as const;

const STATUS_LABEL = {
  PENDING: "대기",
  NOTIFIED_DRIVER: "기사 전달",
  ACKNOWLEDGED: "확인 완료",
  REJECTED: "반려",
} as const;

type PendingItem = {
  id: string;
  type: keyof typeof ABSENCE_TYPE_LABEL;
  status: keyof typeof STATUS_COLOR;
  reason: string | null;
  date: Date;
  createdAt: Date;
  student: { id: string; name: string };
  guardian: { name: string; phone: string };
};

export default async function OwnerAbsencesPage() {
  const me = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(me.org.type);

  const today = todayUtcDateKst();

  const pending = await db.absenceRequest.findMany({
    where: {
      student: { orgId },
      date: { gte: today },
      status: { notIn: ["ACKNOWLEDGED", "REJECTED"] },
    },
    orderBy: [{ date: "asc" }, { createdAt: "asc" }],
    include: {
      student: { select: { id: true, name: true } },
      guardian: { select: { name: true, phone: true } },
    },
  });

  const recent = await db.absenceRequest.findMany({
    where: {
      student: { orgId },
      status: { in: ["ACKNOWLEDGED", "REJECTED"] },
    },
    orderBy: { decidedAt: "desc" },
    take: 20,
    include: {
      student: { select: { name: true } },
      guardian: { select: { name: true } },
    },
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setUTCDate(sevenDaysAgo.getUTCDate() - 7);
  const thisWeekProcessedCount = await db.absenceRequest.count({
    where: {
      student: { orgId },
      status: { in: ["ACKNOWLEDGED", "REJECTED"] },
      decidedAt: { gte: sevenDaysAgo },
    },
  });
  const avgMinutes = (() => {
    const decided = recent.filter((r) => r.decidedAt != null);
    if (decided.length === 0) return null;
    const total = decided.reduce(
      (acc, r) =>
        acc + (r.decidedAt!.getTime() - r.createdAt.getTime()) / 60000,
      0,
    );
    return Math.round(total / decided.length);
  })();

  // W25 P2-C: 긴급 (오늘·내일) / 예정 (다음 주 이후) 그룹 분리
  const dayAfterTomorrow = new Date(today);
  dayAfterTomorrow.setUTCDate(dayAfterTomorrow.getUTCDate() + 2);
  const urgent = pending.filter((a) => a.date < dayAfterTomorrow);
  const scheduled = pending.filter((a) => a.date >= dayAfterTomorrow);

  return (
    <main className="mx-auto max-w-7xl space-y-5 p-4 lg:p-6">
      <div>
        <h2 className="text-2xl font-black tracking-tight lg:text-3xl">
          결석 신청
        </h2>
        <p className="text-muted-foreground mt-1 text-xs font-semibold lg:text-sm">
          학부모가 보낸 {term} 결석 신청을 확인하고 처리하세요. 반려는 사유
          입력이 필요합니다.
        </p>
      </div>

      <KpiStrip cols={4}>
        <KpiStripCell
          label="오늘 처리 필요"
          value={pending.length}
          subtext={pending.length > 0 ? "확인 대기 중" : "이상 없음"}
          Icon={CalendarOff}
          tone={pending.length > 0 ? "warning" : "success"}
        />
        <KpiStripCell
          label="이번 주 처리됨"
          value={thisWeekProcessedCount}
          subtext="최근 7일 누적"
          Icon={CheckCircle2}
          tone="success"
        />
        <KpiStripCell
          label="평균 처리시간"
          value={avgMinutes != null ? `${avgMinutes}분` : "—"}
          subtext={avgMinutes != null ? "최근 20건 평균" : "데이터 없음"}
          Icon={Clock}
          tone="muted"
        />
        <KpiStripCell
          label="자동 처리"
          value="ON"
          subtext="결석은 신청 즉시 확인"
          Icon={Zap}
          tone="bus"
        />
      </KpiStrip>

      {/* 긴급 — 오늘·내일 */}
      <UrgentSection items={urgent} />

      {/* 예정 — 다음 주 이후 */}
      {scheduled.length > 0 ? <ScheduledSection items={scheduled} /> : null}

      {/* 최근 처리 — 24시간 */}
      <section className="space-y-2.5">
        <header className="flex items-center justify-between">
          <h3 className="text-base font-black tracking-tight">
            최근 처리 (최근 20건)
          </h3>
          <span className="text-muted-foreground text-xs font-bold">
            {recent.length}건
          </span>
        </header>
        {recent.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">처리된 결석이 없어요</CardTitle>
              <CardDescription>
                승인·반려된 결석이 여기 표시됩니다.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y">
                {recent.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-center justify-between gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 text-sm">
                      <span className="font-bold tracking-tight">
                        {a.student.name}
                      </span>
                      <span className="text-muted-foreground ml-1.5 text-xs">
                        · {a.date.toISOString().slice(0, 10)} ·{" "}
                        {ABSENCE_TYPE_LABEL[a.type]} · 신청 {a.guardian.name}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${STATUS_COLOR[a.status]}`}
                    >
                      {STATUS_LABEL[a.status]}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </section>
    </main>
  );
}

// W25 P2-C: 긴급 (오늘·내일) — destructive 좌측 strip
function UrgentSection({ items }: { items: PendingItem[] }) {
  return (
    <section className="space-y-2.5">
      <header className="flex items-center justify-between">
        <h3 className="flex items-center gap-1.5 text-base font-black tracking-tight">
          <span className="bg-destructive inline-block h-2 w-2 animate-pulse rounded-full" />
          긴급 — 오늘·내일
        </h3>
        <span className="text-muted-foreground text-xs font-bold">
          {items.length}건
        </span>
      </header>
      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">긴급 처리 결석이 없어요</CardTitle>
            <CardDescription>
              오늘·내일 일자의 새 결석 신청이 들어오면 여기에 표시됩니다.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((a) => (
            <UrgentCard key={a.id} item={a} />
          ))}
        </div>
      )}
    </section>
  );
}

function ScheduledSection({ items }: { items: PendingItem[] }) {
  return (
    <section className="space-y-2.5">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-black tracking-tight">
          예정 — 다음 주 이후
        </h3>
        <span className="text-muted-foreground text-xs font-bold">
          {items.length}건
        </span>
      </header>
      <div className="space-y-2">
        {items.map((a) => (
          <UrgentCard key={a.id} item={a} muted />
        ))}
      </div>
    </section>
  );
}

function UrgentCard({ item: a, muted }: { item: PendingItem; muted?: boolean }) {
  return (
    <article className="bg-card flex items-stretch gap-0 rounded-lg border shadow-sm">
      <span
        className={`w-1 shrink-0 rounded-l-lg ${muted ? "bg-muted" : "bg-destructive"}`}
        aria-hidden
      />
      <div className="flex flex-1 items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-1.5">
            <h4 className="text-sm font-black tracking-tight">
              {a.student.name}
            </h4>
            <span className="bg-warning-soft text-warning rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
              {ABSENCE_TYPE_LABEL[a.type]}
            </span>
            <span className="text-muted-foreground tabular-nums text-xs font-bold">
              {a.date.toISOString().slice(0, 10)}
            </span>
          </div>
          {a.reason ? (
            <p className="text-foreground/80 mt-1.5 text-xs">
              &ldquo;{a.reason}&rdquo;
            </p>
          ) : null}
          <p className="text-muted-foreground mt-1.5 text-[11px] font-semibold">
            신청 {a.guardian.name} · {a.guardian.phone} ·{" "}
            {a.createdAt
              .toISOString()
              .slice(0, 16)
              .replace("T", " ")}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <span
            className={`rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide ${STATUS_COLOR[a.status]}`}
          >
            {STATUS_LABEL[a.status]}
          </span>
          <div className="flex gap-1.5">
            <AckAbsenceButton id={a.id} />
            <RejectAbsenceButton id={a.id} />
          </div>
        </div>
      </div>
    </article>
  );
}
