// W23+: 정류장 수기 "도착" 마킹 — GPS 자동 감지 안 되거나 신호 약한 정류장
// 대응. driver가 직접 누르면 그 stop의 lat/lng로 STOP_PASS ping 생성 →
// 학부모에 자동 푸시 + 학원장 화면 통과 표시 + 도착 시각 기록.
//
// 기존 recordPing(STOP_PASS) 흐름 그대로 재사용 — schema 변경·새 source 추가 X.
// stop의 실제 좌표를 ping에 넣으므로 computeStopArrivals의 nearest 매칭에서
// 정확히 그 stop으로 매핑됨.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

import { recordPing } from "./record-ping";

export async function markStopPassed(
  actor: CurrentUser,
  tripId: string,
  stopId: string,
): Promise<void> {
  // trip 권한 + stop이 이 trip의 route에 속하는지 검증
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      driverId: actor.staff.id,
      vehicle: { orgId: actor.org.id },
      endedAt: null,
    },
    select: { id: true, routeId: true },
  });
  if (!trip) throw new Error("진행 중인 운행을 찾을 수 없습니다");

  const routeStop = await db.routeStop.findFirst({
    where: { routeId: trip.routeId, stopId },
    include: {
      stop: { select: { lat: true, lng: true } },
    },
  });
  if (!routeStop) throw new Error("이 노선의 정류장이 아닙니다");

  // recordPing 재사용 — source=STOP_PASS면 학부모 푸시·학원장 publish 자동 처리
  await recordPing(actor, {
    tripId,
    lat: routeStop.stop.lat,
    lng: routeStop.stop.lng,
    source: "STOP_PASS",
  });
}
