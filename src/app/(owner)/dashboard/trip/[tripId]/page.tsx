import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Phone,
  ShieldCheck,
  User,
  X,
} from "lucide-react";

import { TripRealtimeRefresher } from "@/components/trip-realtime-refresher";
import { db } from "@/lib/db";
import { requireOwnerTripAccess } from "@/lib/auth/owner-trip-access";
import {
  computeStopArrivals,
  computeTripStats,
  type PingPoint,
} from "@/lib/geo/trip-stats";
import { TripLiveMap } from "@/lib/map/trip-live-map";
import type { TripLiveMapStop } from "@/lib/map/trip-live-map-inner";

import { OwnerTripLiveMap } from "./_components/owner-trip-live-map";
import { StopArrivalsTable } from "./_components/stop-arrivals-table";
import { TripNoShowBanner } from "./_components/trip-no-show-banner";
import { TripStatsCard } from "./_components/trip-stats-card";
import { TripStopsTimeline } from "./_components/trip-stops-timeline";
import { TripStudentTimeline } from "./_components/trip-student-timeline";

const DIRECTION_LABEL = { PICKUP: "등원", DROPOFF: "하원" } as const;

const ABSENCE_LABEL = {
  PENDING: "결석 (대기)",
  NOTIFIED_DRIVER: "결석 (전달됨)",
  ACKNOWLEDGED: "결석 (확인)",
  REJECTED: "결석 (반려)",
} as const;

function fmtKstHHmm(d: Date | null): string {
  if (!d) return "—";
  return new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
}

// W23+: 정류장 간 구간 소요 시간 — "1분 8초" / "45초" / "12분"
function fmtSegment(sec: number | null): string | null {
  if (sec == null || !Number.isFinite(sec) || sec < 0) return null;
  if (sec < 60) return `${Math.round(sec)}초`;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return s > 0 ? `${m}분 ${s}초` : `${m}분`;
}

function fmtElapsed(start: Date, end: Date | null): string {
  const ms = (end ?? new Date()).getTime() - start.getTime();
  const sec = Math.floor(ms / 1000);
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, "0");
  const s = (sec % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default async function OwnerTripDetailPage({
  params,
}: {
  params: Promise<{ tripId: string }>;
}) {
  const { tripId } = await params;
  await requireOwnerTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      route: {
        include: {
          stops: {
            orderBy: { order: "asc" },
            include: {
              stop: {
                select: { id: true, name: true, lat: true, lng: true },
              },
            },
          },
          students: {
            include: {
              student: { select: { id: true, name: true } },
              stop: { select: { id: true } },
            },
          },
        },
      },
      vehicle: { select: { plate: true, mode: true } },
      driver: { select: { id: true, name: true, phone: true } },
      helper: { select: { id: true, name: true, phone: true } },
      safetyCheck: true,
      events: {
        orderBy: { at: "asc" },
        select: {
          id: true,
          studentId: true,
          type: true,
          at: true,
          notes: true,
        },
      },
    },
  });

  if (!trip) notFound();

  // RouteStop별 학생 매핑
  const studentsByStop = new Map<string, { id: string; name: string }[]>();
  for (const rs of trip.route.stops) {
    studentsByStop.set(rs.stop.id, []);
  }
  for (const rs of trip.route.students) {
    const list = studentsByStop.get(rs.stop.id);
    if (list) list.push(rs.student);
  }

  // BoardingEvent를 student+type 키로 모음
  const boardedAt = new Map<string, Date>();
  const alightedAt = new Map<string, Date>();
  const issueByStudent = new Map<
    string,
    { type: "NO_SHOW" | "NO_DROPOFF"; reason: string | null; at: Date }
  >();
  for (const e of trip.events) {
    if (e.type === "BOARD") boardedAt.set(e.studentId, e.at);
    else if (e.type === "ALIGHT") alightedAt.set(e.studentId, e.at);
    else if (e.type === "NO_SHOW" || e.type === "NO_DROPOFF") {
      // 가장 최근 이슈 (asc 정렬이라 마지막 것)
      issueByStudent.set(e.studentId, {
        type: e.type,
        reason: e.notes,
        at: e.at,
      });
    }
  }
  const issueCount = issueByStudent.size;

  // 오늘 결석 학생
  const allStudentIds = trip.route.students.map((rs) => rs.student.id);
  const directionTypes =
    trip.route.direction === "PICKUP"
      ? ["ABSENT_BOTH", "ABSENT_PICKUP"]
      : ["ABSENT_BOTH", "ABSENT_DROPOFF"];
  const absences = await db.absenceRequest.findMany({
    where: {
      studentId: { in: allStudentIds },
      date: trip.date,
      type: {
        in: directionTypes as (
          | "ABSENT_BOTH"
          | "ABSENT_PICKUP"
          | "ABSENT_DROPOFF"
        )[],
      },
      status: { not: "REJECTED" },
    },
    select: { studentId: true, status: true, reason: true },
  });
  const absenceByStudent = new Map(
    absences.map(
      (a) => [a.studentId, { status: a.status, reason: a.reason }] as const,
    ),
  );

  const isRunning = trip.startedAt !== null && trip.endedAt === null;
  const isFinished = trip.endedAt !== null;
  const isScheduled = trip.startedAt === null;

  // GPS ping fetch — 진행 중·종료 모두. 운행 중에는 진입 전까지의 누적 경로를
  // 학원장이 즉시 보게 하고, 진입 후는 client에서 broadcast ping을 append (W19-B).
  // 예정 운행은 ping이 없으니 skip.
  // W19-D: trip 통계·정류장 도착 시각 계산용으로 source/speed/recordedAt 포함.
  const allPings =
    isRunning || isFinished
      ? await db.locationPing.findMany({
          where: { tripId },
          orderBy: { recordedAt: "asc" },
          select: {
            lat: true,
            lng: true,
            recordedAt: true,
            speed: true,
            source: true,
          },
        })
      : [];
  const trail = allPings.map((p) => ({ lat: p.lat, lng: p.lng }));

  // W19-D: 운행 통계 + 정류장 도착 시각.
  // 운행 시작 안 한 trip은 stats 카드 안 보여줌 (계산 의미 없음).
  const pingPoints: PingPoint[] = allPings.map((p) => ({
    lat: p.lat,
    lng: p.lng,
    recordedAt: p.recordedAt,
    speed: p.speed,
    source: p.source,
  }));
  const tripStats =
    !isScheduled && trip.startedAt
      ? computeTripStats(pingPoints, trip.startedAt, trip.endedAt)
      : null;
  const stopArrivals =
    !isScheduled && trip.startedAt
      ? computeStopArrivals(
          pingPoints,
          trip.route.stops.map((rs) => ({
            stopId: rs.stop.id,
            stopName: rs.stop.name,
            stopOrder: rs.order,
            lat: rs.stop.lat,
            lng: rs.stop.lng,
          })),
        )
      : [];

  // 정류장별 BoardingEvent 처리 건수 집계.
  // BoardingEvent에는 stopId 필드가 직접 없으니 학생 → 정류장 매핑으로 derive.
  const studentToStopId = new Map<string, string>();
  for (const rs of trip.route.students) {
    studentToStopId.set(rs.student.id, rs.stop.id);
  }
  const stopBoardCounts = new Map<string, number>();
  const stopNoShowCounts = new Map<string, number>();
  for (const e of trip.events) {
    const stopId = studentToStopId.get(e.studentId);
    if (!stopId) continue;
    if (e.type === "BOARD" || e.type === "ALIGHT") {
      stopBoardCounts.set(stopId, (stopBoardCounts.get(stopId) ?? 0) + 1);
    } else if (e.type === "NO_SHOW" || e.type === "NO_DROPOFF") {
      stopNoShowCounts.set(stopId, (stopNoShowCounts.get(stopId) ?? 0) + 1);
    }
  }
  const stopArrivalRows = stopArrivals.map((a) => ({
    ...a,
    boardCount: stopBoardCounts.get(a.stopId) ?? 0,
    noShowCount: stopNoShowCounts.get(a.stopId) ?? 0,
  }));
  // W23+: list inline 통합 — 정류장 row에서 stopId로 lookup해 통과 시각 표시.
  const stopArrivalMap = new Map(stopArrivals.map((a) => [a.stopId, a]));

  // W24-B C2: 신규 컴포넌트(TripStopsTimeline·TripStudentTimeline·TripNoShowBanner)용 데이터 prep.
  // 기존 매핑(studentToStopId·studentsByStop)은 그대로 재사용.
  const studentNameById = new Map<string, string>();
  for (const rs of trip.route.students) {
    studentNameById.set(rs.student.id, rs.student.name);
  }
  const stopNameById = new Map<string, string>();
  const stopScheduledById = new Map<string, string | null>();
  for (const rs of trip.route.stops) {
    stopNameById.set(rs.stop.id, rs.stop.name);
    stopScheduledById.set(rs.stop.id, rs.scheduledAt);
  }

  const noShowBannerItems = trip.events
    .filter((e) => e.type === "NO_SHOW" || e.type === "NO_DROPOFF")
    .map((e) => {
      const stopId = studentToStopId.get(e.studentId) ?? null;
      return {
        eventId: e.id,
        studentId: e.studentId,
        studentName: studentNameById.get(e.studentId) ?? "—",
        stopName: stopId ? (stopNameById.get(stopId) ?? null) : null,
        type: e.type as "NO_SHOW" | "NO_DROPOFF",
      };
    });

  const studentEventRows = trip.events.map((e) => {
    const stopId = studentToStopId.get(e.studentId) ?? null;
    return {
      eventId: e.id,
      type: e.type as "BOARD" | "ALIGHT" | "NO_SHOW" | "NO_DROPOFF",
      atISO: e.at.toISOString(),
      studentId: e.studentId,
      studentName: studentNameById.get(e.studentId) ?? "—",
      stopId,
      stopName: stopId ? (stopNameById.get(stopId) ?? null) : null,
      notes: e.notes,
    };
  });

  const stopTimelineRows = stopArrivalRows.map((r) => ({
    stopId: r.stopId,
    stopOrder: r.stopOrder,
    stopName: r.stopName,
    scheduledAt: stopScheduledById.get(r.stopId) ?? null,
    arrivedAt: r.arrivedAt,
    boardCount: r.boardCount,
    noShowCount: r.noShowCount,
  }));

  const eventType: "BOARD" | "ALIGHT" =
    trip.route.direction === "PICKUP" ? "BOARD" : "ALIGHT";
  const checkedMap = eventType === "BOARD" ? boardedAt : alightedAt;

  const totalStudents = trip.route.students.length;
  const absentCount = absences.filter((a) => a.status !== "REJECTED").length;
  const checkedCount = Array.from(checkedMap.keys()).filter((sid) =>
    allStudentIds.includes(sid),
  ).length;
  const remaining = totalStudents - absentCount - checkedCount - issueCount;

  // 라이브 지도용 stop 데이터 — 학원장은 child-stop 강조 없이 모든 정류장 동등.
  // isPassed: 그 정류장의 학생 1명이라도 처리됐으면 통과 처리(회색).
  const liveMapStops: TripLiveMapStop[] = trip.route.stops.map((rs) => {
    const stopStudents = studentsByStop.get(rs.stop.id) ?? [];
    const isPassed = stopStudents.some((st) => checkedMap.has(st.id));
    return {
      id: rs.id,
      stopId: rs.stop.id,
      name: rs.stop.name,
      lat: rs.stop.lat,
      lng: rs.stop.lng,
      order: rs.order,
      isChildStop: false,
      isPassed,
    };
  });

  return (
    <main className="mx-auto max-w-4xl space-y-4 px-4 py-6 lg:px-6">
      {/* 운행 중일 때만 실시간 자동 갱신 — 종료된 운행은 정적 */}
      {isRunning ? <TripRealtimeRefresher tripId={tripId} /> : null}

      {/* 뒤로가기 + 헤드 */}
      <div className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="bg-card hover:bg-muted/40 flex h-9 w-9 items-center justify-center rounded-full border shadow-sm transition-colors"
          aria-label="대시보드로"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <p className="text-muted-foreground text-xs font-extrabold tracking-wide uppercase">
          운행 상세 (모니터)
        </p>
      </div>

      {/* 운행 헤드 카드 */}
      <section
        className={
          isRunning
            ? "relative overflow-hidden rounded-lg p-5 text-white shadow-md"
            : "bg-card rounded-lg border p-5 shadow-sm"
        }
        style={
          isRunning
            ? {
                background: "linear-gradient(155deg, #1a1c22, #0f1014)",
              }
            : undefined
        }
      >
        {isRunning ? (
          <div className="bg-bus absolute inset-x-0 top-0 h-[3px]" />
        ) : null}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              {isRunning ? (
                <span className="bg-bus text-bus-foreground inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                  <span className="bg-bus-foreground inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                  진행 중
                </span>
              ) : isFinished ? (
                <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                  완료
                </span>
              ) : (
                <span className="bg-muted text-muted-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                  예정
                </span>
              )}
              <span
                className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase ${
                  trip.route.direction === "PICKUP"
                    ? "bg-success-soft text-success"
                    : "bg-info-soft text-info"
                }`}
              >
                {DIRECTION_LABEL[trip.route.direction]}
              </span>
              {trip.vehicle.mode === "KIDS" ? (
                isRunning ? (
                  <span className="rounded-md bg-white/15 px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                    어린이용
                  </span>
                ) : (
                  <span className="bg-bus text-bus-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                    어린이용
                  </span>
                )
              ) : null}
            </div>
            <h2 className="mt-1.5 truncate text-xl font-extrabold tracking-tight">
              {trip.route.name}
            </h2>
            <p
              className={
                isRunning
                  ? "mt-0.5 text-xs font-medium opacity-70"
                  : "text-muted-foreground mt-0.5 text-xs font-medium"
              }
            >
              {trip.driver.name} · {trip.vehicle.plate}
              {trip.helper ? ` · 동승 ${trip.helper.name}` : ""}
            </p>
          </div>
          {trip.startedAt ? (
            <div className="text-right">
              <p
                className={
                  isRunning
                    ? "text-[10px] font-extrabold tracking-wide uppercase opacity-60"
                    : "text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase"
                }
              >
                {isRunning ? "경과" : "운행 시간"}
              </p>
              <p className="font-mono text-2xl font-extrabold tracking-tight">
                {fmtElapsed(trip.startedAt, trip.endedAt)}
              </p>
              <p
                className={
                  isRunning
                    ? "mt-0.5 text-[10px] font-medium opacity-60"
                    : "text-muted-foreground mt-0.5 text-[10px] font-medium"
                }
              >
                {fmtKstHHmm(trip.startedAt)} 시작
                {trip.endedAt ? ` · ${fmtKstHHmm(trip.endedAt)} 종료` : ""}
              </p>
            </div>
          ) : null}
        </div>

        {/* 진행 통계 */}
        {!isScheduled ? (
          <div
            className={
              isRunning
                ? "mt-4 grid grid-cols-3 gap-2 text-[11px] font-medium"
                : "mt-4 grid grid-cols-3 gap-2 text-[11px] font-medium"
            }
          >
            <div
              className={
                isRunning
                  ? "rounded-md bg-white/10 p-2"
                  : "bg-muted/40 rounded-md p-2"
              }
            >
              <p
                className={
                  isRunning
                    ? "font-extrabold tracking-wide uppercase opacity-60"
                    : "text-muted-foreground font-extrabold tracking-wide uppercase"
                }
              >
                탑승·하차
              </p>
              <p className="font-mono text-base font-extrabold">
                {checkedCount}/{totalStudents - absentCount}
              </p>
            </div>
            <div
              className={
                isRunning
                  ? "rounded-md bg-white/10 p-2"
                  : "bg-muted/40 rounded-md p-2"
              }
            >
              <p
                className={
                  isRunning
                    ? "font-extrabold tracking-wide uppercase opacity-60"
                    : "text-muted-foreground font-extrabold tracking-wide uppercase"
                }
              >
                결석
              </p>
              <p className="font-mono text-base font-extrabold">
                {absentCount}
              </p>
            </div>
            <div
              className={
                isRunning
                  ? "rounded-md bg-white/10 p-2"
                  : "bg-muted/40 rounded-md p-2"
              }
            >
              <p
                className={
                  isRunning
                    ? "font-extrabold tracking-wide uppercase opacity-60"
                    : "text-muted-foreground font-extrabold tracking-wide uppercase"
                }
              >
                남은 인원
              </p>
              <p className="font-mono text-base font-extrabold">
                {Math.max(0, remaining)}
              </p>
            </div>
          </div>
        ) : null}
      </section>

      {/* 라이브 GPS 지도 (운행 중일 때만) */}
      {isRunning ? (
        <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold tracking-tight">
                실시간 위치
              </h3>
              <span className="bg-bus-soft text-bus inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide">
                <span className="bg-bus inline-block h-1.5 w-1.5 animate-pulse rounded-full" />
                운행 중
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
              기사 폰 위치 · 약 5초마다 갱신
            </p>
          </div>
          <OwnerTripLiveMap
            tripId={tripId}
            stops={liveMapStops}
            direction={trip.route.direction}
            initialTrail={trail}
          />
        </section>
      ) : null}

      {/* W24-B C2: 미탑승·미하차 빨간 배너 — 좌측 destructive stripe + 학생 chip + 보호자 연락 */}
      {noShowBannerItems.length > 0 ? (
        <TripNoShowBanner noShows={noShowBannerItems} />
      ) : null}

      {/* W19-D: 운행 통계 카드 (운행 중·종료 모두) */}
      {tripStats ? (
        <TripStatsCard stats={tripStats} isRunning={isRunning} />
      ) : null}

      {/* W24-B C2: 정류장 진행 timeline — done/next/pending dot + 수직 연결선 */}
      {stopTimelineRows.length > 0 ? (
        <TripStopsTimeline rows={stopTimelineRows} />
      ) : null}

      {/* W19-D: 정류장 도착 시각 + 구간 소요 표 (STOP_PASS 기록 있을 때만) */}
      {stopArrivalRows.some((r) => r.arrivedAt !== null) ? (
        <StopArrivalsTable rows={stopArrivalRows} />
      ) : null}

      {/* W24-B C2: 학생 처리 이벤트 timeline (탭 — 전체/처리/미처리) */}
      {studentEventRows.length > 0 ? (
        <TripStudentTimeline events={studentEventRows} />
      ) : null}

      {/* 종료된 운행: GPS 경로 재생 (LocationPing trail) */}
      {isFinished && trail.length > 0 ? (
        <section className="bg-card overflow-hidden rounded-lg border shadow-sm">
          <div className="border-b px-4 py-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-extrabold tracking-tight">
                운행 경로
              </h3>
              <span className="bg-success-soft text-success rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide uppercase">
                완료 ({trail.length}개 좌표)
              </span>
            </div>
            <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
              실주행 경로 — 안전운행기록 면책 자료. 30초 간격 + 정류장 통과 시점
              + 시작·종료 ping.
            </p>
          </div>
          <TripLiveMap
            stops={liveMapStops}
            shuttle={null}
            direction={trip.route.direction}
            height="48vh"
            showCaption
            showStopLabels
            trail={trail}
          />
        </section>
      ) : null}

      {/* 운행자 정보 */}
      <section className="bg-card rounded-lg border p-4 shadow-sm">
        <h3 className="text-sm font-extrabold tracking-tight">운행자</h3>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <StaffRow
            tone="success"
            label="기사"
            name={trip.driver.name}
            phone={trip.driver.phone}
            Icon={User}
            analyticsHref={`/dashboard/analytics/drivers/${trip.driver.id}?range=30d`}
          />
          {trip.helper ? (
            <StaffRow
              tone="info"
              label="동승보호자"
              name={trip.helper.name}
              phone={trip.helper.phone}
              Icon={ShieldCheck}
            />
          ) : trip.vehicle.mode === "KIDS" ? (
            <div className="border-warning/30 bg-warning-soft/40 rounded-md border p-3">
              <p className="text-warning inline-flex items-center gap-1.5 text-xs font-extrabold">
                <AlertTriangle className="h-3.5 w-3.5" />
                동승보호자 미지정
              </p>
              <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
                어린이용 차량은 동승보호자 의무 (어린이통학버스 안전운행).
              </p>
            </div>
          ) : null}
        </div>
      </section>

      {/* 안전점검 (어린이용 모드만) */}
      {trip.vehicle.mode === "KIDS" ? (
        <section className="border-warning/30 bg-warning-soft/40 rounded-lg border p-4">
          <h3 className="text-sm font-extrabold tracking-tight">
            안전점검 (어린이용)
          </h3>
          <ul className="mt-2 space-y-1 text-sm font-medium">
            <SafetyRow
              label="좌석 안전띠 전원 확인"
              ok={trip.safetyCheck?.seatbeltAllOk ?? false}
            />
            <SafetyRow
              label="동승보호자 동승 확인"
              ok={trip.safetyCheck?.helperPresent ?? false}
            />
            <SafetyRow
              label="전원 하차 확인"
              ok={trip.safetyCheck?.allAlightedOk ?? false}
            />
          </ul>
        </section>
      ) : null}

      {/* 미탑승·미하차 경고 배너 */}
      {issueCount > 0 ? (
        <section className="border-destructive bg-destructive/10 rounded-lg border-2 p-4 shadow-sm">
          <div className="flex items-start gap-2">
            <span className="bg-destructive text-destructive-foreground mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full">
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-destructive text-sm font-extrabold tracking-tight">
                미탑승·미하차 {issueCount}건 발생
              </h3>
              <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                기사가 보고한 즉시 학부모에 푸시가 갔습니다. 정류장별 상세는
                아래 timeline에서 확인.
              </p>
            </div>
          </div>
        </section>
      ) : null}

      {/* 정류장 timeline */}
      <section className="bg-card rounded-lg border p-4 shadow-sm">
        <h3 className="text-sm font-extrabold tracking-tight">
          정류장·{eventType === "BOARD" ? "탑승" : "하차"} 진행
        </h3>
        <p className="text-muted-foreground mt-0.5 text-xs font-medium">
          정류장별 학생 처리 상태. {totalStudents}명 중 {checkedCount}명 처리,
          결석 {absentCount}명{issueCount > 0 ? `, 이슈 ${issueCount}건` : ""}.
        </p>
        <ol className="mt-3 space-y-3">
          {trip.route.stops.map((rs) => {
            const stopStudents = studentsByStop.get(rs.stop.id) ?? [];
            // W23+: STOP_PASS ping 기반 통과 여부·시각·구간 소요 inline 표시
            const arrival = stopArrivalMap.get(rs.stop.id);
            const passed = arrival?.arrivedAt != null;
            const segmentLabel = fmtSegment(arrival?.segmentSec ?? null);
            return (
              <li
                key={rs.id}
                className={`${passed ? "border-l-success" : "border-l-muted"} border-l-2 pl-4`}
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full font-mono text-[11px] font-extrabold ${
                      passed
                        ? "bg-success text-success-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {rs.order}
                  </span>
                  <p className="flex-1 truncate text-sm font-extrabold">
                    {rs.stop.name}
                  </p>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-muted-foreground inline-flex items-center gap-1 font-mono text-xs font-medium">
                      <Clock className="h-3 w-3" />
                      {rs.scheduledAt}
                    </span>
                    {arrival?.arrivedAt ? (
                      <span className="text-success inline-flex items-center gap-1 font-mono text-[11px] font-bold whitespace-nowrap">
                        통과 {fmtKstHHmm(arrival.arrivedAt)}
                        {segmentLabel ? (
                          <span className="text-muted-foreground font-medium">
                            · {segmentLabel}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </div>
                </div>
                {stopStudents.length > 0 ? (
                  <ul className="mt-2 space-y-1">
                    {stopStudents.map((st) => {
                      const iss = issueByStudent.get(st.id);
                      const ab = absenceByStudent.get(st.id);
                      const at = checkedMap.get(st.id);
                      const checked = !!at;

                      // 우선순위: ISSUE → ABSENCE → BOARD/ALIGHT
                      if (iss) {
                        return (
                          <li
                            key={st.id}
                            className="border-destructive bg-destructive/10 flex items-start gap-2 rounded-lg border-2 px-2.5 py-1.5 text-sm"
                          >
                            <AlertTriangle className="text-destructive mt-0.5 h-3.5 w-3.5 shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="text-destructive flex items-center gap-1.5 font-extrabold">
                                <Link
                                  href={`/students/${st.id}`}
                                  className="hover:underline"
                                >
                                  {st.name}
                                </Link>
                                <span className="bg-destructive text-destructive-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide whitespace-nowrap">
                                  {iss.type === "NO_SHOW" ? "미탑승" : "미하차"}
                                </span>
                              </p>
                              {iss.reason ? (
                                <p className="text-muted-foreground mt-0.5 text-[11px] font-medium">
                                  사유: {iss.reason}
                                </p>
                              ) : null}
                            </div>
                            <span className="text-muted-foreground font-mono text-[11px] font-medium whitespace-nowrap">
                              {fmtKstHHmm(iss.at)}
                            </span>
                          </li>
                        );
                      }
                      if (ab) {
                        return (
                          <li
                            key={st.id}
                            className="border-warning/30 bg-warning-soft/30 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                          >
                            <Calendar className="text-warning h-3.5 w-3.5 shrink-0" />
                            <Link
                              href={`/students/${st.id}`}
                              className="hover:text-primary flex-1 truncate font-bold hover:underline"
                            >
                              {st.name}
                            </Link>
                            <span className="bg-warning text-warning-foreground rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wide whitespace-nowrap">
                              {ABSENCE_LABEL[ab.status]}
                            </span>
                          </li>
                        );
                      }
                      return (
                        <li
                          key={st.id}
                          className={
                            checked
                              ? "border-success/30 bg-success-soft/30 flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                              : "border-input bg-background flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm"
                          }
                        >
                          {checked ? (
                            <Check className="text-success h-3.5 w-3.5 shrink-0" />
                          ) : (
                            <span className="border-muted-foreground/40 inline-block h-3 w-3 shrink-0 rounded-full border" />
                          )}
                          <Link
                            href={`/students/${st.id}`}
                            className={
                              checked
                                ? "text-success hover:text-primary flex-1 truncate font-extrabold hover:underline"
                                : "hover:text-primary flex-1 truncate font-bold hover:underline"
                            }
                          >
                            {st.name}
                          </Link>
                          {checked && at ? (
                            <span className="text-muted-foreground font-mono text-[11px] font-medium whitespace-nowrap">
                              {fmtKstHHmm(at)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-[11px] font-medium whitespace-nowrap">
                              {eventType === "BOARD"
                                ? "탑승 대기"
                                : "하차 대기"}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="text-muted-foreground mt-1 text-[11px] font-medium">
                    배정된 학생 없음
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <p className="text-muted-foreground text-center text-[11px] font-medium">
        {isRunning
          ? "실시간 자동 갱신됨 — 기사·동승자 액션이 반영되면 자동으로 다시 그립니다."
          : "운행이 종료되었습니다. 변동 발생 시 새로고침해 주세요."}
      </p>
    </main>
  );
}

function StaffRow({
  tone,
  label,
  name,
  phone,
  Icon,
  analyticsHref,
}: {
  tone: "success" | "info";
  label: string;
  name: string;
  phone: string | null;
  Icon: React.ComponentType<{ className?: string }>;
  /** W20-A2: 기사일 때 그 기사의 분석 페이지로 이름 클릭 시 이동. */
  analyticsHref?: string;
}) {
  const cls =
    tone === "success"
      ? "bg-success-soft text-success"
      : "bg-info-soft text-info";
  return (
    <div className="bg-background flex items-center gap-3 rounded-md border p-3">
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${cls}`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
          {label}
        </p>
        {analyticsHref ? (
          <Link
            href={analyticsHref}
            className="hover:text-primary block truncate text-sm font-extrabold hover:underline"
          >
            {name}
          </Link>
        ) : (
          <p className="truncate text-sm font-extrabold">{name}</p>
        )}
      </div>
      {phone ? (
        <a
          href={`tel:${phone}`}
          className="text-muted-foreground hover:text-primary inline-flex items-center gap-1 text-xs font-medium"
        >
          <Phone className="h-3.5 w-3.5" />
          {phone}
        </a>
      ) : null}
    </div>
  );
}

function SafetyRow({ label, ok }: { label: string; ok: boolean }) {
  return (
    <li className="flex items-center gap-2">
      {ok ? (
        <Check className="text-success h-4 w-4 shrink-0" />
      ) : (
        <X className="text-destructive h-4 w-4 shrink-0" />
      )}
      <span className={ok ? "font-bold" : "text-muted-foreground font-bold"}>
        {label}
      </span>
    </li>
  );
}
