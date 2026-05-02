"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";

// 학부모가 자녀의 결석을 신청. 마감 정책 (MVP):
// - 오늘 또는 미래 날짜만 허용 (과거 X).
// - 같은 (자녀, 날짜) 중복 신청은 PENDING이 이미 있으면 거절.
// - 운행이 이미 시작된 자녀의 trip이면 거절.
//
// 알림: status는 PENDING. driver 푸시는 W6에서 NOTIFIED_DRIVER로 승격하면서
// web-push 발송 — 지금은 OWNER 화면에서만 조회 가능.

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

function todayUtcDate(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

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
  if (targetDate < todayUtcDate()) {
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
      // status PENDING (default)
    },
  });

  revalidatePath("/my-absences");
  revalidatePath("/home");
  redirect("/my-absences");
}
