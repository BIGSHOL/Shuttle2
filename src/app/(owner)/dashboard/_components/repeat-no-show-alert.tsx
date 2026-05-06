import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { db } from "@/lib/db";

// 최근 30일 NO_SHOW·NO_DROPOFF 3건 이상 누적된 학생 알림.
// groupBy + 학생 fetch 두 단계 — Suspense로 분리해 KPI 카드 첫 paint 방해 안 됨.
export async function RepeatNoShowAlert({
  orgId,
  studentLabel,
}: {
  orgId: string;
  studentLabel: string;
}) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const noShowCounts = await db.boardingEvent.groupBy({
    by: ["studentId"],
    where: {
      type: { in: ["NO_SHOW", "NO_DROPOFF"] },
      at: { gte: thirtyDaysAgo },
      trip: { vehicle: { orgId } },
    },
    _count: { studentId: true },
  });

  const repeatNoShowEntries = noShowCounts.filter(
    (g) => g._count.studentId >= 3,
  );
  if (repeatNoShowEntries.length === 0) return null;

  const repeatNoShowStudents = await db.student.findMany({
    where: {
      id: { in: repeatNoShowEntries.map((e) => e.studentId) },
      orgId,
    },
    select: {
      id: true,
      name: true,
      guardians: {
        where: { isPrimary: true },
        take: 1,
        select: { guardian: { select: { name: true, phone: true } } },
      },
    },
  });

  const repeatNoShowAlerts = repeatNoShowStudents
    .map((s) => {
      const entry = repeatNoShowEntries.find((e) => e.studentId === s.id);
      const primary = s.guardians[0]?.guardian ?? null;
      return {
        id: s.id,
        name: s.name,
        count: entry?._count.studentId ?? 0,
        guardianName: primary?.name ?? null,
        guardianPhone: primary?.phone ?? null,
      };
    })
    .sort((a, b) => b.count - a.count);

  return (
    <section>
      <div className="border-destructive/40 bg-destructive/5 rounded-lg border p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <span className="bg-destructive/15 text-destructive mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold tracking-tight">
              최근 30일 미탑승·미하차 잦은 {studentLabel} (
              {repeatNoShowAlerts.length}명)
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              3건 이상 누적된 {studentLabel}. 보호자 면담·결석 사전 통보
              안내를 검토해 주세요.
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {repeatNoShowAlerts.map((s) => (
            <li key={s.id}>
              <Link
                href={`/students/${s.id}`}
                className="bg-background hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors"
              >
                <div className="flex flex-1 items-center gap-2">
                  <span className="text-sm font-bold">{s.name}</span>
                  {s.guardianName ? (
                    <span className="text-muted-foreground text-[11px] font-medium">
                      · 보호자 {s.guardianName}
                      {s.guardianPhone ? ` (${s.guardianPhone})` : ""}
                    </span>
                  ) : null}
                </div>
                <span className="bg-destructive/10 text-destructive rounded-md px-2 py-0.5 text-[11px] font-bold">
                  {s.count}건
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
