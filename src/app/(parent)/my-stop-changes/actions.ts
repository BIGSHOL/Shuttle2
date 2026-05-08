"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireGuardian } from "@/lib/auth/session";
import { sendToOwnersOfOrg } from "@/lib/push/server";

// W24-B C8: 학부모 정류장 변경 신청 — 같은 노선의 기존 stop만 선택 가능
// (자유 좌표 → 제약 picker 전환). 학원장이 새 정류장을 만들 일이 없어 운영
// 신뢰성 향상.
//
// 입력은 fromStopId(현재 stop) + toStopId(같은 노선 내 다른 stop). 검증:
// 두 stop이 같은 노선의 RouteStop이어야 함. requestedStopId에 toStopId를
// 채워 학원장 approve 시 새 Stop 생성 분기 회피.

const Input = z.object({
  studentId: z.string().min(1, "자녀를 선택해 주세요"),
  fromStopId: z.string().min(1, "기존 정류장을 선택해 주세요"),
  toStopId: z.string().min(1, "새 정류장을 선택해 주세요"),
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
    toStopId: formData.get("toStopId"),
    reason: formData.get("reason") || undefined,
    effectiveAt: formData.get("effectiveAt"),
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<
        string,
        string[]
      >,
    };
  }
  const data = parsed.data;

  if (data.fromStopId === data.toStopId) {
    return { error: "현재 정류장과 같은 정류장은 선택할 수 없어요." };
  }

  // 자녀 검증
  const child = me.students.find((s) => s.id === data.studentId);
  if (!child) return { error: "자녀가 아닙니다." };

  // 자녀가 그 fromStopId를 사용하는 RouteStudent 검색 + 같은 노선의 toStopId 검증
  const routeStudent = await db.routeStudent.findFirst({
    where: { studentId: data.studentId, stopId: data.fromStopId },
    select: {
      id: true,
      routeId: true,
      route: { select: { vehicle: { select: { orgId: true } } } },
    },
  });
  if (!routeStudent) {
    return { error: "선택한 자녀와 기존 정류장이 일치하지 않습니다." };
  }
  const orgId = routeStudent.route.vehicle.orgId;
  if (orgId !== child.orgId) {
    return { error: "잘못된 학원 정보입니다." };
  }

  // toStopId가 같은 노선의 RouteStop인지 검증 (제약 picker 핵심)
  const targetRouteStop = await db.routeStop.findFirst({
    where: { routeId: routeStudent.routeId, stopId: data.toStopId },
    include: {
      stop: { select: { id: true, lat: true, lng: true, address: true } },
    },
  });
  if (!targetRouteStop) {
    return {
      error: "선택한 새 정류장이 같은 노선에 없습니다. 다른 정류장을 선택해 주세요.",
    };
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
      // 선택한 stop의 좌표·주소를 호환 위해 채움(legacy 필드)
      toLat: targetRouteStop.stop.lat,
      toLng: targetRouteStop.stop.lng,
      toAddress: targetRouteStop.stop.address ?? null,
      // 핵심: 학원장 approve 분기용
      requestedStopId: targetRouteStop.stop.id,
      reason: data.reason ?? null,
      effectiveAt: new Date(`${data.effectiveAt}T00:00:00.000Z`),
      createdBy: me.guardian.id,
    },
  });

  // OWNER push
  await sendToOwnersOfOrg(orgId, {
    title: "새 정류장 변경 요청",
    body: `${child.name} · ${data.effectiveAt}부터 적용 요청`,
    url: "/pending",
    category: "STOP_CHANGE_REQUESTED",
  }).catch((e) => console.warn("stop-change push failed:", e));

  revalidatePath("/my-stop-changes");
  revalidatePath("/home");
  redirect("/my-stop-changes");
}
