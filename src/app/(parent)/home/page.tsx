import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { ORG_TYPE_LABEL } from "@/lib/i18n/org-terms";
import {
  getTodayChildTrips,
  type ChildTripCard,
} from "@/lib/parent/today-trips";

const ABSENCE_TYPE_SHORT = {
  ABSENT_BOTH: "등·하원",
  ABSENT_PICKUP: "등원",
  ABSENT_DROPOFF: "하원",
} as const;

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

function fmtHHmm(d: Date): string {
  // KST 기준 표시
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000);
  return kst.toISOString().slice(11, 16);
}

function CardForKind({ card }: { card: ChildTripCard }) {
  if (card.kind === "running") {
    return (
      <Card className="border-emerald-300 bg-emerald-50/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            지금 운행 중
          </CardTitle>
          <CardDescription>
            {DIRECTION_LABEL[card.route.direction]} · {card.route.name} ·{" "}
            {card.route.vehicle.plate}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-muted-foreground text-xs">
            정류장: {card.childStop.name} · 시작 {fmtHHmm(
              new Date(card.startedAtISO),
            )}
          </p>
          <Button asChild size="sm" className="w-full">
            <Link href={`/trip-live/${card.tripId}`}>실시간 보기</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (card.kind === "scheduled") {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">오늘 예정</CardTitle>
          <CardDescription>
            {DIRECTION_LABEL[card.route.direction]} · {card.route.name}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-muted-foreground text-xs">
          정류장: {card.childStop.name}
          {card.route.scheduledFirstAt
            ? ` · 출발 예정 ${card.route.scheduledFirstAt}`
            : ""}
          <p className="mt-2">운행이 시작되면 실시간 위치를 볼 수 있어요.</p>
        </CardContent>
      </Card>
    );
  }

  if (card.kind === "finished") {
    return (
      <Card className="bg-muted/40">
        <CardHeader>
          <CardTitle className="text-muted-foreground text-base">
            오늘 운행 완료
          </CardTitle>
          <CardDescription>
            {DIRECTION_LABEL[card.route.direction]} · {card.route.name} · 종료{" "}
            {fmtHHmm(new Date(card.endedAtISO))}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // none
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-muted-foreground text-base">
          {card.reason === "no_route"
            ? "노선 미배정"
            : "오늘 예정된 운행 없음"}
        </CardTitle>
        <CardDescription>
          {card.reason === "no_route"
            ? "학원장·원장님께 노선 배정을 요청해 주세요."
            : "오늘은 셔틀 운행이 없는 날이에요."}
        </CardDescription>
      </CardHeader>
    </Card>
  );
}

export default async function ParentHomePage() {
  const me = await requireGuardian();

  // 자녀 기본 정보 (org 라벨 등 표시용)
  const studentIds = me.students.map((s) => s.id);
  const studentRows = await db.student.findMany({
    where: { id: { in: studentIds } },
    select: {
      id: true,
      name: true,
      org: { select: { name: true, type: true } },
    },
  });
  const studentInfo = new Map(studentRows.map((s) => [s.id, s] as const));

  // 자녀별 오늘 운행 카드
  const todayCards = await getTodayChildTrips(
    me.students.map((s) => ({ id: s.id, name: s.name })),
  );

  // 다가오는 결석 신청 (오늘 또는 미래, ACKNOWLEDGED 제외, 5건)
  const today = todayUtcDateKst();
  const upcomingAbsences = await db.absenceRequest.findMany({
    where: {
      studentId: { in: studentIds },
      date: { gte: today },
      status: { not: "ACKNOWLEDGED" },
    },
    orderBy: { date: "asc" },
    take: 5,
    include: { student: { select: { id: true, name: true } } },
  });

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
      <section>
        <h2 className="text-xl font-semibold">
          {me.guardian.name}님, 안녕하세요
        </h2>
        <p className="text-muted-foreground mt-1 text-sm">
          연결된 자녀 {todayCards.length}명의 셔틀 운행을 확인할 수 있어요.
        </p>
      </section>

      {todayCards.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              연결된 자녀가 아직 없어요
            </CardTitle>
            <CardDescription>
              학원장·원장님께 보호자 초대를 다시 요청해 주세요.
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <section className="space-y-5">
          {todayCards.map((c) => {
            const info = studentInfo.get(c.studentId);
            return (
              <div key={c.studentId} className="space-y-2">
                <div className="flex items-end justify-between">
                  <h3 className="text-base font-medium">{c.studentName}</h3>
                  <span className="text-muted-foreground text-xs">
                    {info?.org.name}
                    {info ? ` · ${ORG_TYPE_LABEL[info.org.type]}` : ""}
                  </span>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {c.cards.map((card, i) => (
                    <CardForKind key={i} card={card} />
                  ))}
                </div>
              </div>
            );
          })}
        </section>
      )}

      <section className="space-y-2">
        <div className="flex items-end justify-between">
          <h3 className="text-sm font-medium">결석 신청</h3>
          <div className="flex gap-2">
            <Button asChild size="sm" variant="outline">
              <Link href="/my-absences">전체 보기</Link>
            </Button>
            <Button asChild size="sm">
              <Link href="/my-absences/new">+ 새 신청</Link>
            </Button>
          </div>
        </div>
        {upcomingAbsences.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-muted-foreground text-base">
                예정된 결석 없음
              </CardTitle>
              <CardDescription>
                결석 사유가 생기면 위의 &quot;+ 새 신청&quot; 버튼을 눌러
                주세요.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <div className="space-y-2">
            {upcomingAbsences.map((a) => (
              <Card key={a.id}>
                <CardContent className="flex items-center justify-between gap-2 p-3 text-sm">
                  <span>
                    <span className="font-medium">{a.student.name}</span> ·{" "}
                    {a.date.toISOString().slice(0, 10)} ·{" "}
                    {ABSENCE_TYPE_SHORT[a.type]}
                  </span>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                    {a.status === "PENDING" ? "대기" : "전달됨"}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
