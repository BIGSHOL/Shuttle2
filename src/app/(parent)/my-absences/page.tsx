import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

const ABSENCE_TYPE_LABEL = {
  ABSENT_BOTH: "등·하원 모두",
  ABSENT_PICKUP: "등원만",
  ABSENT_DROPOFF: "하원만",
} as const;

const STATUS_LABEL = {
  PENDING: "대기 중",
  NOTIFIED_DRIVER: "기사에게 알림",
  ACKNOWLEDGED: "확인 완료",
  REJECTED: "반려",
} as const;

const STATUS_COLOR = {
  PENDING: "bg-amber-100 text-amber-900",
  NOTIFIED_DRIVER: "bg-sky-100 text-sky-900",
  ACKNOWLEDGED: "bg-emerald-100 text-emerald-900",
  REJECTED: "bg-rose-100 text-rose-900",
} as const;

function fmtKstDate(d: Date): string {
  return new Date(d.getTime()).toISOString().slice(0, 10);
}

export default async function ParentAbsencesPage() {
  const me = await requireGuardian();
  const studentIds = me.students.map((s) => s.id);

  const absences = await db.absenceRequest.findMany({
    where: { studentId: { in: studentIds } },
    orderBy: [{ date: "desc" }, { createdAt: "desc" }],
    take: 50,
    include: {
      student: { select: { id: true, name: true } },
    },
  });

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">결석 신청 내역</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            최근 50건. 운행 시작 전까지만 신청할 수 있어요.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/my-absences/new">+ 새 결석 신청</Link>
        </Button>
      </div>

      {absences.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">신청 내역이 없습니다</CardTitle>
            <CardDescription>
              결석 사유가 생기면 위의 버튼으로 신청해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="space-y-2">
          {absences.map((a) => (
            <Card key={a.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      {a.student.name} · {fmtKstDate(a.date)}
                    </CardTitle>
                    <CardDescription className="mt-1 space-y-1">
                      <span className="block">
                        {ABSENCE_TYPE_LABEL[a.type]}
                        {a.reason ? ` · ${a.reason}` : ""}
                      </span>
                      {a.status === "REJECTED" && a.rejectReason ? (
                        <span className="text-destructive block text-xs">
                          반려 사유: {a.rejectReason}
                        </span>
                      ) : null}
                    </CardDescription>
                  </div>
                  <span
                    className={`rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLOR[a.status]}`}
                  >
                    {STATUS_LABEL[a.status]}
                  </span>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
