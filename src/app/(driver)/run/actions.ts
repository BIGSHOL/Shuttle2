"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireDriver } from "@/lib/auth/session";
import { requireTripAccess } from "@/lib/auth/trip-access";
import { todayUtcDateKst } from "@/lib/date/today";

// W3-3b: 기사 폰이 직접 좌표를 send. start/end 시 위치는 첫/마지막 ping에서 채워짐.

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
  const today = todayUtcDateKst();

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

// ────────────────────────────────────────────────────────────────────
// LocationPing 영구 저장
//
// 영구 저장 정책 (CLAUDE.md 명세):
// - 30초 간격 INTERVAL ping
// - 정류장 반경 진입 시점 STOP_PASS ping (자동 판정)
// - 운행 시작 시점 START ping
// - 운행 종료 시점 END ping
// 실시간 broadcast (5초 간격)는 클라이언트에서 직접 Supabase channel.send,
// DB 거치지 않음.
// ────────────────────────────────────────────────────────────────────

const PingInput = z.object({
  tripId: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  speed: z.number().optional(),
  heading: z.number().min(0).max(360).optional(),
  source: z.enum(["INTERVAL", "STOP_PASS", "START", "END"]),
});

export type RecordPingInput = z.infer<typeof PingInput>;

export async function recordPingAction(input: RecordPingInput): Promise<void> {
  const parsed = PingInput.safeParse(input);
  if (!parsed.success) {
    throw new Error("잘못된 좌표 데이터");
  }

  const me = await requireDriver();
  const orgId = me.org.id;

  // 진행 중 trip + 본인이 driver 검증
  const trip = await db.trip.findFirst({
    where: {
      id: parsed.data.tripId,
      driverId: me.staff.id,
      vehicle: { orgId },
    },
    select: { id: true, endedAt: true, startLat: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");
  if (trip.endedAt) {
    throw new Error("종료된 운행에는 좌표를 기록할 수 없습니다");
  }

  const data = parsed.data;
  await db.locationPing.create({
    data: {
      tripId: data.tripId,
      lat: data.lat,
      lng: data.lng,
      accuracy: data.accuracy ?? null,
      speed: data.speed ?? null,
      heading: data.heading ?? null,
      source: data.source,
    },
  });

  // 첫 START ping이면 trip.startLat/Lng도 채움
  if (data.source === "START" && trip.startLat === null) {
    await db.trip.update({
      where: { id: trip.id },
      data: { startLat: data.lat, startLng: data.lng },
    });
  }
  // END ping이면 trip.endLat/Lng도 채움
  if (data.source === "END") {
    await db.trip.update({
      where: { id: trip.id },
      data: { endLat: data.lat, endLng: data.lng },
    });
  }
}

// ────────────────────────────────────────────────────────────────────
// SafetyCheck — KIDS 모드 운행마다 1건. 도교법 §53⑦ 안전운행기록 원천.
// driver/helper 둘 다 토글 가능.
// ────────────────────────────────────────────────────────────────────

const SafetyFields = z.object({
  seatbeltAllOk: z.boolean().optional(),
  helperPresent: z.boolean().optional(),
  allAlightedOk: z.boolean().optional(),
});

export type SafetyFieldsInput = z.infer<typeof SafetyFields>;

export async function upsertSafetyCheckAction(
  tripId: string,
  fields: SafetyFieldsInput,
): Promise<void> {
  const parsed = SafetyFields.safeParse(fields);
  if (!parsed.success) throw new Error("잘못된 안전점검 데이터");

  await requireTripAccess(tripId);

  const now = new Date();
  const data: {
    seatbeltAllOk?: boolean;
    seatbeltCheckedAt?: Date | null;
    helperPresent?: boolean;
    allAlightedOk?: boolean;
    alightCheckedAt?: Date | null;
  } = {};
  if (parsed.data.seatbeltAllOk !== undefined) {
    data.seatbeltAllOk = parsed.data.seatbeltAllOk;
    data.seatbeltCheckedAt = parsed.data.seatbeltAllOk ? now : null;
  }
  if (parsed.data.helperPresent !== undefined) {
    data.helperPresent = parsed.data.helperPresent;
  }
  if (parsed.data.allAlightedOk !== undefined) {
    data.allAlightedOk = parsed.data.allAlightedOk;
    data.alightCheckedAt = parsed.data.allAlightedOk ? now : null;
  }

  await db.safetyCheck.upsert({
    where: { tripId },
    create: {
      tripId,
      seatbeltAllOk: parsed.data.seatbeltAllOk ?? false,
      seatbeltCheckedAt: parsed.data.seatbeltAllOk ? now : null,
      helperPresent: parsed.data.helperPresent ?? false,
      allAlightedOk: parsed.data.allAlightedOk ?? false,
      alightCheckedAt: parsed.data.allAlightedOk ? now : null,
    },
    update: data,
  });

  revalidatePath(`/trip/${tripId}`);
}

// ────────────────────────────────────────────────────────────────────
// BoardingEvent — 학생 탑승·하차 (정류장에서)
// 같은 trip + studentId + type이 이미 있으면 토글로 삭제, 없으면 추가.
// ────────────────────────────────────────────────────────────────────

const BoardingInput = z.object({
  tripId: z.string().min(1),
  studentId: z.string().min(1),
  type: z.enum(["BOARD", "ALIGHT"]),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  notes: z.string().max(200).optional(),
});

export type BoardingInputType = z.infer<typeof BoardingInput>;

export async function toggleBoardingEventAction(
  input: BoardingInputType,
): Promise<void> {
  const parsed = BoardingInput.safeParse(input);
  if (!parsed.success) throw new Error("잘못된 탑승·하차 데이터");

  await requireTripAccess(parsed.data.tripId);

  // 이미 같은 type 이벤트가 있으면 가장 최근 것 삭제 (토글)
  const existing = await db.boardingEvent.findFirst({
    where: {
      tripId: parsed.data.tripId,
      studentId: parsed.data.studentId,
      type: parsed.data.type,
    },
    orderBy: { at: "desc" },
  });

  if (existing) {
    await db.boardingEvent.delete({ where: { id: existing.id } });
  } else {
    await db.boardingEvent.create({
      data: {
        tripId: parsed.data.tripId,
        studentId: parsed.data.studentId,
        type: parsed.data.type,
        lat: parsed.data.lat ?? null,
        lng: parsed.data.lng ?? null,
        notes: parsed.data.notes ?? null,
      },
    });
  }

  revalidatePath(`/trip/${parsed.data.tripId}`);
}

// ────────────────────────────────────────────────────────────────────
// Trip helper 지정 (driver만)
// ────────────────────────────────────────────────────────────────────

export async function assignHelperAction(
  tripId: string,
  helperId: string | null,
): Promise<void> {
  const me = await requireDriver();
  const orgId = me.org.id;

  // helper로 지정하려면 같은 org의 HELPER role 검증
  if (helperId !== null) {
    const helper = await db.staff.findFirst({
      where: { id: helperId, orgId, role: "HELPER" },
      select: { id: true },
    });
    if (!helper) throw new Error("선택한 동승자를 찾을 수 없습니다");
  }

  const result = await db.trip.updateMany({
    where: { id: tripId, driverId: me.staff.id },
    data: { helperId },
  });
  if (result.count === 0) throw new Error("운행을 찾을 수 없습니다");

  revalidatePath(`/trip/${tripId}`);
}
