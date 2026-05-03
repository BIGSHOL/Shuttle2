import { notFound } from "next/navigation";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        select: { id: true, studentId: true, type: true, at: true },
      },
      driver: { select: { id: true, name: true } },
      helper: { select: { id: true, name: true } },
    },
  });

  if (!trip) notFound();

  // 종료된 trip이면 요약 카드만
  if (trip.endedAt) {
    const sc = trip.safetyCheck;
    return (
      <main className="mx-auto max-w-3xl p-4">
        <Card>
          <CardHeader>
            <CardTitle>운행 종료</CardTitle>
            <CardDescription>
              <span className="font-medium">{trip.route.name}</span> 운행이
              종료되었습니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              시작:{" "}
              <span className="font-mono">
                {trip.startedAt?.toISOString().slice(11, 16) ?? "—"}
              </span>
            </p>
            <p>
              종료:{" "}
              <span className="font-mono">
                {trip.endedAt.toISOString().slice(11, 16)}
              </span>
            </p>
            <p>
              탑승·하차 이벤트:{" "}
              <span className="font-mono">{trip.events.length}건</span>
            </p>
            {trip.vehicle.mode === "KIDS" && sc ? (
              <p>
                안전점검: 안전띠 {sc.seatbeltAllOk ? "✓" : "✗"} · 동승{" "}
                {sc.helperPresent ? "✓" : "✗"} · 전원하차{" "}
                {sc.allAlightedOk ? "✓" : "✗"}
              </p>
            ) : null}
          </CardContent>
        </Card>
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
  for (const e of trip.events) {
    if (e.type === "BOARD") boardedSet.add(e.studentId);
    else alightedSet.add(e.studentId);
  }

  // 오늘 결석 학생 (route.direction 영향 받는 type만 — 등원 노선이면
  // ABSENT_BOTH/ABSENT_PICKUP, 하원 노선이면 ABSENT_BOTH/ABSENT_DROPOFF)
  const allStudentIds = trip.route.students.map((rs) => rs.student.id);
  const directionTypes =
    trip.route.direction === "PICKUP"
      ? ["ABSENT_BOTH", "ABSENT_PICKUP"]
      : ["ABSENT_BOTH", "ABSENT_DROPOFF"];
  const absences = await db.absenceRequest.findMany({
    where: {
      studentId: { in: allStudentIds },
      date: trip.date,
      type: { in: directionTypes as ("ABSENT_BOTH" | "ABSENT_PICKUP" | "ABSENT_DROPOFF")[] },
    },
    select: { studentId: true, status: true, reason: true },
  });
  const absenceByStudent = new Map(
    absences.map((a) => [a.studentId, { status: a.status, reason: a.reason }] as const),
  );

  return (
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
          return {
            ...s,
            absence: ab
              ? { status: ab.status, reason: ab.reason }
              : null,
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
  );
}
