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

export type StopSummary = {
  id: string;
  name: string;
  scheduledAt: string | null; // 자녀 정류장의 노선 내 scheduledAt
};

// W25 P0-A: running trip은 hero 카드에 풀세트 표시 — ETA·현재 위치·탑승 학생·기사
export type RunningTripDetails = {
  driverName: string | null;
  boardedCount: number;
  totalStudents: number;
  // 자녀 정류장의 노선 내 order (1-based)
  childStopOrder: number | null;
  // 가장 최근 STOP_PASS 매칭된 정류장 order. 없으면 0 (출발 직후).
  currentStopOrder: number | null;
};

export type ChildTripCard =
  | {
      kind: "running";
      tripId: string;
      route: RouteSummary;
      childStop: StopSummary;
      startedAtISO: string;
      details: RunningTripDetails;
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
          // 정류장 순서·시각 풀 (자녀 정류장 ETA + 현재 정류장 매핑용)
          stops: {
            orderBy: { order: "asc" },
            select: {
              order: true,
              scheduledAt: true,
              stop: { select: { id: true, lat: true, lng: true } },
            },
          },
          // 노선 배정 학생 수 (탑승 진행률 분모)
          _count: { select: { students: true } },
          trips: {
            where: { date: today },
            select: {
              id: true,
              startedAt: true,
              endedAt: true,
              driver: { select: { name: true } },
              // 탑승 카운트
              events: {
                where: { type: "BOARD" },
                select: { id: true },
              },
              // 가장 최근 STOP_PASS ping (현재 정류장 매핑)
              pings: {
                where: { source: "STOP_PASS" },
                orderBy: { recordedAt: "desc" },
                take: 1,
                select: { lat: true, lng: true },
              },
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
      if (!rs.route.isActive) continue; // W26-B: 미사용 노선은 학부모 home에서 제외

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
      // 자녀 정류장의 노선 내 order + scheduledAt
      const childStopRouteEntry = rs.route.stops.find(
        (rsItem) => rsItem.stop.id === rs.stop.id,
      );
      const childStop: StopSummary = {
        id: rs.stop.id,
        name: rs.stop.name,
        scheduledAt: childStopRouteEntry?.scheduledAt ?? null,
      };

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
        // 가장 최근 STOP_PASS ping → 가장 가까운 RouteStop order 매핑
        let currentStopOrder: number | null = null;
        const lastPing = trip.pings[0];
        if (lastPing) {
          let best: { order: number; dist: number } | null = null;
          for (const rsItem of rs.route.stops) {
            const dx = rsItem.stop.lat - lastPing.lat;
            const dy = rsItem.stop.lng - lastPing.lng;
            const d2 = dx * dx + dy * dy; // squared 충분 (정렬용)
            if (!best || d2 < best.dist) {
              best = { order: rsItem.order, dist: d2 };
            }
          }
          currentStopOrder = best?.order ?? null;
        }

        cards.push({
          kind: "running",
          tripId: trip.id,
          route,
          childStop,
          startedAtISO: trip.startedAt.toISOString(),
          details: {
            driverName: trip.driver?.name ?? null,
            boardedCount: trip.events.length,
            totalStudents: rs.route._count.students,
            childStopOrder: childStopRouteEntry?.order ?? null,
            currentStopOrder,
          },
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
