// 운행 시작.
// 같은 vehicle/route/date 조합이 이미 있으면 그걸 재사용 (driver가 종료 안
// 하고 다시 들어와도 같은 trip 이어감). 이미 endedAt이면 throw.
//
// W23: SA + Route Handler 공유 비즈니스 함수. redirect/revalidatePath는
// 호출 측 (SA wrapper) 책임. 이 함수는 publishTripUpdate까지만 실행.
//
// W23+: 시작 시점에 동승자(helperId) 같이 지정. KIDS 모드는 동승보호자 의무
// (도교법 §53), 일반 모드는 선택. 그리고 같은 차량(vehicleId)이 이미 다른
// 노선으로 active이면 차단 — 같은 버스 동시 운행 방지.

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";

import type { StartTripInput } from "./types";

export async function startTrip(
  actor: CurrentUser,
  input: StartTripInput,
): Promise<{ tripId: string }> {
  const orgId = actor.org.id;

  // route + vehicle 본 기관 검증
  const [route, vehicle] = await Promise.all([
    db.route.findFirst({
      where: { id: input.routeId, vehicle: { orgId } },
      select: { id: true, vehicleId: true },
    }),
    db.vehicle.findFirst({
      where: { id: input.vehicleId, orgId },
      select: { id: true, mode: true },
    }),
  ]);
  if (!route) throw new Error("해당 노선을 찾을 수 없습니다");
  if (!vehicle) throw new Error("해당 차량을 찾을 수 없습니다");
  if (route.vehicleId !== input.vehicleId) {
    throw new Error("이 노선은 해당 차량에 묶여 있지 않습니다");
  }

  // KIDS 모드는 동승자 의무 (도교법 §53 동승보호자)
  const helperId = input.helperId ?? null;
  if (vehicle.mode === "KIDS" && !helperId) {
    throw new Error(
      "어린이용 차량은 동승보호자(동승자)를 반드시 선택해야 합니다",
    );
  }

  // 동승자 검증 — 같은 기관의 HELPER role
  if (helperId) {
    const helper = await db.staff.findFirst({
      where: { id: helperId, orgId, role: "HELPER" },
      select: { id: true },
    });
    if (!helper) throw new Error("선택한 동승자를 찾을 수 없습니다");
  }

  // 같은 vehicle이 다른 노선으로 이미 active인지 — 같은 차량 동시 운행 차단
  const sameVehicleActive = await db.trip.findFirst({
    where: {
      vehicleId: input.vehicleId,
      endedAt: null,
      startedAt: { not: null },
    },
    select: { id: true, routeId: true },
  });
  if (
    sameVehicleActive &&
    sameVehicleActive.routeId !== input.routeId
  ) {
    throw new Error(
      "이 차량은 이미 다른 노선 운행이 진행 중입니다. 먼저 종료한 후 시작해 주세요",
    );
  }

  // 오늘 KST 자정 기준
  const today = todayUtcDateKst();

  let trip = await db.trip.findUnique({
    where: {
      vehicleId_routeId_date: {
        vehicleId: input.vehicleId,
        routeId: input.routeId,
        date: today,
      },
    },
  });

  if (trip && trip.endedAt) {
    throw new Error("이 노선은 오늘 이미 운행이 종료되었습니다");
  }

  if (!trip) {
    trip = await db.trip.create({
      data: {
        vehicleId: input.vehicleId,
        routeId: input.routeId,
        driverId: actor.staff.id,
        helperId,
        date: today,
        startedAt: new Date(),
      },
    });
  } else if (!trip.startedAt) {
    trip = await db.trip.update({
      where: { id: trip.id },
      data: {
        startedAt: new Date(),
        driverId: actor.staff.id,
        helperId,
      },
    });
  }

  await publishTripUpdate(trip.id, "trip-state", orgId);

  return { tripId: trip.id };
}
