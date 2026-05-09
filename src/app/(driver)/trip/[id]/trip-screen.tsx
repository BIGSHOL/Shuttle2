import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, X } from "lucide-react";

import { TripRealtimeRefresher } from "@/components/trip-realtime-refresher";
import { db } from "@/lib/db";
import { requireTripAccess } from "@/lib/auth/trip-access";
import {
  computeStopArrivals,
  computeTripStats,
  formatKstHHmm,
} from "@/lib/geo/trip-stats";

import { StopArrivalsTable } from "@/app/(owner)/dashboard/trip/[tripId]/_components/stop-arrivals-table";
import { TripStatsCard } from "@/app/(owner)/dashboard/trip/[tripId]/_components/trip-stats-card";

import { ArrivedBanner } from "./_components/arrived-banner";
import {
  StudentResultsCard,
  type StopResultGroup,
  type StudentResultStatus,
} from "./_components/student-results-card";
import { TripRunningView } from "./trip-running-view";

// driver와 helper 양쪽 trip page에서 공유.
// (driver)/trip/[id]/page.tsx와 (helper)/trip/[id]/page.tsx가 둘 다 이걸 호출.
export async function TripScreen({
  tripId,
  backHref = "/run",
}: {
  tripId: string;
  // 헤더 좌측 ← 버튼 목적지. driver는 /run, helper는 /helper-run.
  backHref?: string;
}) {
  const access = await requireTripAccess(tripId);

  const trip = await db.trip.findUnique({
    where: { id: tripId },
    include: {
      route: {
        include: {
          stops: {
            orderBy: { order: "asc" },
            include: {
              stop: {
                select: {
                  id: true,
                  name: true,
                  lat: true,
                  lng: true,
                  radiusM: true,
                },
                // 정류장에 배정된 학생들 (RouteStudent → Student) — 같은 노선 기준
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
      safetyCheck: true,
      events: {
        orderBy: { at: "desc" },
        select: {
          id: true,
          studentId: true,
          type: true,
          at: true,
          notes: true,
        },
      },
      driver: { select: { id: true, name: true } },
      helper: { select: { id: true, name: true } },
    },
  });

  if (!trip) notFound();

  // ── 공유 데이터 prep (운행 중 + 종료 양쪽에서 사용) ─────────────────────────
  // LocationPing 전체 (computeTripStats: INTERVAL/START/END/STOP_PASS 모두,
  // computeStopArrivals: STOP_PASS만 필터해 사용).
  const allPings = await db.locationPing.findMany({
    where: { tripId },
    orderBy: { recordedAt: "asc" },
    select: {
      lat: true,
      lng: true,
      recordedAt: true,
      speed: true,
      source: true,
    },
  });
  const stopPassPings = allPings.filter((p) => p.source === "STOP_PASS");

  const stopArrivals = computeStopArrivals(
    stopPassPings,
    trip.route.stops.map((rs) => ({
      stopId: rs.stop.id,
      stopName: rs.stop.name,
      stopOrder: rs.order,
      lat: rs.stop.lat,
      lng: rs.stop.lng,
    })),
  );
  const arrivedAtByStopId = new Map(
    stopArrivals.map((a) => [a.stopId, a.arrivedAt] as const),
  );
  const segmentSecByStopId = new Map(
    stopArrivals.map((a) => [a.stopId, a.segmentSec] as const),
  );

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
  const boardedSet = new Set<string>();
  const alightedSet = new Set<string>();
  const issueByStudent = new Map<
    string,
    { type: "NO_SHOW" | "NO_DROPOFF"; reason: string | null }
  >();
  // events는 at desc 정렬 — 가장 최근 이슈만 살아남음
  for (const e of trip.events) {
    if (e.type === "BOARD") boardedSet.add(e.studentId);
    else if (e.type === "ALIGHT") alightedSet.add(e.studentId);
    else if (e.type === "NO_SHOW" || e.type === "NO_DROPOFF") {
      if (!issueByStudent.has(e.studentId)) {
        issueByStudent.set(e.studentId, {
          type: e.type,
          reason: e.notes,
        });
      }
    }
  }

  // 학생 → 정류장 역매핑 (StopArrivalsTable의 boardCount/noShowCount 집계용)
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

  // 오늘 결석 학생 (route.direction 영향 받는 type만 — 등원 노선이면
  // ABSENT_BOTH/ABSENT_PICKUP, 하원 노선이면 ABSENT_BOTH/ABSENT_DROPOFF)
  const allStudentIds = trip.route.students.map((rs) => rs.student.id);
  const directionTypes =
    trip.route.direction === "PICKUP"
      ? ["ABSENT_BOTH", "ABSENT_PICKUP"]
      : ["ABSENT_BOTH", "ABSENT_DROPOFF"];
  // REJECTED는 driver에 안 보이게 (반려된 결석은 의미상 결석 아님)
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

  // ── 종료 trip이면 4개 카드 (운행 통계·정류장 도착·학생 결과·안전점검) ────
  if (trip.endedAt) {
    const sc = trip.safetyCheck;

    const tripStats = trip.startedAt
      ? computeTripStats(allPings, trip.startedAt, trip.endedAt)
      : null;

    const stopArrivalRows = stopArrivals.map((a) => ({
      ...a,
      boardCount: stopBoardCounts.get(a.stopId) ?? 0,
      noShowCount: stopNoShowCounts.get(a.stopId) ?? 0,
    }));

    const stopGroups: StopResultGroup[] = trip.route.stops.map((rs) => {
      const students = (studentsByStop.get(rs.stop.id) ?? []).map((s) => {
        let status: StudentResultStatus = "NONE";
        let reason: string | null = null;
        const issue = issueByStudent.get(s.id);
        const absence = absenceByStudent.get(s.id);
        if (issue) {
          status = issue.type;
          reason = issue.reason;
        } else if (boardedSet.has(s.id)) {
          status = "BOARDED";
        } else if (alightedSet.has(s.id)) {
          status = "ALIGHTED";
        } else if (absence) {
          status = "ABSENT";
          reason = absence.reason;
        }
        return {
          studentId: s.id,
          studentName: s.name,
          status,
          reason,
        };
      });
      return {
        stopId: rs.stop.id,
        stopOrder: rs.order,
        stopName: rs.stop.name,
        students,
      };
    });

    const hasArrivals = stopArrivalRows.some((r) => r.arrivedAt !== null);

    // refac 03 frame: arrived-banner(녹색 그라디언트 + 통계) + 안전점검 결과
    const finalStop = trip.route.stops[trip.route.stops.length - 1];
    const elapsedMin = trip.startedAt
      ? Math.max(
          0,
          Math.floor(
            (trip.endedAt.getTime() - trip.startedAt.getTime()) / 60000,
          ),
        )
      : 0;
    const alightedCount = boardedSet.size + alightedSet.size;
    return (
      <main className="bg-background flex min-h-[100dvh] flex-col pb-6">
        {/* 작은 백 헤더 — refac에는 없지만 운행 목록 복귀 필요 */}
        <header className="border-border flex items-center gap-2 border-b px-4 py-3">
          <Link
            href={backHref}
            className="bg-card border-border text-foreground grid h-[38px] w-[38px] place-items-center rounded-[12px] border"
            aria-label="운행 목록으로"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="text-muted-foreground truncate text-[11px] font-extrabold uppercase tracking-[0.04em]">
              {trip.route.name} · 운행 종료
            </p>
            <p className="truncate text-[16px] font-black tracking-[-0.015em]">
              {trip.startedAt ? formatKstHHmm(trip.startedAt) : "—"} ~{" "}
              {formatKstHHmm(trip.endedAt)} · {trip.events.length}건
            </p>
          </div>
        </header>

        {/* refac .arrived-banner: 녹색 그라디언트 + 54px check + h2 + p + 3-stat */}
        <ArrivedBanner
          alightedCount={alightedCount}
          elapsedMinutes={elapsedMin}
          distanceKm={tripStats?.distanceKm ?? 0}
          finalStopName={finalStop?.stop.name ?? "도착"}
          endedHHmm={formatKstHHmm(trip.endedAt)}
        />

        {/* refac .final-checks h3 + check-item list — 안전점검 결과(read-only) */}
        {trip.vehicle.mode === "KIDS" && sc ? (
          <section className="px-[18px]">
            <h3 className="text-muted-foreground mb-2 ml-1 text-[13px] font-black uppercase tracking-[0.06em]">
              안전점검 결과 — {[sc.seatbeltAllOk, sc.helperPresent, sc.allAlightedOk].filter(Boolean).length} / 3
            </h3>
            <FinalCheck label="좌석 안전띠 전원 확인" ok={sc.seatbeltAllOk} />
            <FinalCheck label="동승보호자 동승 확인" ok={sc.helperPresent} />
            <FinalCheck label="전원 하차 확인" ok={sc.allAlightedOk} />
          </section>
        ) : null}

        {/* 본문 추가 정보 (학원장 컴포넌트 재사용) */}
        <div className="mt-4 space-y-4 px-4">
          {tripStats ? (
            <TripStatsCard stats={tripStats} isRunning={false} />
          ) : null}
          {hasArrivals ? <StopArrivalsTable rows={stopArrivalRows} /> : null}
          <StudentResultsCard
            stops={stopGroups}
            direction={trip.route.direction}
          />
        </div>
      </main>
    );
  }

  // ── 운행 중 ─────────────────────────────────────────────────────────────
  const helperCandidates = access.isDriver
    ? await db.staff.findMany({
        where: { orgId: access.user.org.id, role: "HELPER" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

  return (
    <>
      {/* W17-D: 기사·동승자 본인 외의 액션(safety toggle, helper 배정 등)도
          즉시 반영. 본인 액션도 publish하지만 router.refresh가 사실상 no-op. */}
      <TripRealtimeRefresher tripId={trip.id} />
      <TripRunningView
        tripId={trip.id}
        backHref={backHref}
        route={{ name: trip.route.name, direction: trip.route.direction }}
        vehicle={trip.vehicle}
        stops={trip.route.stops.map((rs) => ({
          id: rs.id,
          order: rs.order,
          scheduledAt: rs.scheduledAt,
          name: rs.stop.name,
          lat: rs.stop.lat,
          lng: rs.stop.lng,
          radiusM: rs.stop.radiusM,
          arrivedAtISO:
            arrivedAtByStopId.get(rs.stop.id)?.toISOString() ?? null,
          segmentSec: segmentSecByStopId.get(rs.stop.id) ?? null,
          students: (studentsByStop.get(rs.stop.id) ?? []).map((s) => {
            const ab = absenceByStudent.get(s.id);
            const iss = issueByStudent.get(s.id);
            return {
              ...s,
              absence: ab ? { status: ab.status, reason: ab.reason } : null,
              issue: iss ? { type: iss.type, reason: iss.reason } : null,
            };
          }),
        }))}
        isKidsMode={trip.vehicle.mode === "KIDS"}
        startedAtISO={trip.startedAt?.toISOString() ?? null}
        safetyCheck={
          trip.safetyCheck
            ? {
                seatbeltAllOk: trip.safetyCheck.seatbeltAllOk,
                helperPresent: trip.safetyCheck.helperPresent,
                allAlightedOk: trip.safetyCheck.allAlightedOk,
              }
            : null
        }
        boardedStudentIds={Array.from(boardedSet)}
        alightedStudentIds={Array.from(alightedSet)}
        driver={trip.driver}
        helper={trip.helper}
        helperCandidates={helperCandidates}
        isDriver={access.isDriver}
        isHelper={access.isHelper}
      />
    </>
  );
}

// refac .check-item.done 스타일 — 운행 종료 후 안전점검 결과 read-only.
function FinalCheck({ label, ok }: { label: string; ok: boolean }) {
  return (
    <div
      className={`mb-2 flex items-center gap-[12px] rounded-[14px] border p-[14px] ${
        ok ? "bg-muted border-transparent" : "bg-destructive-soft border-destructive/40"
      }`}
    >
      <span
        className={`grid h-[26px] w-[26px] shrink-0 place-items-center rounded-[8px] border-2 ${
          ok ? "bg-success border-success" : "border-destructive bg-transparent"
        }`}
      >
        {ok ? (
          <Check className="h-4 w-4 text-white" strokeWidth={3.5} />
        ) : (
          <X className="text-destructive h-4 w-4" strokeWidth={3} />
        )}
      </span>
      <span
        className={`text-[15px] font-extrabold tracking-[-0.01em] ${
          ok ? "text-muted-foreground" : "text-destructive"
        }`}
      >
        {label}
      </span>
    </div>
  );
}
