"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { todayUtcDateKst } from "@/lib/date/today";
import { sendToOwnersOfOrg, sendToStaff } from "@/lib/push/server";

// 학부모가 자녀의 결석을 신청. 마감 정책 (MVP):
// - 오늘 또는 미래 날짜만 허용 (과거 X).
// - 같은 (자녀, 날짜) 중복 신청은 PENDING이 이미 있으면 거절.
// - 운행이 이미 시작된 자녀의 trip이면 거절.
//
// 알림 흐름 (베타 변경): 학원장 confirm 단계를 거치지 않고 status를
// NOTIFIED_DRIVER로 직접 set. 갑자기 결석하는 경우 학원장 응답 시간만큼
// 기사 알림 지연되던 문제 해소. 푸시 fan-out:
//   - 학원장(OWNER) — 정보성 알림 (현장 통제용)
//   - 그날 trip이 이미 만들어진 경우 그 trip의 driver/helper에게 직접 푸시
//   - trip 없는 경우(운행 시작 전)는 driver 식별 불가 → 학원장 푸시만.
//     운행 시작 시 trip 화면이 결석 학생 자동 표시(W15-B 미탑승 안내)로
//     커버.

export type CreateAbsenceState = {
  error?: string;
  fieldErrors?: Partial<Record<"studentId" | "date" | "type", string[]>>;
};

const schema = z.object({
  studentId: z.string().min(1, "자녀를 선택해 주세요"),
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "날짜 형식이 올바르지 않습니다"),
  type: z.enum(["ABSENT_BOTH", "ABSENT_PICKUP", "ABSENT_DROPOFF"]),
  reason: z.string().max(200).optional(),
});

export async function createAbsenceRequestAction(
  _prev: CreateAbsenceState,
  formData: FormData,
): Promise<CreateAbsenceState> {
  const me = await requireGuardian();

  const parsed = schema.safeParse({
    studentId: formData.get("studentId"),
    date: formData.get("date"),
    type: formData.get("type"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten()
        .fieldErrors as CreateAbsenceState["fieldErrors"],
    };
  }
  const { studentId, date, type, reason } = parsed.data;

  // 자녀 소유 검증 (다른 학원 학생을 신청하지 못하게)
  const isMyChild = me.students.some((s) => s.id === studentId);
  if (!isMyChild) return { error: "자녀가 아닙니다." };

  // 날짜 검증 — 오늘 또는 미래만
  const targetDate = new Date(`${date}T00:00:00.000Z`);
  if (targetDate < todayUtcDateKst()) {
    return {
      fieldErrors: { date: ["과거 날짜는 신청할 수 없습니다"] },
    };
  }

  // 중복 신청 체크
  const existing = await db.absenceRequest.findFirst({
    where: { studentId, date: targetDate, status: { not: "ACKNOWLEDGED" } },
    select: { id: true },
  });
  if (existing) {
    return { error: "같은 날짜 결석이 이미 신청되어 있습니다." };
  }

  // 운행이 이미 시작된 trip이 있으면 거절
  const startedTrip = await db.trip.findFirst({
    where: {
      date: targetDate,
      route: { students: { some: { studentId } } },
      startedAt: { not: null },
    },
    select: { id: true },
  });
  if (startedTrip) {
    return { error: "이미 운행이 시작되어 결석 신청을 받을 수 없습니다." };
  }

  await db.absenceRequest.create({
    data: {
      studentId,
      date: targetDate,
      type,
      reason: reason ?? null,
      createdBy: me.guardian.id,
      status: "NOTIFIED_DRIVER",
    },
  });

  // 푸시 fan-out: OWNER + (가능하면) 그날 trip의 driver/helper에게 동시.
  // 발송 실패는 결석 신청 자체를 깨뜨리지 않음 (에러 swallow + 로그).
  const child = me.students.find((s) => s.id === studentId);
  if (child) {
    const dateLabel = targetDate.toISOString().slice(0, 10);
    const typeLabel =
      type === "ABSENT_BOTH"
        ? "등·하원"
        : type === "ABSENT_PICKUP"
          ? "등원"
          : "하원";

    // 그날 trip이 이미 만들어진 경우 driver/helper 식별. 운행 시작 전이면
    // trip 없으므로 학생 routes에 묶인 가장 최근 trip의 driver/helper로
    // fallback — 같은 차량 운행자가 연속성 가지므로 합리적 추정.
    let trip = await db.trip.findFirst({
      where: {
        date: targetDate,
        route: { students: { some: { studentId } } },
      },
      select: { driverId: true, helperId: true },
    });
    if (!trip) {
      trip = await db.trip.findFirst({
        where: {
          route: { students: { some: { studentId } } },
        },
        orderBy: { date: "desc" },
        select: { driverId: true, helperId: true },
      });
    }

    const ownerPush = sendToOwnersOfOrg(child.orgId, {
      title: "결석 신청 접수",
      body: `${child.name} · ${dateLabel} · ${typeLabel}`,
      url: "/absences",
      category: "ABSENCE_REQUESTED",
    }).catch((e) => console.warn("absence owner push failed:", e));

    const driverPush = trip?.driverId
      ? sendToStaff(trip.driverId, {
          title: "결석 알림",
          body: `${child.name} · ${dateLabel} · ${typeLabel} 결석`,
          url: "/run",
          category: "ABSENCE_REQUESTED",
        }).catch((e) => console.warn("absence driver push failed:", e))
      : Promise.resolve();

    const helperPush = trip?.helperId
      ? sendToStaff(trip.helperId, {
          title: "결석 알림",
          body: `${child.name} · ${dateLabel} · ${typeLabel} 결석`,
          url: "/run",
          category: "ABSENCE_REQUESTED",
        }).catch((e) => console.warn("absence helper push failed:", e))
      : Promise.resolve();

    await Promise.all([ownerPush, driverPush, helperPush]);
  }

  revalidatePath("/my-absences");
  revalidatePath("/home");
  redirect("/my-absences");
}

// 결석 신청 취소. 학부모가 갑자기 사정 바뀌어 다시 등·하원 가능할 때.
// PENDING/NOTIFIED_DRIVER 상태에서만 가능 — 이미 처리(ACKNOWLEDGED/REJECTED)
// 됐거나 운행이 시작된 후엔 운영 일관성 위해 lock.
export async function cancelAbsenceRequestAction(
  absenceId: string,
): Promise<{ error: string } | undefined> {
  const me = await requireGuardian();

  const absence = await db.absenceRequest.findFirst({
    where: {
      id: absenceId,
      // 자녀 보호자만 취소 가능
      student: {
        guardians: { some: { guardianId: me.guardian.id } },
      },
    },
    include: {
      student: { select: { name: true, orgId: true } },
    },
  });
  if (!absence) {
    return { error: "결석 신청을 찾을 수 없습니다" };
  }
  if (absence.status === "ACKNOWLEDGED" || absence.status === "REJECTED") {
    return { error: "이미 처리된 결석은 취소할 수 없습니다" };
  }

  // 운행이 이미 시작됐으면 취소 불가
  const startedTrip = await db.trip.findFirst({
    where: {
      date: absence.date,
      route: { students: { some: { studentId: absence.studentId } } },
      startedAt: { not: null },
    },
    select: { id: true },
  });
  if (startedTrip) {
    return { error: "운행이 이미 시작되어 취소할 수 없습니다" };
  }

  await db.absenceRequest.delete({ where: { id: absenceId } });

  // OWNER에게 정보성 push (driver/helper는 운행 시작 전이라 어차피 인지 X)
  const dateLabel = absence.date.toISOString().slice(0, 10);
  const typeLabel =
    absence.type === "ABSENT_BOTH"
      ? "등·하원"
      : absence.type === "ABSENT_PICKUP"
        ? "등원"
        : "하원";
  await sendToOwnersOfOrg(absence.student.orgId, {
    title: "결석 취소",
    body: `${absence.student.name} · ${dateLabel} · ${typeLabel} 결석 취소`,
    url: "/absences",
    category: "ABSENCE_REQUESTED",
  }).catch((e) => console.warn("absence cancel owner push failed:", e));

  revalidatePath("/my-absences");
  revalidatePath("/home");
  return undefined;
}
