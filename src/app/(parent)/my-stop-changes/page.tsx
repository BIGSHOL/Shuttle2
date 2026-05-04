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

const STATUS_LABEL = {
  PENDING: "대기 중",
  APPROVED: "승인됨",
  REJECTED: "반려",
} as const;

const STATUS_COLOR = {
  PENDING: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-destructive/10 text-destructive",
} as const;

export default async function StopChangeRequestsPage() {
  const me = await requireGuardian();

  const items = await db.stopChangeRequest.findMany({
    where: { createdBy: me.guardian.id },
    orderBy: { createdAt: "desc" },
    take: 30,
    include: {
      student: { select: { name: true } },
      fromStop: { select: { name: true } },
      resultStop: { select: { name: true } },
    },
  });

  return (
    <main className="space-y-4 px-4 pt-4 pb-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            정류장 변경
          </h2>
          <p className="text-muted-foreground mt-1 text-xs font-medium">
            요청한 변경 내역. 학원장 승인 후 자녀의 정류장이 변경돼요.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/my-stop-changes/new">+ 새 변경</Link>
        </Button>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">변경 요청 내역이 없어요</CardTitle>
            <CardDescription>
              자녀가 타고 내리는 정류장을 옮겨야 하면 위의 버튼으로 요청해
              주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <ul className="space-y-2">
          {items.map((it) => (
            <li
              key={it.id}
              className="bg-card rounded-lg border p-3.5 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-bold">
                    {it.student.name} · {it.fromStop.name}
                  </p>
                  <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
                    {it.effectiveAt.toISOString().slice(0, 10)}부터 적용 요청
                  </p>
                  {it.toAddress ? (
                    <p className="text-muted-foreground mt-1 text-xs font-medium">
                      → {it.toAddress}
                    </p>
                  ) : null}
                  {it.reason ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      사유: {it.reason}
                    </p>
                  ) : null}
                  {it.status === "REJECTED" && it.rejectReason ? (
                    <p className="text-destructive mt-1 text-xs">
                      반려 사유: {it.rejectReason}
                    </p>
                  ) : null}
                  {it.status === "APPROVED" && it.resultStop ? (
                    <p className="text-success mt-1 text-xs font-bold">
                      ✓ {it.resultStop.name}로 변경됨
                    </p>
                  ) : null}
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${STATUS_COLOR[it.status]}`}
                >
                  {STATUS_LABEL[it.status]}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="pt-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/home">홈으로</Link>
        </Button>
      </div>
    </main>
  );
}
