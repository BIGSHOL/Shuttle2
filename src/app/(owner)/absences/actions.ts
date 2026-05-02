"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";

// OWNER가 학부모 결석 신청을 확인 처리. 현재는 PENDING → ACKNOWLEDGED.
// 추후(W6): NOTIFIED_DRIVER 단계 추가 + driver 푸시 발송.
export async function ackAbsenceAction(absenceId: string): Promise<void> {
  const me = await requireOwner();

  // 본인 org의 학생 결석만 처리 가능
  const absence = await db.absenceRequest.findUnique({
    where: { id: absenceId },
    select: { id: true, status: true, student: { select: { orgId: true } } },
  });
  if (!absence) throw new Error("결석 신청을 찾을 수 없습니다");
  if (absence.student.orgId !== me.org.id) {
    throw new Error("FORBIDDEN: 다른 학원의 결석 신청입니다");
  }
  if (absence.status === "ACKNOWLEDGED") {
    return; // 이미 처리됨 — 멱등
  }

  await db.absenceRequest.update({
    where: { id: absenceId },
    data: { status: "ACKNOWLEDGED" },
  });

  revalidatePath("/absences");
}
