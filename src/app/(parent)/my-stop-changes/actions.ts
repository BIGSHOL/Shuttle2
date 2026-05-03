"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { sendToOwnersOfOrg } from "@/lib/push/server";

// 학부모가 자녀의 정류장 변경을 OWNER에게 요청. OWNER가 승인하면 RouteStudent
// stopId가 갱신된다. 1차 구현은 "이번 신청부터 즉시 적용"으로 단순화 —
// effectiveAt은 디자인 명세 따라 받지만 OWNER 승인 시 즉시 RouteStudent를
// 갱신하는 흐름. 다음 세션에서 trip별 override로 정밀화.

const Input = z.object({
  studentId: z.string().min(1, "자녀를 선택해 주세요"),
  fromStopId: z.string().min(1, "기존 정류장을 선택해 주세요"),
  toLat: z.number().refine((v) => v >= -90 && v <= 90, {
    message: "위도가 올바르지 않습니다",
  }),
  toLng: z.number().refine((v) => v >= -180 && v <= 180, {
    message: "경도가 올바르지 않습니다",
  }),
  toAddress: z.string().max(200).optional(),
  reason: z.string().max(500).optional(),
  effectiveAt: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "적용 일자가 올바르지 않습니다"),
});

export type CreateStopChangeState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createStopChangeRequestAction(
  _prev: CreateStopChangeState,
  formData: FormData,
): Promise<CreateStopChangeState> {
  const me = await requireGuardian();

  const parsed = Input.safeParse({
    studentId: formData.get("studentId"),
    fromStopId: formData.get("fromStopId"),
    toLat: Number(formData.get("toLat")),
    toLng: Number(formData.get("toLng")),
    toAddress: formData.get("toAddress") || undefined,
    reason: formData.get("reason") || undefined,
    effectiveAt: formData.get("effectiveAt"),
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  // 자녀 검증 + 자녀가 그 정류장을 fromStopId로 사용 중인지 확인
  const child = me.students.find((s) => s.id === data.studentId);
  if (!child) return { error: "자녀가 아닙니다." };

  const routeStudent = await db.routeStudent.findFirst({
    where: { studentId: data.studentId, stopId: data.fromStopId },
    select: { id: true, route: { select: { vehicle: { select: { orgId: true } } } } },
  });
  if (!routeStudent) {
    return { error: "선택한 자녀와 기존 정류장이 일치하지 않습니다." };
  }
  const orgId = routeStudent.route.vehicle.orgId;
  if (orgId !== child.orgId) {
    return { error: "잘못된 학원 정보입니다." };
  }

  // 같은 자녀·기존정류장 조합 PENDING 중복 차단
  const existing = await db.stopChangeRequest.findFirst({
    where: {
      studentId: data.studentId,
      fromStopId: data.fromStopId,
      status: "PENDING",
    },
    select: { id: true },
  });
  if (existing) {
    return { error: "이미 처리 대기 중인 정류장 변경 요청이 있습니다." };
  }

  await db.stopChangeRequest.create({
    data: {
      orgId,
      studentId: data.studentId,
      fromStopId: data.fromStopId,
      toLat: data.toLat,
      toLng: data.toLng,
      toAddress: data.toAddress ?? null,
      reason: data.reason ?? null,
      effectiveAt: new Date(`${data.effectiveAt}T00:00:00.000Z`),
      createdBy: me.guardian.id,
    },
  });

  // OWNER push (OWNER 라우트 url로)
  await sendToOwnersOfOrg(orgId, {
    title: "새 정류장 변경 요청",
    body: `${child.name} · ${data.effectiveAt}부터 적용 요청`,
    url: "/stop-change-requests",
    category: "STOP_CHANGE_REQUESTED",
  }).catch((e) => console.warn("stop-change push failed:", e));

  revalidatePath("/my-stop-changes");
  revalidatePath("/home");
  redirect("/my-stop-changes");
}
