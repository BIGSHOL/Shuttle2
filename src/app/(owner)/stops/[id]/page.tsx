import { ArrowLeft } from "lucide-react";
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
import { StopMapDisplay } from "@/lib/map/stop-map-display";

import { DeleteStopButton } from "../_components/delete-stop-button";

// W21-C: 정류장 360° 상세.
// 학원장이 한 정류장의 위치(맵)·사용 노선·home 학생·30일 변경 요청을 한 화면에서.

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;
const MODE_LABEL = { KIDS: "어린이용", GENERAL: "일반용" } as const;

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

export default async function StopProfilePage({
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

  const [stop, routeStops, routeStudents, stopChanges] = await Promise.all([
    db.stop.findFirst({ where: { id, orgId } }),
    db.routeStop.findMany({
      where: { stopId: id },
      include: {
        route: {
          select: {
            id: true,
            name: true,
            direction: true,
            vehicle: { select: { plate: true, mode: true } },
          },
        },
      },
      orderBy: [
        { route: { direction: "asc" } },
        { route: { name: "asc" } },
        { order: "asc" },
      ],
    }),
    db.routeStudent.findMany({
      where: { stopId: id, student: { orgId } },
      include: {
        student: { select: { id: true, name: true } },
        route: { select: { name: true, direction: true } },
      },
      orderBy: [{ route: { name: "asc" } }],
    }),
    db.stopChangeRequest.findMany({
      where: {
        OR: [{ fromStopId: id }, { resultStopId: id }],
        orgId,
        createdAt: { gte: thirtyDaysAgo },
      },
      include: {
        student: { select: { id: true, name: true } },
        fromStop: { select: { name: true } },
        resultStop: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
  ]);
  if (!stop) notFound();

  const fromCount = stopChanges.filter((s) => s.fromStopId === id).length;
  const toCount = stopChanges.filter((s) => s.resultStopId === id).length;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href="/stops"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="정류장 목록으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          정류장 상세
        </p>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold">{stop.name}</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            {stop.address ?? "주소 미확인"} · 반경 {stop.radiusM}m
          </p>
          <p className="text-muted-foreground/70 mt-0.5 font-mono text-[11px]">
            {stop.lat.toFixed(6)}, {stop.lng.toFixed(6)}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href={`/stops/${stop.id}/edit`}>편집</Link>
          </Button>
          <DeleteStopButton id={stop.id} name={stop.name} />
        </div>
      </div>

      {/* 카카오맵 */}
      <StopMapDisplay
        position={{ lat: stop.lat, lng: stop.lng }}
        radiusM={stop.radiusM}
        name={stop.name}
      />

      {/* 30일 통계 4-grid */}
      <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
        <div className="border-b px-4 py-3">
          <h3 className="text-sm font-extrabold tracking-tight">현황·30일</h3>
          <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
            노선·학생은 현재, 변경 요청은 30일 이내.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
          {[
            { label: "사용 노선", value: `${routeStops.length}개` },
            { label: "home 학생", value: `${routeStudents.length}명` },
            {
              label: "변경 요청 (이 정류장→다른 곳)",
              value: `${fromCount}건`,
              warning: fromCount > 0,
            },
            {
              label: "변경 요청 (다른 곳→이 정류장)",
              value: `${toCount}건`,
            },
          ].map((it) => (
            <div key={it.label} className="bg-card px-4 py-3">
              <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                {it.label}
              </p>
              <p
                className={
                  "mt-1 text-base font-extrabold tracking-tight" +
                  (it.warning ? " text-warning" : "")
                }
              >
                {it.value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* 사용 노선 list */}
      <Card>
        <CardHeader>
          <CardTitle>사용 노선</CardTitle>
          <CardDescription>
            이 정류장을 거쳐가는 노선. 행 클릭 시 노선의 30일 분석으로 이동.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {routeStops.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              아직 어떤 노선에서도 사용하지 않습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {routeStops.map((rs) => (
                <li key={rs.id}>
                  <Link
                    href={`/dashboard/analytics/routes/${rs.route.id}?range=30d`}
                    className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          rs.route.direction === "PICKUP"
                            ? "bg-success-soft text-success rounded-md px-2 py-0.5 text-xs font-bold"
                            : "bg-info-soft text-info rounded-md px-2 py-0.5 text-xs font-bold"
                        }
                      >
                        {DIRECTION_LABEL[rs.route.direction]}
                      </span>
                      <span className="text-sm font-medium">
                        {rs.route.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        · {rs.route.vehicle.plate}
                      </span>
                      {rs.route.vehicle.mode === "KIDS" ? (
                        <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                          {MODE_LABEL.KIDS}
                        </span>
                      ) : null}
                    </div>
                    <span className="text-muted-foreground font-mono text-[11px]">
                      순서 {rs.order} · {rs.scheduledAt}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* home 학생 list */}
      <Card>
        <CardHeader>
          <CardTitle>이 정류장이 home인 학생</CardTitle>
          <CardDescription>
            이 정류장을 home으로 사용하는 학생. 행 클릭 시 학생 상세로.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {routeStudents.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              home 학생이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {routeStudents.map((rs) => (
                <li key={rs.id}>
                  <Link
                    href={`/students/${rs.student.id}`}
                    className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={
                          rs.route.direction === "PICKUP"
                            ? "bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                            : "bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                        }
                      >
                        {DIRECTION_LABEL[rs.route.direction]}
                      </span>
                      <span className="text-sm font-medium">
                        {rs.student.name}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        · {rs.route.name}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 30일 변경 요청 history */}
      <Card>
        <CardHeader>
          <CardTitle>최근 30일 변경 요청</CardTitle>
          <CardDescription>
            이 정류장이 출발지 또는 결과지인 학부모 변경 요청.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {stopChanges.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              30일 내 변경 요청이 없습니다.
            </p>
          ) : (
            <ul className="divide-y">
              {stopChanges.map((s) => {
                const fromMe = s.fromStopId === id;
                return (
                  <li key={s.id} className="px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`${REQUEST_STATUS_TONE[s.status]} rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide`}
                        >
                          {REQUEST_STATUS_LABEL[s.status]}
                        </span>
                        <span
                          className={
                            fromMe
                              ? "bg-warning-soft text-warning rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                              : "bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                          }
                        >
                          {fromMe ? "이 정류장에서" : "이 정류장으로"}
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
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
