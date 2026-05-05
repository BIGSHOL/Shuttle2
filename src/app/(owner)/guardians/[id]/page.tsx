import { ArrowLeft, Phone } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

import { ResetGuardianPasswordButton } from "../_components/reset-guardian-password-button";
import { UnlinkGuardianLinkButton } from "../_components/unlink-guardian-link-button";

// W21-D: 학부모(보호자) 360° 상세.
// 학원장이 한 보호자의 자녀·30일 결석/정류장 변경 history·푸시 디바이스 상태를
// 한 화면에서. Guardian은 학원 간 공유 가능하므로 자녀 student.orgId join 필터.

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

function fmtDateKst(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtDateTimeKst(d: Date | null): string {
  if (!d) return "—";
  const k = new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString();
  return `${k.slice(0, 10)} ${k.slice(11, 16)}`;
}

// 단순 UA → 디바이스 라벨. 정확도보다 한눈에 구분 가능한 게 목표.
function deviceLabel(ua: string | null): string {
  if (!ua) return "기기 미상";
  const u = ua.toLowerCase();
  if (u.includes("iphone")) return "iPhone";
  if (u.includes("ipad")) return "iPad";
  if (u.includes("android")) return "Android";
  if (u.includes("macintosh") || u.includes("mac os")) return "Mac";
  if (u.includes("windows")) return "Windows";
  if (u.includes("linux")) return "Linux";
  return "기타";
}

export default async function GuardianProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await requireOwner();
  const orgId = await getOrgId();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  // 1차 검증: 본 학원 학생과 link된 보호자만 통과
  const guardian = await db.guardian.findFirst({
    where: { id, links: { some: { student: { orgId } } } },
    include: {
      links: {
        where: { student: { orgId } },
        include: {
          student: { select: { id: true, name: true } },
        },
        orderBy: { isPrimary: "desc" },
      },
    },
  });
  if (!guardian) notFound();

  const [absences, stopChanges, pushSubs, lastNotif] = await Promise.all([
    db.absenceRequest.findMany({
      where: {
        createdBy: id,
        student: { orgId },
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        student: { select: { id: true, name: true } },
      },
    }),
    db.stopChangeRequest.findMany({
      where: {
        createdBy: id,
        orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: {
        student: { select: { id: true, name: true } },
        fromStop: { select: { name: true } },
        resultStop: { select: { name: true } },
      },
    }),
    db.pushSubscription.findMany({
      where: { guardianId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        userAgent: true,
        createdAt: true,
        endpoint: true,
      },
    }),
    // 마지막 알림 발송 시각: Notification.userId = guardian.userId
    guardian.userId
      ? db.notification.findFirst({
          where: { userId: guardian.userId },
          orderBy: { createdAt: "desc" },
          select: { createdAt: true },
        })
      : Promise.resolve(null),
  ]);

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href="/guardians"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="보호자 목록으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          보호자 상세
        </p>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-2xl font-semibold">{guardian.name}</h2>
            {guardian.userId ? (
              <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-bold">
                가입
              </span>
            ) : (
              <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-medium">
                미가입
              </span>
            )}
          </div>
          <p className="text-muted-foreground mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <span>ID {guardian.loginId ?? "—"}</span>
            {guardian.phone ? (
              <a
                href={`tel:${guardian.phone}`}
                className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <Phone className="h-3 w-3" />
                {guardian.phone}
              </a>
            ) : null}
            {guardian.recoveryEmail ? (
              <span>· {guardian.recoveryEmail}</span>
            ) : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {guardian.userId && guardian.loginId ? (
            <ResetGuardianPasswordButton
              guardianId={guardian.id}
              name={guardian.name}
            />
          ) : null}
        </div>
      </div>

      {/* 30일 활동 4-grid */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">
            최근 30일 활동
          </h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            결석·정류장 변경·푸시 디바이스 상태.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {[
            { label: "결석 신청", value: `${absences.length}건` },
            { label: "정류장 변경", value: `${stopChanges.length}건` },
            {
              label: "푸시 디바이스",
              value: `${pushSubs.length}대`,
              destructive: guardian.userId !== null && pushSubs.length === 0,
            },
            {
              label: "마지막 알림",
              value: lastNotif ? fmtDateKst(lastNotif.createdAt) : "없음",
            },
          ].map((it) => (
            <div key={it.label} className="bg-card px-4 py-3">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                {it.label}
              </p>
              <p
                className={
                  "mt-1 text-base font-extrabold tracking-tight" +
                  (it.destructive ? " text-destructive" : "")
                }
              >
                {it.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 자녀 list */}
      <Card>
        <CardHeader>
          <CardTitle>연결된 자녀</CardTitle>
          <CardDescription>
            본 기관에 등록된 자녀만. 이름 클릭 시 학생 360°로 이동.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {guardian.links.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              연결된 자녀가 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {guardian.links.map((link) => (
                <li
                  key={link.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                >
                  <Link
                    href={`/students/${link.student.id}`}
                    className="hover:bg-muted/50 -m-2 flex flex-1 flex-wrap items-center gap-2 rounded-md p-2 transition-colors"
                  >
                    {link.isPrimary ? (
                      <span className="bg-primary/10 text-primary rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                        주
                      </span>
                    ) : null}
                    <span className="text-sm font-extrabold tracking-tight">
                      {link.student.name}
                    </span>
                    <span className="text-muted-foreground text-xs font-medium">
                      ({link.relation})
                    </span>
                  </Link>
                  <UnlinkGuardianLinkButton
                    linkId={link.id}
                    guardianName={guardian.name}
                    studentName={link.student.name}
                  />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 결석 신청 history */}
      <Card>
        <CardHeader>
          <CardTitle>결석 신청 history</CardTitle>
          <CardDescription>최근 30일 이 보호자가 신청한 결석.</CardDescription>
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
                      <Link
                        href={`/students/${a.student.id}`}
                        className="hover:underline font-medium"
                      >
                        {a.student.name}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        · {fmtDateKst(a.date)} · {ABSENCE_TYPE_LABEL[a.type]}
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

      {/* 정류장 변경 history */}
      <Card>
        <CardHeader>
          <CardTitle>정류장 변경 history</CardTitle>
          <CardDescription>
            최근 30일 이 보호자가 신청한 변경.
          </CardDescription>
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
                      <Link
                        href={`/students/${s.student.id}`}
                        className="hover:underline font-medium"
                      >
                        {s.student.name}
                      </Link>
                      <span className="text-muted-foreground text-xs">
                        · {fmtDateKst(s.effectiveAt)}부터
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

      {/* 푸시 디바이스 list */}
      <Card>
        <CardHeader>
          <CardTitle>푸시 디바이스</CardTitle>
          <CardDescription>
            이 보호자가 푸시 알림을 받기 위해 구독한 브라우저·앱.
            {guardian.userId === null
              ? " 미가입 상태이므로 디바이스가 없습니다."
              : null}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pushSubs.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              구독한 디바이스가 없습니다. 학부모 앱에서 알림을 켜야 표시됩니다.
            </p>
          ) : (
            <ul className="divide-y">
              {pushSubs.map((sub) => (
                <li
                  key={sub.id}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                      {deviceLabel(sub.userAgent)}
                    </span>
                    <span className="text-muted-foreground truncate text-xs font-medium">
                      {sub.userAgent ?? "UA 미상"}
                    </span>
                  </div>
                  <span className="text-muted-foreground shrink-0 font-mono text-[10px]">
                    구독 {fmtDateTimeKst(sub.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
