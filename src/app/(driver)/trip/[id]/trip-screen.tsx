import { notFound } from "next/navigation";
import { Check } from "lucide-react";

import { TripRealtimeRefresher } from "@/components/trip-realtime-refresher";
import { db } from "@/lib/db";
import { requireTripAccess } from "@/lib/auth/trip-access";

import { TripRunningView } from "./trip-running-view";

// driver와 helper 양쪽 trip page에서 공유.
// (driver)/trip/[id]/page.tsx와 (helper)/trip/[id]/page.tsx가 둘 다 이걸 호출.
export async function TripScreen({ tripId }: { tripId: string }) {
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

  // 종료된 trip이면 요약 카드만
  if (trip.endedAt) {
    const sc = trip.safetyCheck;
    // KST = UTC + 9. ISO slice(11,16) = UTC HH:MM. KST 변환:
    const fmtKstHHmm = (d: Date) =>
      new Date(d.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(11, 16);
    return (
      <main className="space-y-4 px-4 pt-4 pb-6">
        <div className="bg-card rounded-lg border p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="bg-success-soft text-success flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
              <Check className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight">
                운행 종료
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs font-medium">
                {trip.route.name}
              </p>
            </div>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                시작
              </dt>
              <dd className="mt-0.5 font-mono text-base font-extrabold">
                {trip.startedAt ? fmtKstHHmm(trip.startedAt) : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                종료
              </dt>
              <dd className="mt-0.5 font-mono text-base font-extrabold">
                {fmtKstHHmm(trip.endedAt)}
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-muted-foreground text-[10px] font-extrabold tracking-wide uppercase">
                탑승·하차 이벤트
              </dt>
              <dd className="mt-0.5 font-mono text-base font-extrabold">
                {trip.events.length}건
              </dd>
            </div>
          </dl>
          {trip.vehicle.mode === "KIDS" && sc ? (
            <div className="border-warning/30 bg-warning-soft/40 mt-4 rounded-md border p-3 text-xs font-medium">
              <p className="text-foreground/80 mb-1.5 text-[10px] font-extrabold tracking-wide">
                안전점검 (어린이용)
              </p>
              <ul className="space-y-1">
                <li className="flex items-center gap-2">
                  {sc.seatbeltAllOk ? (
                    <Check className="text-success h-3.5 w-3.5" />
                  ) : (
                    <span className="text-destructive">✗</span>
                  )}
                  좌석 안전띠
                </li>
                <li className="flex items-center gap-2">
                  {sc.helperPresent ? (
                    <Check className="text-success h-3.5 w-3.5" />
                  ) : (
                    <span className="text-destructive">✗</span>
                  )}
                  동승보호자
                </li>
                <li className="flex items-center gap-2">
                  {sc.allAlightedOk ? (
                    <Check className="text-success h-3.5 w-3.5" />
                  ) : (
                    <span className="text-destructive">✗</span>
                  )}
                  전원 하차
                </li>
              </ul>
            </div>
          ) : null}
        </div>
      </main>
    );
  }

  // helper 후보 — driver만 picker 사용. 같은 org의 HELPER role staff.
  const helperCandidates = access.isDriver
    ? await db.staff.findMany({
        where: { orgId: access.user.org.id, role: "HELPER" },
        orderBy: { name: "asc" },
        select: { id: true, name: true },
      })
    : [];

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

  return (
    <>
      {/* W17-D: 기사·동승자 본인 외의 액션(safety toggle, helper 배정 등)도
          즉시 반영. 본인 액션도 publish하지만 router.refresh가 사실상 no-op. */}
      <TripRealtimeRefresher tripId={trip.id} />
      <TripRunningView
        tripId={trip.id}
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
