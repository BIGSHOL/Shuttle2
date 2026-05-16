import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { studentTerm } from "@/lib/i18n/org-terms";

// W20-A: 학생 360° 상세 페이지.
// 학원장이 학부모 컴플레인·미탑승 알림 받았을 때 한 화면에서:
// - 기본 정보 (이름·연령·KIDS 여부)
// - 보호자 list (전화·관계·tel: 링크)
// - 노선·정류장 배정
// - 최근 30일 boarding/absence/stop-change history
// 빠르게 파악하고 다음 액션(전화·편집)으로 이동.

const ABSENCE_TYPE_LABEL = {
  ABSENT_BOTH: "등·하원 모두",
  ABSENT_PICKUP: "등원만",
  ABSENT_DROPOFF: "하원만",
} as const;

const ABSENCE_STATUS_LABEL = {
  PENDING: "대기",
  NOTIFIED_DRIVER: "기사 전달",
  ACKNOWLEDGED: "확인 완료",
  REJECTED: "반려",
} as const;

const ABSENCE_STATUS_TONE: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  NOTIFIED_DRIVER: "bg-info-soft text-info",
  ACKNOWLEDGED: "bg-success-soft text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

const REQUEST_STATUS_LABEL = {
  PENDING: "대기",
  APPROVED: "승인",
  REJECTED: "반려",
} as const;

const REQUEST_STATUS_TONE: Record<string, string> = {
  PENDING: "bg-warning-soft text-warning",
  APPROVED: "bg-success-soft text-success",
  REJECTED: "bg-destructive/10 text-destructive",
};

const BOARDING_TYPE_LABEL = {
  BOARD: "탑승",
  ALIGHT: "하차",
  NO_SHOW: "미탑승",
  NO_DROPOFF: "미하차",
} as const;

const BOARDING_TYPE_TONE: Record<string, string> = {
  BOARD: "bg-success-soft text-success",
  ALIGHT: "bg-info-soft text-info",
  NO_SHOW: "bg-destructive/10 text-destructive",
  NO_DROPOFF: "bg-destructive/10 text-destructive",
};

function fmtDateKst(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtDateTimeKst(d: Date | null): string {
  if (!d) return "—";
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
}

const CURRENT_YEAR = new Date().getFullYear();

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireOwner();
  const orgId = await getOrgId();
  const term = studentTerm(user.org.type);

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const [student, recentEvents, absences, stopChanges] = await Promise.all([
    db.student.findFirst({
      where: { id, orgId },
      include: {
        routes: {
          include: {
            route: { select: { id: true, name: true, direction: true } },
            stop: { select: { id: true, name: true } },
          },
        },
        guardians: {
          include: {
            guardian: {
              select: {
                id: true,
                name: true,
                phone: true,
                userId: true,
                loginId: true,
              },
            },
          },
          orderBy: { isPrimary: "desc" },
        },
      },
    }),
    db.boardingEvent.findMany({
      where: {
        studentId: id,
        at: { gte: thirtyDaysAgo },
      },
      orderBy: { at: "desc" },
      take: 30,
      select: {
        id: true,
        type: true,
        at: true,
        notes: true,
        trip: {
          select: {
            id: true,
            date: true,
            route: { select: { name: true, direction: true } },
            driver: { select: { name: true } },
          },
        },
      },
    }),
    db.absenceRequest.findMany({
      where: {
        studentId: id,
        date: { gte: thirtyDaysAgo },
      },
      orderBy: { date: "desc" },
      take: 20,
      select: {
        id: true,
        date: true,
        type: true,
        reason: true,
        status: true,
        createdAt: true,
        rejectReason: true,
      },
    }),
    db.stopChangeRequest.findMany({
      where: {
        studentId: id,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        effectiveAt: true,
        toAddress: true,
        reason: true,
        status: true,
        createdAt: true,
        rejectReason: true,
        fromStop: { select: { name: true } },
        resultStop: { select: { name: true } },
      },
    }),
  ]);

  if (!student) notFound();

  const age = CURRENT_YEAR - student.birthYear;
  const isKids = age < 13;

  // 통계 (최근 30일)
  const noShowCount = recentEvents.filter(
    (e) => e.type === "NO_SHOW" || e.type === "NO_DROPOFF",
  ).length;
  const boardCount = recentEvents.filter(
    (e) => e.type === "BOARD" || e.type === "ALIGHT",
  ).length;
  const pendingAbsence = absences.filter((a) => a.status === "PENDING").length;
  const pendingStopChange = stopChanges.filter(
    (s) => s.status === "PENDING",
  ).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href="/students"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label={`${term} list로`}
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          {term} 상세
        </p>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={
                isKids
                  ? "bg-bus text-bus-foreground rounded-md px-2 py-0.5 text-xs font-bold"
                  : "bg-muted text-muted-foreground rounded-md px-2 py-0.5 text-xs font-medium"
              }
            >
              {age}세{isKids ? " · 어린이용" : ""}
            </span>
            <h2 className="text-2xl font-semibold">{student.name}</h2>
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            출생 {student.birthYear} · 노선 {student.routes.length}개 · 보호자{" "}
            {student.guardians.length}명
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href={`/students/${student.id}/edit`}>편집</Link>
        </Button>
      </div>

      {/* 30일 통계 4-grid */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">최근 30일</h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            오늘 기준 30일 이내 기록.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {[
            { label: "탑승·하차", value: `${boardCount}회` },
            {
              label: "미탑승·미하차",
              value: `${noShowCount}회`,
              destructive: noShowCount > 0,
            },
            {
              label: "대기 결석",
              value: `${pendingAbsence}건`,
              warning: pendingAbsence > 0,
            },
            {
              label: "대기 정류장변경",
              value: `${pendingStopChange}건`,
              warning: pendingStopChange > 0,
            },
          ].map((it) => (
            <div key={it.label} className="bg-card px-4 py-3">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                {it.label}
              </p>
              <p
                className={
                  "mt-1 text-base font-extrabold tracking-tight" +
                  (it.destructive
                    ? " text-destructive"
                    : it.warning
                      ? " text-warning"
                      : "")
                }
              >
                {it.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 보호자 list */}
      <Card>
        <CardHeader>
          <CardTitle>보호자</CardTitle>
          <CardDescription>
            긴급 연락 시 주 보호자(주) 우선. 전화 아이콘 탭하면 바로 통화.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {student.guardians.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              연결된 보호자가 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {student.guardians.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    {link.isPrimary ? (
                      <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                        주
                      </span>
                    ) : null}
                    <span className="text-sm font-extrabold tracking-tight">
                      {link.guardian.name}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">
                      ({link.relation})
                    </span>
                    {link.guardian.userId ? (
                      <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                        가입
                      </span>
                    ) : (
                      <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                        미가입
                      </span>
                    )}
                  </div>
                  <Button asChild size="sm" variant="outline">
                    <a href={`tel:${link.guardian.phone}`}>
                      <Phone className="mr-1 h-3.5 w-3.5" />
                      {link.guardian.phone}
                    </a>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 노선·정류장 배정 */}
      <Card>
        <CardHeader>
          <CardTitle>노선·정류장</CardTitle>
          <CardDescription>이 학생이 타고 내리는 노선과 정류장.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {student.routes.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              배정된 노선이 없습니다.{" "}
              <Link
                href={`/students/${student.id}/edit`}
                className="text-primary font-medium underline"
              >
                편집에서 추가
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {student.routes.map((rs) => (
                <li
                  key={rs.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        rs.route.direction === "PICKUP"
                          ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                          : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                      }
                    >
                      {rs.route.direction === "PICKUP" ? "등원" : "하원"}
                    </span>
                    <span className="text-sm font-medium">{rs.route.name}</span>
                    <span className="text-muted-foreground text-xs">
                      · {rs.stop.name}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 최근 30일 운행 기록 */}
      <Card>
        <CardHeader>
          <CardTitle>최근 30일 운행 기록</CardTitle>
          <CardDescription>
            탑승·하차·미탑승. 행 클릭 시 해당 운행 상세로.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {recentEvents.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              기록이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {recentEvents.map((e) => (
                <li key={e.id}>
                  <Link
                    href={`/dashboard/trip/${e.trip.id}`}
                    className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-sm transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`${BOARDING_TYPE_TONE[e.type]} rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide`}
                      >
                        {BOARDING_TYPE_LABEL[e.type]}
                      </span>
                      <span className="font-medium">{e.trip.route.name}</span>
                      <span className="text-muted-foreground text-xs">
                        · {e.trip.driver.name}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono text-xs">
                      {fmtDateTimeKst(e.at)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 결석 신청 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>결석 신청 이력</CardTitle>
          <CardDescription>최근 30일 학부모 결석 신청.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {absences.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              신청 기록이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {absences.map((a) => (
                <li key={a.id} className="px-4 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`${ABSENCE_STATUS_TONE[a.status]} rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide`}
                      >
                        {ABSENCE_STATUS_LABEL[a.status]}
                      </span>
                      <span className="font-medium">
                        {fmtDateKst(a.date)}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        · {ABSENCE_TYPE_LABEL[a.type]}
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      신청 {fmtDateKst(a.createdAt)}
                    </span>
                  </div>
                  {a.reason ? (
                    <p className="text-muted-foreground mt-1 text-xs">
                      사유: {a.reason}
                    </p>
                  ) : null}
                  {a.rejectReason ? (
                    <p className="text-destructive mt-1 text-xs">
                      반려 사유: {a.rejectReason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 정류장 변경 이력 */}
      <Card>
        <CardHeader>
          <CardTitle>정류장 변경 이력</CardTitle>
          <CardDescription>최근 30일 학부모 변경 신청.</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stopChanges.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              신청 기록이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {stopChanges.map((s) => (
                <li key={s.id} className="px-4 py-2.5 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`${REQUEST_STATUS_TONE[s.status]} rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide`}
                      >
                        {REQUEST_STATUS_LABEL[s.status]}
                      </span>
                      <span className="font-medium">
                        {fmtDateKst(s.effectiveAt)}부터
                      </span>
                    </div>
                    <span className="text-muted-foreground font-mono text-[10px]">
                      신청 {fmtDateKst(s.createdAt)}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {s.fromStop.name} →{" "}
                    {s.resultStop?.name ??
                      s.toAddress ??
                      "주소 미확인 (지도 좌표만)"}
                  </p>
                  {s.reason ? (
                    <p className="text-muted-foreground mt-0.5 text-xs">
                      사유: {s.reason}
                    </p>
                  ) : null}
                  {s.rejectReason ? (
                    <p className="text-destructive mt-0.5 text-xs">
                      반려 사유: {s.rejectReason}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
