"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";

// 시작·종료 위치는 기사 폰의 GPS에서 보내야 정확하나, W3-3a에서는 더미값으로 시작.
// W3-3b에서 실제 GPS 좌표를 form data로 받음.

export async function startTripAction(
  routeId: string,
  vehicleId: string,
): Promise<void> {
  const me = await requireDriver();
  const orgId = me.org.id;

  // route + vehicle 본 기관 검증
  const [route, vehicle] = await Promise.all([
    db.route.findFirst({
      where: { id: routeId, vehicle: { orgId } },
      select: { id: true, vehicleId: true },
    }),
    db.vehicle.findFirst({
      where: { id: vehicleId, orgId },
      select: { id: true },
    }),
  ]);
  if (!route) throw new Error("해당 노선을 찾을 수 없습니다");
  if (!vehicle) throw new Error("해당 차량을 찾을 수 없습니다");
  if (route.vehicleId !== vehicleId) {
    throw new Error("이 노선은 해당 차량에 묶여 있지 않습니다");
  }

  // 오늘 KST 자정 기준 (Date 컬럼은 시각 무시)
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  // upsert: 같은 vehicle/route/date 조합이 이미 있으면 그걸 다시 사용
  // (driver가 종료 안 하고 다시 들어와도 같은 trip 이어감)
  let trip = await db.trip.findUnique({
    where: {
      vehicleId_routeId_date: {
        vehicleId,
        routeId,
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
        vehicleId,
        routeId,
        driverId: me.staff.id,
        date: today,
        startedAt: new Date(),
      },
    });
  } else if (!trip.startedAt) {
    trip = await db.trip.update({
      where: { id: trip.id },
      data: { startedAt: new Date(), driverId: me.staff.id },
    });
  }

  revalidatePath("/run");
  redirect(`/trip/${trip.id}`);
}

export async function endTripAction(tripId: string): Promise<void> {
  const me = await requireDriver();
  const orgId = me.org.id;

  // trip이 본 기관 + 본인이 driver
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      driverId: me.staff.id,
      vehicle: { orgId },
    },
    select: { id: true, endedAt: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");
  if (trip.endedAt) throw new Error("이미 종료된 운행입니다");

  await db.trip.update({
    where: { id: trip.id },
    data: { endedAt: new Date() },
  });

  revalidatePath("/run");
  revalidatePath(`/trip/${tripId}`);
  redirect("/run");
}
