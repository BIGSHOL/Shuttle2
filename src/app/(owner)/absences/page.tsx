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
      student: { select: { id: true, name: true } },
      guardian: { select: { name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">결석 신청</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          학부모가 보낸 {term} 결석 신청을 확인하고 처리하세요. 반려는 사유
          입력이 필요합니다.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-medium">대기 중 ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">처리할 결석이 없어요</CardTitle>
              <CardDescription>
                새 결석 신청이 들어오면 여기에 표시됩니다.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((a) => (
              <Card key={a.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {a.student.name} · {a.date.toISOString().slice(0, 10)}
                      </CardTitle>
                      <CardDescription className="mt-1 space-y-0.5">
                        <span className="block">
                          {ABSENCE_TYPE_LABEL[a.type]}
                          {a.reason ? ` · ${a.reason}` : ""}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          신청 {a.guardian.name} ({a.guardian.phone}) ·{" "}
                          {a.createdAt
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span
                        className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[a.status]}`}
                      >
                        {STATUS_LABEL[a.status]}
                      </span>
                      <div className="flex gap-1.5">
                        <RejectAbsenceButton id={a.id} />
                        <AckAbsenceButton id={a.id} />
                      </div>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-medium">
          최근 처리 (최근 20건)
        </h3>
        {recent.length === 0 ? (
          <Card>
            <CardHeader>
              <CardDescription>
                아직 처리된 결석 신청이 없어요.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {recent.map((a) => (
                  <li
                    key={a.id}
                    className="flex items-start justify-between gap-3 px-4 py-2"
                  >
                    <span>
                      <span className="font-medium">{a.student.name}</span>{" "}
                      <span className="text-muted-foreground">
                        · {a.date.toISOString().slice(0, 10)} ·{" "}
                        {ABSENCE_TYPE_LABEL[a.type]} · 신청 {a.guardian.name}
                      </span>
                      {a.status === "REJECTED" && a.rejectReason ? (
                        <span className="text-muted-foreground mt-0.5 block text-xs">
                          반려 사유: {a.rejectReason}
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_COLOR[a.status]}`}
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
