// SafetyCheck upsert — KIDS 모드 운행마다 1건. 도로교통법 §53⑦ 안전운행기록
// 원천. driver/helper 둘 다 토글 가능 (호출 측에서 role 검증).
// 이 함수는 trip 접근 권한만 확인 (actor가 해당 trip의 driver 또는 helper).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";

import type { SafetyFieldsInput } from "./types";

export async function upsertSafetyCheck(
  actor: CurrentUser,
  tripId: string,
  fields: SafetyFieldsInput,
): Promise<void> {
  const trip = await db.trip.findFirst({
    where: {
      id: tripId,
      vehicle: { orgId: actor.org.id },
      OR: [{ driverId: actor.staff.id }, { helperId: actor.staff.id }],
    },
    select: { id: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");

  const now = new Date();
  const data: {
    seatbeltAllOk?: boolean;
    seatbeltCheckedAt?: Date | null;
    helperPresent?: boolean;
    allAlightedOk?: boolean;
    alightCheckedAt?: Date | null;
    // W26-A
    emergencyLightOk?: boolean;
    doorLockOk?: boolean;
    capacityOk?: boolean;
    cabinLockOk?: boolean;
    keyReturnedOk?: boolean;
    recordReviewedOk?: boolean;
  } = {};
  if (fields.seatbeltAllOk !== undefined) {
    data.seatbeltAllOk = fields.seatbeltAllOk;
    data.seatbeltCheckedAt = fields.seatbeltAllOk ? now : null;
  }
  if (fields.helperPresent !== undefined) {
    data.helperPresent = fields.helperPresent;
  }
  if (fields.allAlightedOk !== undefined) {
    data.allAlightedOk = fields.allAlightedOk;
    data.alightCheckedAt = fields.allAlightedOk ? now : null;
  }
  if (fields.emergencyLightOk !== undefined) data.emergencyLightOk = fields.emergencyLightOk;
  if (fields.doorLockOk !== undefined) data.doorLockOk = fields.doorLockOk;
  if (fields.capacityOk !== undefined) data.capacityOk = fields.capacityOk;
  if (fields.cabinLockOk !== undefined) data.cabinLockOk = fields.cabinLockOk;
  if (fields.keyReturnedOk !== undefined) data.keyReturnedOk = fields.keyReturnedOk;
  if (fields.recordReviewedOk !== undefined) data.recordReviewedOk = fields.recordReviewedOk;

  await db.safetyCheck.upsert({
    where: { tripId },
    create: {
      tripId,
      seatbeltAllOk: fields.seatbeltAllOk ?? false,
      seatbeltCheckedAt: fields.seatbeltAllOk ? now : null,
      helperPresent: fields.helperPresent ?? false,
      allAlightedOk: fields.allAlightedOk ?? false,
      alightCheckedAt: fields.allAlightedOk ? now : null,
      emergencyLightOk: fields.emergencyLightOk ?? false,
      doorLockOk: fields.doorLockOk ?? false,
      capacityOk: fields.capacityOk ?? false,
      cabinLockOk: fields.cabinLockOk ?? false,
      keyReturnedOk: fields.keyReturnedOk ?? false,
      recordReviewedOk: fields.recordReviewedOk ?? false,
    },
    update: data,
  });

  await publishTripUpdate(tripId, "safety", actor.org.id);
}
