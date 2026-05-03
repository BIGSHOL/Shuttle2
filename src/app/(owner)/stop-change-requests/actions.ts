"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { sendToGuardian, sendToStaff } from "@/lib/push/server";

// OWNER 정류장 변경 요청 검토.
// 승인: 새 Stop 생성 + RouteStudent.stopId 갱신 + 학부모·기사 push.
// 반려: rejectReason 필수 + 학부모 push.

const ApproveInput = z.object({
  newStopName: z
    .string()
    .trim()
    .min(1, "새 정류장 이름을 입력해 주세요")
    .max(60),
});

export async function approveStopChangeAction(
  requestId: string,
  newStopName: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireOwner();
  const orgId = await getOrgId();

  const parsed = ApproveInput.safeParse({ newStopName });
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.newStopName?.[0] ??
        "정류장 이름이 올바르지 않습니다",
    };
  }

  const reqRow = await db.stopChangeRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      orgId: true,
      status: true,
      studentId: true,
      fromStopId: true,
      toLat: true,
      toLng: true,
      effectiveAt: true,
      createdBy: true,
      student: { select: { name: true } },
    },
  });
  if (!reqRow) return { error: "요청을 찾을 수 없습니다" };
  if (reqRow.orgId !== orgId) return { error: "다른 학원의 요청입니다" };
  if (reqRow.status !== "PENDING") {
    return { error: "이미 처리된 요청입니다" };
  }

  // 트랜잭션: 새 Stop 생성 + RouteStudent.stopId 갱신 + 요청 status 업데이트
  // 자녀가 같은 fromStop을 여러 노선에 사용 중이면 모두 갱신.
  const result = await db.$transaction(async (tx) => {
    const newStop = await tx.stop.create({
      data: {
        orgId,
        name: parsed.data.newStopName,
        lat: reqRow.toLat,
        lng: reqRow.toLng,
        radiusM: 50,
      },
    });

    await tx.routeStudent.updateMany({
      where: { studentId: reqRow.studentId, stopId: reqRow.fromStopId },
      data: { stopId: newStop.id },
    });

    await tx.stopChangeRequest.update({
      where: { id: requestId },
      data: {
        status: "APPROVED",
        decidedBy: me.staff.id,
        decidedAt: new Date(),
        resultStopId: newStop.id,
      },
    });

    return { newStopId: newStop.id, newStopName: newStop.name };
  });

  // 학부모 push
  await sendToGuardian(reqRow.createdBy, {
    title: "정류장 변경 승인",
    body: `${reqRow.student.name} 자녀의 정류장이 ${result.newStopName}로 변경됐어요.`,
    url: "/stop-change-requests",
    category: "STOP_CHANGE_APPROVED",
  }).catch((e) => console.warn("guardian stop-change-approved push:", e));

  // 영향 받는 노선의 driver/helper push (이번 effectiveAt 이후 trip)
  const trips = await db.trip.findMany({
    where: {
      route: { students: { some: { stopId: result.newStopId } } },
      date: { gte: reqRow.effectiveAt },
    },
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
        title: "정류장 변경",
        body: `${reqRow.student.name} 자녀가 ${result.newStopName}로 변경됐어요.`,
        url: "/run",
        category: "STOP_CHANGE_APPROVED",
      }),
    ),
  ).catch((e) => console.warn("staff stop-change push failed:", e));

  revalidatePath("/stop-change-requests");
  return { ok: true };
}

const RejectInput = z.object({
  reason: z.string().trim().min(1, "반려 사유를 입력해 주세요").max(500),
});

export async function rejectStopChangeAction(
  requestId: string,
  rawReason: string,
): Promise<{ ok: true } | { error: string }> {
  const me = await requireOwner();
  const orgId = await getOrgId();

  const parsed = RejectInput.safeParse({ reason: rawReason });
  if (!parsed.success) {
    return {
      error:
        parsed.error.flatten().fieldErrors.reason?.[0] ??
        "반려 사유가 올바르지 않습니다",
    };
  }

  const reqRow = await db.stopChangeRequest.findUnique({
    where: { id: requestId },
    select: {
      id: true,
      orgId: true,
      status: true,
      createdBy: true,
      student: { select: { name: true } },
    },
  });
  if (!reqRow) return { error: "요청을 찾을 수 없습니다" };
  if (reqRow.orgId !== orgId) return { error: "다른 학원의 요청입니다" };
  if (reqRow.status !== "PENDING") {
    return { error: "이미 처리된 요청입니다" };
  }

  await db.stopChangeRequest.update({
    where: { id: requestId },
    data: {
      status: "REJECTED",
      decidedBy: me.staff.id,
      decidedAt: new Date(),
      rejectReason: parsed.data.reason,
    },
  });

  await sendToGuardian(reqRow.createdBy, {
    title: "정류장 변경 반려",
    body: `${reqRow.student.name} · 사유: ${parsed.data.reason.slice(0, 80)}`,
    url: "/stop-change-requests",
    category: "STOP_CHANGE_REJECTED",
  }).catch((e) => console.warn("guardian stop-change-rejected push:", e));

  revalidatePath("/stop-change-requests");
  return { ok: true };
}
