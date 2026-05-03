"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireOwner } from "@/lib/auth/session";
import { sendToGuardian, sendToStaff } from "@/lib/push/server";

// OWNER 결석 승인/반려.
// 승인 → ACKNOWLEDGED + 학부모 push + 영향 받는 driver/helper push.
// 반려 → REJECTED + rejectReason 필수 + 학부모 push (사유 포함).

function affectedDirectionsForType(
  type: "ABSENT_BOTH" | "ABSENT_PICKUP" | "ABSENT_DROPOFF",
): Set<"PICKUP" | "DROPOFF"> {
  if (type === "ABSENT_BOTH") return new Set(["PICKUP", "DROPOFF"]);
  if (type === "ABSENT_PICKUP") return new Set(["PICKUP"]);
  return new Set(["DROPOFF"]);
}

function dateLabel(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function typeLabel(type: "ABSENT_BOTH" | "ABSENT_PICKUP" | "ABSENT_DROPOFF") {
  return type === "ABSENT_BOTH"
    ? "등·하원"
    : type === "ABSENT_PICKUP"
      ? "등원"
      : "하원";
}

export async function approveAbsenceAction(absenceId: string): Promise<void> {
  const me = await requireOwner();

  const absence = await db.absenceRequest.findUnique({
    where: { id: absenceId },
    select: {
      id: true,
      status: true,
      type: true,
      date: true,
      createdBy: true,
      student: {
        select: {
          id: true,
          name: true,
          orgId: true,
          routes: {
            select: {
              route: { select: { id: true, direction: true } },
            },
          },
        },
      },
    },
  });
  if (!absence) throw new Error("결석 신청을 찾을 수 없습니다");
  if (absence.student.orgId !== me.org.id) {
    throw new Error("FORBIDDEN: 다른 학원의 결석 신청입니다");
  }
  if (absence.status === "ACKNOWLEDGED" || absence.status === "REJECTED") {
    return; // 이미 결정됨 — 멱등
  }

  await db.absenceRequest.update({
    where: { id: absenceId },
    data: {
      status: "ACKNOWLEDGED",
      decidedBy: me.staff.id,
      decidedAt: new Date(),
    },
  });

  const dLabel = dateLabel(absence.date);
  const tLabel = typeLabel(absence.type);

  // 학부모 push
  await sendToGuardian(absence.createdBy, {
    title: "결석 승인됨",
    body: `${absence.student.name} · ${dLabel} · ${tLabel} 결석이 승인되었어요.`,
    url: "/my-absences",
    category: "ABSENCE_APPROVED",
  }).catch((e) => console.warn("guardian absence-approved push failed:", e));

  // 영향 받는 노선 driver/helper push
  const affected = affectedDirectionsForType(absence.type);
  const affectedRouteIds = absence.student.routes
    .filter((rs) => affected.has(rs.route.direction))
    .map((rs) => rs.route.id);

  if (affectedRouteIds.length > 0) {
    const trips = await db.trip.findMany({
      where: { date: absence.date, routeId: { in: affectedRouteIds } },
      select: { driverId: true, helperId: true },
    });

    const staffIds = new Set<string>();
    for (const t of trips) {
      staffIds.add(t.driverId);
      if (t.helperId) staffIds.add(t.helperId);
    }

    await Promise.all(
      Array.from(staffIds).map((sid) =>
        sendToStaff(sid, {
          title: "결석 알림",
          body: `${absence.student.name} · ${dLabel} · ${tLabel} 결석 (확인 완료)`,
          url: "/run",
          category: "ABSENCE_APPROVED",
        }),
      ),
    ).catch((e) => console.warn("driver absence push failed:", e));
  }

  revalidatePath("/absences");
}

const RejectInput = z.object({
  reason: z.string().trim().min(1, "반려 사유를 입력해 주세요").max(500),
});

export async function rejectAbsenceAction(
  absenceId: string,
  rawReason: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireOwner();

  const parsed = RejectInput.safeParse({ reason: rawReason });
  if (!parsed.success) {
    const fieldErr = parsed.error.flatten().fieldErrors.reason?.[0];
    return { error: fieldErr ?? "반려 사유가 올바르지 않습니다" };
  }
  const reason = parsed.data.reason;

  const absence = await db.absenceRequest.findUnique({
    where: { id: absenceId },
    select: {
      id: true,
      status: true,
      type: true,
      date: true,
      createdBy: true,
      student: { select: { name: true, orgId: true } },
    },
  });
  if (!absence) return { error: "결석 신청을 찾을 수 없습니다" };
  if (absence.student.orgId !== me.org.id) {
    return { error: "다른 학원의 결석 신청입니다" };
  }
  if (absence.status === "ACKNOWLEDGED" || absence.status === "REJECTED") {
    return { error: "이미 결정된 신청입니다" };
  }

  await db.absenceRequest.update({
    where: { id: absenceId },
    data: {
      status: "REJECTED",
      decidedBy: me.staff.id,
      decidedAt: new Date(),
      rejectReason: reason,
    },
  });

  const dLabel = dateLabel(absence.date);
  const tLabel = typeLabel(absence.type);

  await sendToGuardian(absence.createdBy, {
    title: "결석 반려됨",
    body: `${absence.student.name} · ${dLabel} · ${tLabel} · 사유: ${reason.slice(0, 80)}`,
    url: "/my-absences",
    category: "ABSENCE_REJECTED",
  }).catch((e) => console.warn("guardian absence-rejected push failed:", e));

  revalidatePath("/absences");
  return { ok: true };
}

// 하위 호환 — 기존 ackAbsenceAction을 approveAbsenceAction으로 alias.
export const ackAbsenceAction = approveAbsenceAction;
