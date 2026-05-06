// 미탑승·미하차 mark — 학부모·학원장 즉시 푸시.
// W15-B: 미탑승은 등원 운행에서 학생이 정류장에 안 옴.
//        미하차는 하원 운행에서 정류장에서 못 내림 (매우 위험).
// 같은 type이 이미 있으면 갱신, 없으면 새로 생성 (idempotent).

import { db } from "@/lib/db";
import type { CurrentUser } from "@/lib/auth/session";
import { publishTripUpdate } from "@/lib/geo/publish-trip-update";
import { sendToGuardian, sendToOwnersOfOrg } from "@/lib/push/server";

import type { MarkIssueInput } from "./types";

export async function markBoardingIssue(
  actor: CurrentUser,
  input: MarkIssueInput,
): Promise<void> {
  const trip = await db.trip.findFirst({
    where: {
      id: input.tripId,
      vehicle: { orgId: actor.org.id },
      OR: [{ driverId: actor.staff.id }, { helperId: actor.staff.id }],
    },
    select: { id: true },
  });
  if (!trip) throw new Error("운행을 찾을 수 없습니다");

  const existing = await db.boardingEvent.findFirst({
    where: {
      tripId: input.tripId,
      studentId: input.studentId,
      type: input.type,
    },
    orderBy: { at: "desc" },
  });

  if (existing) {
    await db.boardingEvent.update({
      where: { id: existing.id },
      data: {
        notes: input.reason,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        at: new Date(),
      },
    });
  } else {
    await db.boardingEvent.create({
      data: {
        tripId: input.tripId,
        studentId: input.studentId,
        type: input.type,
        notes: input.reason,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
      },
    });
  }

  // 학부모·학원장 푸시 — 자녀의 보호자 모두 + org의 OWNER 모두
  const student = await db.student.findUnique({
    where: { id: input.studentId },
    select: {
      name: true,
      orgId: true,
      guardians: { select: { guardianId: true } },
    },
  });

  if (student) {
    const isNoShow = input.type === "NO_SHOW";
    const title = isNoShow
      ? `${student.name} 미탑승`
      : `${student.name} 미하차 — 확인 필요`;
    const body = isNoShow
      ? `정류장에 자녀가 보이지 않아 출발했어요. 사유: ${input.reason}`
      : `정류장에서 자녀가 내리지 못했어요. 사유: ${input.reason}`;
    const category = isNoShow ? "STUDENT_NO_SHOW" : "STUDENT_NO_DROPOFF";

    // 보호자 fan-out
    for (const g of student.guardians) {
      await sendToGuardian(g.guardianId, {
        category,
        title,
        body,
        url: "/home",
      }).catch((e) => console.error("push to guardian failed:", e));
    }

    // 학원장 fan-out
    await sendToOwnersOfOrg(student.orgId, {
      category,
      title,
      body,
      url: "/dashboard",
    }).catch((e) => console.error("push to owners failed:", e));
  }

  await publishTripUpdate(input.tripId, "issue", actor.org.id);
}
