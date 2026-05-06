import Link from "next/link";
import { GraduationCap } from "lucide-react";

import { db } from "@/lib/db";

// 안전교육 이수증 만료 임박·미입력 직원 알림.
// 직원 N명 × 각자 trainings nested fetch라 무거움 — Suspense로 분리.
export async function TrainingAlert({ orgId }: { orgId: string }) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const d30 = new Date(today);
  d30.setUTCDate(d30.getUTCDate() + 30);

  const staffWithTraining = await db.staff.findMany({
    where: { orgId },
    select: {
      id: true,
      name: true,
      role: true,
      trainings: {
        orderBy: { completedOn: "desc" },
        take: 1,
        select: { expiresOn: true },
      },
    },
  });

  const trainingAlerts = staffWithTraining
    .map((s) => {
      const latest = s.trainings[0];
      if (!latest) return { ...s, kind: "none" as const };
      if (latest.expiresOn < today)
        return { ...s, kind: "expired" as const, expiresOn: latest.expiresOn };
      if (latest.expiresOn <= d30)
        return { ...s, kind: "soon" as const, expiresOn: latest.expiresOn };
      return null;
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  if (trainingAlerts.length === 0) return null;

  return (
    <section>
      <div className="border-warning bg-warning-soft/40 rounded-lg border p-4 shadow-sm">
        <div className="flex items-start gap-2">
          <span className="bg-warning text-warning-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
            <GraduationCap className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-extrabold tracking-tight">
              안전교육 만료 임박·미입력 ({trainingAlerts.length}명)
            </h3>
            <p className="text-muted-foreground mt-0.5 text-xs font-medium">
              도로교통법상 운영자·기사·동승보호자는 2년마다 이수 의무.
            </p>
          </div>
        </div>
        <ul className="mt-3 space-y-1.5">
          {trainingAlerts.map((s) => {
            const expired = s.kind === "expired";
            const tone = expired
              ? "bg-destructive/10 text-destructive"
              : s.kind === "soon"
                ? "bg-warning text-warning-foreground"
                : "bg-muted text-muted-foreground";
            const label = expired
              ? `만료됨 (${s.expiresOn.toISOString().slice(0, 10)})`
              : s.kind === "soon"
                ? `30일 이내 (${s.expiresOn.toISOString().slice(0, 10)})`
                : "기록 없음";
            return (
              <li key={s.id}>
                <Link
                  href="/training"
                  className="bg-background hover:bg-muted/40 flex items-center justify-between gap-3 rounded-md border px-3 py-2 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-bold">
                    {s.name}
                    <span className="text-muted-foreground text-[11px] font-medium">
                      ·{" "}
                      {s.role === "OWNER"
                        ? "학원장·원장"
                        : s.role === "DRIVER"
                          ? "기사"
                          : "동승보호자"}
                    </span>
                  </span>
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${tone}`}
                  >
                    {label}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
