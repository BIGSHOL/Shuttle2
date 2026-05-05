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
import {
  computeTripStats,
  formatDuration,
  type PingPoint,
} from "@/lib/geo/trip-stats";

import { DeleteStaffButton } from "../_components/delete-staff-button";
import { ResetStaffPasswordButton } from "../_components/reset-staff-password-button";

// W21-B: 직원(기사·동승자·학원장) 360° 상세.
// 학원장이 한 직원의 운행 패턴(30일)·안전교육 만기·안전점검 미흡 운행을 한
// 화면에서. DRIVER만 W19 분석 페이지로 cross-link.

const ROLE_LABEL = {
  OWNER: "학원장·원장",
  DRIVER: "기사",
  HELPER: "동승보호자",
} as const;

const ROLE_BADGE: Record<keyof typeof ROLE_LABEL, string> = {
  OWNER: "bg-primary/10 text-primary",
  DRIVER: "bg-success-soft text-success",
  HELPER: "bg-info-soft text-info",
};

const TRAINING_CATEGORY_LABEL = {
  OPERATOR: "운영자 안전교육",
  DRIVER: "운전자 안전교육",
  HELPER: "동승자 안전교육",
} as const;

const DIRECTION_LABEL = {
  PICKUP: "등원",
  DROPOFF: "하원",
} as const;

function fmtDateKst(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function fmtTimeKst(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

export default async function StaffProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const me = await requireOwner();
  const orgId = await getOrgId();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setUTCDate(thirtyDaysAgo.getUTCDate() - 30);

  const staff = await db.staff.findFirst({
    where: { id, orgId },
    include: {
      trainings: { orderBy: { completedOn: "desc" } },
    },
  });
  if (!staff) notFound();

  const isMe = staff.id === me.staff.id;
  const isOwner = staff.role === "OWNER";
  const showOps = !isOwner; // 운행 통계·trip list는 DRIVER/HELPER만

  const trips = showOps
    ? await db.trip.findMany({
        where: {
          vehicle: { orgId },
          OR: [{ driverId: id }, { helperId: id }],
          startedAt: { not: null, gte: thirtyDaysAgo },
        },
        orderBy: { startedAt: "desc" },
        take: 30,
        select: {
          id: true,
          date: true,
          startedAt: true,
          endedAt: true,
          driverId: true,
          helperId: true,
          route: { select: { name: true, direction: true } },
          driver: { select: { name: true } },
          vehicle: { select: { plate: true, mode: true } },
          pings: {
            orderBy: { recordedAt: "asc" },
            select: {
              lat: true,
              lng: true,
              recordedAt: true,
              speed: true,
              source: true,
            },
          },
          events: {
            where: { type: { in: ["NO_SHOW", "NO_DROPOFF"] } },
            select: { id: true },
          },
          safetyCheck: {
            select: {
              seatbeltAllOk: true,
              allAlightedOk: true,
            },
          },
        },
      })
    : [];

  // 통계
  const tripStatsList = trips.map((t) => ({
    trip: t,
    stats: computeTripStats(t.pings as PingPoint[], t.startedAt, t.endedAt),
  }));
  const totalDuration = tripStatsList.reduce(
    (s, x) => s + x.stats.durationSec,
    0,
  );
  const totalDistance = tripStatsList.reduce(
    (s, x) => s + x.stats.distanceKm,
    0,
  );
  const avgDurationSec =
    trips.length > 0 ? Math.round(totalDuration / trips.length) : 0;
  const avgDistanceKm =
    trips.length > 0 ? +(totalDistance / trips.length).toFixed(2) : 0;
  const avgSpeedKmh =
    totalDuration > 0
      ? +(totalDistance / (totalDuration / 3600)).toFixed(1)
      : 0;
  const noShowCount = trips.reduce((s, t) => s + t.events.length, 0);

  // 안전점검 미흡 — 본인이 driver인 KIDS 운행만 (기사 책임)
  const safetyFailTrips = trips.filter(
    (t) =>
      t.vehicle.mode === "KIDS" &&
      t.driverId === id &&
      t.safetyCheck &&
      (!t.safetyCheck.seatbeltAllOk || !t.safetyCheck.allAlightedOk),
  );

  // 안전교육 상태 (30일 이내 만기 임박, 만료). nowMs는 렌더 진입 시 한 번만 캡처 (impure rule).
  const nowMs = today.getTime();
  const trainingsAnnotated = staff.trainings.map((t) => {
    const daysLeft = Math.floor(
      (t.expiresOn.getTime() - nowMs) / (24 * 60 * 60 * 1000),
    );
    let tone: "ok" | "warning" | "expired" = "ok";
    if (daysLeft < 0) tone = "expired";
    else if (daysLeft < 30) tone = "warning";
    return { ...t, daysLeft, tone };
  });

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-6">
      {/* 뒤로가기 */}
      <div className="flex items-center gap-2">
        <Link
          href="/staff"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="직원 목록으로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          직원 상세
        </p>
      </div>

      {/* 헤더 */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`${ROLE_BADGE[staff.role]} rounded-md px-2 py-0.5 text-xs font-bold`}
            >
              {ROLE_LABEL[staff.role]}
            </span>
            <h2 className="text-2xl font-semibold">
              {staff.name}
              {isMe ? (
                <span className="text-muted-foreground ml-2 text-sm font-medium">
                  (나)
                </span>
              ) : null}
            </h2>
            {staff.userId ? (
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
            <span>ID {staff.loginId ?? "—"}</span>
            {staff.phone ? (
              <a
                href={`tel:${staff.phone}`}
                className="hover:text-foreground inline-flex items-center gap-1 transition-colors"
              >
                <Phone className="h-3 w-3" />
                {staff.phone}
              </a>
            ) : null}
            {staff.recoveryEmail ? <span>· {staff.recoveryEmail}</span> : null}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {staff.role === "DRIVER" ? (
            <Button asChild variant="outline">
              <Link
                href={`/dashboard/analytics/drivers/${staff.id}?range=30d`}
              >
                상세 운행 분석
              </Link>
            </Button>
          ) : null}
          {!isMe && !isOwner ? (
            <>
              {staff.userId && staff.loginId ? (
                <ResetStaffPasswordButton
                  staffId={staff.id}
                  name={staff.name}
                />
              ) : null}
              <DeleteStaffButton
                id={staff.id}
                name={staff.name}
                roleLabel={ROLE_LABEL[staff.role]}
              />
            </>
          ) : null}
        </div>
      </div>

      {/* 30일 운행 통계 (DRIVER/HELPER만) */}
      {showOps ? (
        <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
          <div className="border-b px-4 py-3">
            <h3 className="text-sm font-extrabold tracking-tight">
              최근 30일 운행
            </h3>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
              {staff.role === "DRIVER"
                ? "운전한 운행 평균치."
                : "동승한 운행 평균치."}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-px bg-border lg:grid-cols-4">
            {[
              { label: "운행 횟수", value: `${trips.length}회` },
              { label: "평균 시간", value: formatDuration(avgDurationSec) },
              {
                label: "평균 거리",
                value: `${avgDistanceKm.toFixed(2)} km`,
              },
              {
                label: "미탑승·미하차",
                value: `${noShowCount}회`,
                destructive: noShowCount > 0,
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
          {totalDuration > 0 ? (
            <p className="text-muted-foreground border-t px-4 py-2 text-[11px] font-medium">
              누계: {totalDistance.toFixed(1)}km · 평균 속도 {avgSpeedKmh}km/h
            </p>
          ) : null}
        </section>
      ) : null}

      {/* 안전교육 list */}
      <Card>
        <CardHeader>
          <CardTitle>안전교육</CardTitle>
          <CardDescription>
            도교법상 운영자·운전자·동승자는 2년마다 이수. 만기 30일 이내면 갱신
            필요.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {trainingsAnnotated.length === 0 ? (
            <p className="text-muted-foreground p-6 text-sm">
              등록된 안전교육이 없습니다.{" "}
              <Link
                href="/safety-training"
                className="text-primary font-medium underline"
              >
                안전교육 페이지에서 등록
              </Link>
            </p>
          ) : (
            <ul className="divide-y">
              {trainingsAnnotated.map((t) => {
                const toneCls =
                  t.tone === "expired"
                    ? "bg-destructive/10 text-destructive"
                    : t.tone === "warning"
                      ? "bg-warning-soft text-warning"
                      : "bg-success-soft text-success";
                const toneLabel =
                  t.tone === "expired"
                    ? "만료"
                    : t.tone === "warning"
                      ? `D-${t.daysLeft}`
                      : "유효";
                return (
                  <li
                    key={t.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`${toneCls} rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide`}
                      >
                        {toneLabel}
                      </span>
                      <span className="text-sm font-medium">
                        {TRAINING_CATEGORY_LABEL[t.category]}
                      </span>
                      <span className="text-muted-foreground text-xs">
                        · 이수 {fmtDateKst(t.completedOn)} · 만기{" "}
                        {fmtDateKst(t.expiresOn)}
                      </span>
                    </div>
                    {t.certificateUrl ? (
                      <a
                        href={t.certificateUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary text-xs font-medium underline"
                      >
                        증명서
                      </a>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* 최근 30일 운행 list (DRIVER/HELPER만) */}
      {showOps ? (
        <Card>
          <CardHeader>
            <CardTitle>최근 30일 운행 기록</CardTitle>
            <CardDescription>
              {staff.role === "DRIVER"
                ? "운전 또는 동승한 운행"
                : "동승한 운행"}
              . 행 클릭 시 운행 상세로.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {trips.length === 0 ? (
              <p className="text-muted-foreground p-6 text-sm">
                30일 내 운행 기록이 없습니다.
              </p>
            ) : (
              <ul className="divide-y">
                {tripStatsList.map(({ trip: t, stats }) => {
                  const isDriver = t.driverId === id;
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/trip/${t.id}`}
                        className="hover:bg-muted/50 flex flex-wrap items-start justify-between gap-2 px-4 py-3 transition-colors"
                      >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                          <span
                            className={
                              t.route.direction === "PICKUP"
                                ? "bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                                : "bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide"
                            }
                          >
                            {DIRECTION_LABEL[t.route.direction]}
                          </span>
                          {!isDriver ? (
                            <span className="bg-info-soft text-info rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                              동승
                            </span>
                          ) : null}
                          <span className="text-sm font-extrabold tracking-tight">
                            {fmtDateKst(t.startedAt)}
                          </span>
                          <span className="text-muted-foreground text-xs font-medium">
                            {fmtTimeKst(t.startedAt)}~{fmtTimeKst(t.endedAt)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            · {t.route.name} · {t.vehicle.plate}
                          </span>
                          {!isDriver ? (
                            <span className="text-muted-foreground text-xs">
                              · 기사 {t.driver.name}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-muted-foreground shrink-0 font-mono text-[11px]">
                          {formatDuration(stats.durationSec)} ·{" "}
                          {stats.distanceKm.toFixed(2)}km ·{" "}
                          {stats.avgSpeedKmh}km/h
                          {t.events.length > 0 ? (
                            <>
                              {" "}
                              ·{" "}
                              <span className="text-destructive font-bold">
                                미탑승 {t.events.length}
                              </span>
                            </>
                          ) : null}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* 안전점검 미흡 (KIDS 운전 운행만) */}
      {showOps && staff.role === "DRIVER" ? (
        <Card>
          <CardHeader>
            <CardTitle>안전점검 미흡 운행</CardTitle>
            <CardDescription>
              KIDS 모드 운행 중 안전띠·하차 확인 미완료 건. 기사 책임.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {safetyFailTrips.length === 0 ? (
              <p className="text-muted-foreground p-6 text-sm">
                미흡 운행 없음.
              </p>
            ) : (
              <ul className="divide-y">
                {safetyFailTrips.map((t) => {
                  const items: string[] = [];
                  if (!t.safetyCheck?.seatbeltAllOk) items.push("안전띠 미확인");
                  if (!t.safetyCheck?.allAlightedOk) items.push("하차 미확인");
                  return (
                    <li key={t.id}>
                      <Link
                        href={`/dashboard/trip/${t.id}`}
                        className="hover:bg-muted/50 flex flex-wrap items-center justify-between gap-2 px-4 py-3 transition-colors"
                      >
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="bg-destructive/10 text-destructive rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                            {items.join(" · ")}
                          </span>
                          <span className="text-sm font-medium">
                            {fmtDateKst(t.startedAt)}
                          </span>
                          <span className="text-muted-foreground text-xs">
                            · {t.route.name} · {t.vehicle.plate}
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      ) : null}

      {/* OWNER 본인 진입 안내 */}
      {isOwner ? (
        <Card>
          <CardContent className="text-muted-foreground p-6 text-sm">
            학원장·원장 본인은 운행 기록이 없습니다. 분석은{" "}
            <Link
              href="/dashboard/analytics"
              className="text-primary font-medium underline"
            >
              분석 페이지
            </Link>
            에서 노선·기사별로 확인하세요.
          </CardContent>
        </Card>
      ) : null}
    </main>
  );
}
