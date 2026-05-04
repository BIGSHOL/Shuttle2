import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { ApproveStopChangeButton } from "./_components/approve-stop-change-button";
import { RejectStopChangeButton } from "./_components/reject-stop-change-button";

const STATUS_COLOR = {
  PENDING: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-destructive/10 text-destructive",
} as const;

const STATUS_LABEL = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
} as const;

export default async function OwnerStopChangeRequestsPage() {
  await requireOwner();
  const orgId = await getOrgId();

  const pending = await db.stopChangeRequest.findMany({
    where: { orgId, status: "PENDING" },
    orderBy: { createdAt: "asc" },
    include: {
      student: { select: { id: true, name: true } },
      fromStop: { select: { id: true, name: true, lat: true, lng: true } },
      guardian: { select: { name: true, phone: true } },
    },
  });

  const recent = await db.stopChangeRequest.findMany({
    where: { orgId, status: { in: ["APPROVED", "REJECTED"] } },
    orderBy: { decidedAt: "desc" },
    take: 20,
    include: {
      student: { select: { name: true } },
      fromStop: { select: { name: true } },
      resultStop: { select: { name: true } },
      guardian: { select: { name: true } },
    },
  });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-6">
      <div>
        <h2 className="text-2xl font-semibold">정류장 변경 요청</h2>
        <p className="text-muted-foreground mt-1 text-sm">
          학부모가 보낸 정류장 변경 요청을 검토하세요. 승인 시 새 정류장이
          생성되고 자녀의 RouteStudent 정류장이 즉시 갱신됩니다.
        </p>
      </div>

      <section className="space-y-3">
        <h3 className="text-base font-medium">대기 중 ({pending.length})</h3>
        {pending.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">처리할 요청이 없어요</CardTitle>
              <CardDescription>
                새 정류장 변경 요청이 들어오면 여기에 표시됩니다.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-2">
            {pending.map((it) => (
              <Card key={it.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base">
                        {it.student.name} · 기존 {it.fromStop.name}
                      </CardTitle>
                      <CardDescription className="mt-1 space-y-0.5">
                        <span className="block">
                          적용 일자{" "}
                          {it.effectiveAt.toISOString().slice(0, 10)}
                        </span>
                        <span className="text-muted-foreground block text-xs">
                          새 위치 좌표: {it.toLat.toFixed(5)},{" "}
                          {it.toLng.toFixed(5)}
                          {it.toAddress ? ` · ${it.toAddress}` : ""}
                        </span>
                        {it.reason ? (
                          <span className="text-muted-foreground block text-xs">
                            사유: {it.reason}
                          </span>
                        ) : null}
                        <span className="text-muted-foreground block text-xs">
                          신청 {it.guardian.name} ({it.guardian.phone}) ·{" "}
                          {it.createdAt
                            .toISOString()
                            .slice(0, 16)
                            .replace("T", " ")}
                        </span>
                      </CardDescription>
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_COLOR[it.status]}`}
                    >
                      {STATUS_LABEL[it.status]}
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="flex justify-end gap-2">
                  <RejectStopChangeButton id={it.id} />
                  <ApproveStopChangeButton
                    id={it.id}
                    suggestedName={`${it.student.name} 새 정류장`}
                  />
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-base font-medium">최근 처리 (최근 20건)</h3>
        {recent.length === 0 ? (
          <Card>
            <CardHeader>
              <CardDescription>아직 처리된 요청이 없어요.</CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <Card className="py-0">
            <CardContent className="p-0">
              <ul className="divide-y text-sm">
                {recent.map((it) => (
                  <li
                    key={it.id}
                    className="flex items-start justify-between gap-3 px-4 py-2"
                  >
                    <div>
                      <span className="font-medium">{it.student.name}</span>{" "}
                      <span className="text-muted-foreground">
                        · {it.fromStop.name}
                        {it.resultStop ? ` → ${it.resultStop.name}` : ""}
                      </span>
                      {it.status === "REJECTED" && it.rejectReason ? (
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          반려 사유: {it.rejectReason}
                        </p>
                      ) : null}
                    </div>
                    <span
                      className={`rounded-md px-2 py-0.5 text-xs font-medium shrink-0 ${STATUS_COLOR[it.status]}`}
                    >
                      {STATUS_LABEL[it.status]}
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
