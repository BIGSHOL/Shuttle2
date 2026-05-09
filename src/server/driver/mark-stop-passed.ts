// W23+: 정류장 수기 "도착" 마킹 — GPS 자동 감지 안 되거나 신호 약한 정류장
// 대응. driver가 직접 누르면 그 RouteStop의 lat/lng로 STOP_PASS ping 생성 →
// 학부모에 자동 푸시 + 학원장 화면 통과 표시 + 도착 시각 기록.
//
// 인자는 **RouteStop.id** (Stop.id 아님). 같은 Stop이 한 노선의 등원·하원에
// 두 번 등장하면 RouteStop.id로 정확히 구분된다. trip-running-view의 정류장
// list에서 보내는 `s.id`가 RouteStop.id이므로 일치.
//
// **idempotent 보장 (W25)**: 모바일 사용자가 같은 정류장 "도착" 버튼을 빠르게
// 두 번 누르면 두 개의 server action이 race로 발생해 RSC 렌더 도중 일관성이
// 깨질 수 있음. 두 번째 호출은 silent return하여 학부모 푸시 중복·LocationPing
// 중복 행 생성을 막는다. 같은 좌표가 STOP_PASS로 60초 이내 기록됐는지 확인.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";

import { recordPing } from "./record-ping";

const RECENT_DUPLICATE_WINDOW_MS = 60_000; // 같은 stop 1분 이내 재호출 → 무시

export async function markStopPassed(
  actor: CurrentUser,
  tripId: string,
  routeStopId: string,
): Promise<void> {
  // trip 권한 + endedAt 검증.
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      driverId: actor.staff.id,
      vehicle: { orgId: actor.org.id },
    },
    select: { id: true, routeId: true, endedAt: true },
  });
  if (!trip) throw new Error("진행 중인 운행을 찾을 수 없습니다");
  if (trip.endedAt) {
    // 운행 이미 종료 — silent return (race condition 무시)
    return;
  }

  // RouteStop.id로 lookup — 노선 무결성도 함께 검증 (다른 노선의 RouteStop이면
  // routeId 매칭 안 돼서 not found).
  const routeStop = await db.routeStop.findFirst({
    where: { id: routeStopId, routeId: trip.routeId },
    include: {
      stop: { select: { lat: true, lng: true } },
    },
  });
  if (!routeStop) throw new Error("이 노선의 정류장이 아닙니다");

  // 같은 stop의 STOP_PASS ping이 60초 이내 있으면 중복으로 간주, silent return.
  // 좌표 비교 (RouteStop.id를 LocationPing에 직접 저장하지 않으므로).
  const cutoff = new Date(Date.now() - RECENT_DUPLICATE_WINDOW_MS);
  const recentPass = await db.locationPing.findFirst({
    where: {
      tripId,
      source: "STOP_PASS",
      lat: routeStop.stop.lat,
      lng: routeStop.stop.lng,
      recordedAt: { gte: cutoff },
    },
    select: { id: true },
  });
  if (recentPass) return; // 이미 처리됨

  // recordPing 재사용 — source=STOP_PASS면 학부모 푸시·학원장 publish 자동 처리
  await recordPing(actor, {
    tripId,
    lat: routeStop.stop.lat,
    lng: routeStop.stop.lng,
    source: "STOP_PASS",
  });
}
