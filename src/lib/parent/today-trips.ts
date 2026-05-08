import { db } from "@/lib/db";
import { todayBitKst, todayUtcDateKst } from "@/lib/date/today";

// 학부모 /home·/trip-live에서 쓰는 자녀별 오늘 운행 카드.
// 한 자녀가 등원·하원 두 노선에 배정되면 cards 2개 (각 노선당 1개).
//
// 날짜는 KST 기준 오늘. driver측 trip.date도 KST 자정으로 저장돼 비교 키 일치.
// trip 레코드는 driver가 운행 시작 버튼 누를 때 만들어지므로,
// "예정"인 노선은 trip이 아직 없을 수 있다. 그래서 RouteStudent를 기준으로
// 노선을 펼치고, 그 노선의 오늘 trip 레코드 유무를 따로 본다.

export type RouteSummary = {
  id: string;
  name: string;
  direction: "PICKUP" | "DROPOFF";
  scheduledFirstAt: string | null; // 첫 정류장 scheduledAt "HH:mm"
  vehicle: { plate: string; mode: "KIDS" | "GENERAL" };
};

export type StopSummary = { id: string; name: string };

export type ChildTripCard =
  | {
      kind: "running";
      tripId: string;
      route: RouteSummary;
      childStop: StopSummary;
      startedAtISO: string;
      // refac hi-fi: hero 카드 보조 정보 — 자녀 정류장 예정 시각·기사 이름.
      // running 상태에서만 의미 있어 그 분기에만 채움.
      childStopScheduledAt: string | null; // "HH:mm"
      driverName: string | null;
      // refac hi-fi 3-info row: "현재 위치 N정류장 전" + "탑승 학생 X/Y".
      // 데이터가 없으면 null — LIVE 카드는 row를 두 칸으로 fallback.
      boardedCount: number; // BoardingEvent type=BOARD
      totalAssigned: number; // RouteStudent for this route
      stopsAheadOfChild: number | null; // 음수면 통과(0으로 clamp), null이면 미산정
    }
  | { kind: "scheduled"; route: RouteSummary; childStop: StopSummary }
  | {
      kind: "finished";
      tripId: string;
      route: RouteSummary;
      childStop: StopSummary;
      endedAtISO: string;
    }
  | { kind: "none"; reason: "no_route" | "off_day" };

export type ChildTodaySummary = {
  studentId: string;
  studentName: string;
  cards: ChildTripCard[];
};

export async function getTodayChildTrips(
  students: { id: string; name: string }[],
): Promise<ChildTodaySummary[]> {
  if (students.length === 0) return [];

  const bit = todayBitKst();
  const today = todayUtcDateKst();
  const studentIds = students.map((s) => s.id);

  const routeStudents = await db.routeStudent.findMany({
    where: { studentId: { in: studentIds } },
    include: {
      stop: { select: { id: true, name: true } },
      route: {
        include: {
          vehicle: { select: { plate: true, mode: true } },
          // 첫 stop의 scheduledAt(전체 노선 출발 시각) + 자녀 stop의 scheduledAt 모두
          // 필요 — 같은 query에서 stops 전체를 가져와 client에서 derive.
          stops: {
            orderBy: { order: "asc" },
            select: { scheduledAt: true, stopId: true },
          },
          trips: {
            where: { date: today },
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              driver: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  const result: ChildTodaySummary[] = [];

  for (const s of students) {
    const studentAssignments = routeStudents.filter(
      (rs) => rs.studentId === s.id,
    );
    const cards: ChildTripCard[] = [];

    for (const rs of studentAssignments) {
      if ((rs.route.weekdays & bit) === 0) continue; // 오늘 요일 아님

      const route: RouteSummary = {
        id: rs.route.id,
        name: rs.route.name,
        direction: rs.route.direction,
        scheduledFirstAt: rs.route.stops[0]?.scheduledAt ?? null,
        vehicle: {
          plate: rs.route.vehicle.plate,
          mode: rs.route.vehicle.mode,
        },
      };
      const childStop: StopSummary = rs.stop;
      const childStopScheduledAt =
        rs.route.stops.find((rsStop) => rsStop.stopId === rs.stopId)
          ?.scheduledAt ?? null;

      const trip = rs.route.trips[0];
      if (trip?.endedAt) {
        cards.push({
          kind: "finished",
          tripId: trip.id,
          route,
          childStop,
          endedAtISO: trip.endedAt.toISOString(),
        });
      } else if (trip?.startedAt) {
        // refac hi-fi 3-info row 보강 — 탑승 진행률·자녀 stop까지 남은 정류장 수.
        // 보통 한 페이지에 running trip 0~2개라 N+1 query 비용 미미.
        const [boardedCount, totalAssigned, latestEvents] = await Promise.all([
          db.boardingEvent.count({
            where: { tripId: trip.id, type: "BOARD" },
          }),
          db.routeStudent.count({ where: { routeId: rs.route.id } }),
          db.boardingEvent.findMany({
            where: {
              tripId: trip.id,
              type: { in: ["BOARD", "ALIGHT"] },
            },
            select: {
              student: {
                select: {
                  routes: {
                    where: { routeId: rs.route.id },
                    select: { stopId: true },
                  },
                },
              },
            },
          }),
        ]);

        // 자녀 stop의 route order
        const childStopOrder = rs.route.stops.findIndex(
          (s) => s.stopId === rs.stopId,
        );
        // 이미 들른 stop들의 max order
        const visitedStopIds = new Set<string>();
        for (const e of latestEvents) {
          for (const r of e.student.routes) visitedStopIds.add(r.stopId);
        }
        let maxVisitedOrder = -1;
        for (let i = 0; i < rs.route.stops.length; i++) {
          if (visitedStopIds.has(rs.route.stops[i].stopId)) maxVisitedOrder = i;
        }
        const stopsAheadOfChild =
          childStopOrder >= 0 && maxVisitedOrder >= 0
            ? Math.max(0, childStopOrder - maxVisitedOrder)
            : null;

        cards.push({
          kind: "running",
          tripId: trip.id,
          route,
          childStop,
          startedAtISO: trip.startedAt.toISOString(),
          childStopScheduledAt,
          driverName: trip.driver?.name ?? null,
          boardedCount,
          totalAssigned,
          stopsAheadOfChild,
        });
      } else {
        // trip이 없거나 startedAt이 아직 null
        cards.push({ kind: "scheduled", route, childStop });
      }
    }

    if (cards.length === 0) {
      const hasAnyAssignment = studentAssignments.length > 0;
      cards.push({
        kind: "none",
        reason: hasAnyAssignment ? "off_day" : "no_route",
      });
    }

    result.push({
      studentId: s.id,
      studentName: s.name,
      cards,
    });
  }

  return result;
}
