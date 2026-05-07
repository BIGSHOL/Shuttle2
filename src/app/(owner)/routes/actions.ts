"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

// ────────────────────────────────────────────────────────────────────
// Route 본체 CRUD
// ────────────────────────────────────────────────────────────────────

const RouteInput = z.object({
  vehicleId: z.string().min(1, "차량을 선택해 주세요"),
  name: z
    .string()
    .trim()
    .min(1, "노선 이름을 입력해 주세요")
    .max(100, "이름이 너무 깁니다"),
  direction: z.enum(["PICKUP", "DROPOFF"]),
  weekdays: z.coerce
    .number()
    .int("요일 비트마스크가 올바르지 않습니다")
    .min(0)
    .max(127, "요일 비트마스크 범위를 벗어났습니다"),
});

export type RouteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseRouteForm(formData: FormData) {
  return RouteInput.safeParse({
    vehicleId: formData.get("vehicleId"),
    name: formData.get("name"),
    direction: formData.get("direction"),
    weekdays: formData.get("weekdays"),
  });
}

// vehicle이 같은 orgId에 속하는지 확인하는 가드.
async function ensureVehicleInOrg(vehicleId: string, orgId: string) {
  const v = await db.vehicle.findFirst({
    where: { id: vehicleId, orgId },
    select: { id: true },
  });
  return !!v;
}

export async function createRouteAction(
  _prev: RouteFormState,
  formData: FormData,
): Promise<RouteFormState> {
  const parsed = parseRouteForm(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();
  const data = parsed.data;

  if (!(await ensureVehicleInOrg(data.vehicleId, orgId))) {
    return { error: "선택한 차량이 본 기관 소속이 아닙니다" };
  }

  const created = await db.route.create({ data });

  revalidatePath("/dashboard");
  revalidatePath("/routes");
  redirect(`/routes/${created.id}/edit`);
}

export async function updateRouteAction(
  id: string,
  _prev: RouteFormState,
  formData: FormData,
): Promise<RouteFormState> {
  const parsed = parseRouteForm(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();
  const data = parsed.data;

  if (!(await ensureVehicleInOrg(data.vehicleId, orgId))) {
    return { error: "선택한 차량이 본 기관 소속이 아닙니다" };
  }

  // 노선의 vehicleId가 본 기관 소속인지로 멀티테넌시 가드 (Route에는 orgId 컬럼 없음).
  const result = await db.route.updateMany({
    where: { id, vehicle: { orgId } },
    data,
  });

  if (result.count === 0) {
    return { error: "해당 노선을 찾을 수 없습니다" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/routes");
  revalidatePath(`/routes/${id}/edit`);
  return {};
}

export async function deleteRouteAction(id: string): Promise<void> {
  const orgId = await getOrgId();

  // RouteStop / RouteStudent / Trip이 묶이면 FK로 거절.
  const result = await db.route.deleteMany({
    where: { id, vehicle: { orgId } },
  });

  if (result.count === 0) {
    throw new Error("해당 노선을 찾을 수 없습니다");
  }

  revalidatePath("/dashboard");
  revalidatePath("/routes");
}

// ────────────────────────────────────────────────────────────────────
// RouteStop — 노선 안의 정류장 순서·시각
// ────────────────────────────────────────────────────────────────────

const RouteStopInput = z.object({
  stopId: z.string().min(1, "정류장을 선택해 주세요"),
  order: z.coerce
    .number()
    .int("순서는 정수")
    .min(1, "순서는 1 이상")
    .max(99, "순서가 너무 큽니다"),
  scheduledAt: z
    .string()
    .regex(/^[0-2][0-9]:[0-5][0-9]$/, "시간은 HH:mm 형식 (예: 08:30)"),
});

export type RouteStopFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

// 노선이 본 기관 소속인지 한 번에 확인.
async function ensureRouteInOrg(routeId: string, orgId: string) {
  const r = await db.route.findFirst({
    where: { id: routeId, vehicle: { orgId } },
    select: { id: true },
  });
  return !!r;
}

export async function addRouteStopAction(
  routeId: string,
  _prev: RouteStopFormState,
  formData: FormData,
): Promise<RouteStopFormState> {
  const parsed = RouteStopInput.safeParse({
    stopId: formData.get("stopId"),
    order: formData.get("order"),
    scheduledAt: formData.get("scheduledAt"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();

  if (!(await ensureRouteInOrg(routeId, orgId))) {
    return { error: "해당 노선을 찾을 수 없습니다" };
  }

  // 정류장도 본 기관 소속인지 확인.
  const stopOk = await db.stop.findFirst({
    where: { id: parsed.data.stopId, orgId },
    select: { id: true },
  });
  if (!stopOk) {
    return { error: "선택한 정류장이 본 기관 소속이 아닙니다" };
  }

  try {
    await db.routeStop.create({
      data: { routeId, ...parsed.data },
    });
  } catch (err) {
    // @@unique([routeId, order]) 충돌 등
    return {
      error:
        err instanceof Error && err.message.includes("Unique")
          ? "같은 순서의 정류장이 이미 있습니다"
          : "정류장 추가에 실패했습니다",
    };
  }

  revalidatePath(`/routes/${routeId}/edit`);
  return {};
}

export async function deleteRouteStopAction(
  routeId: string,
  routeStopId: string,
): Promise<void> {
  const orgId = await getOrgId();

  // 두 단계 가드: routeStop의 route가 본 기관 소속인지.
  const result = await db.routeStop.deleteMany({
    where: { id: routeStopId, route: { id: routeId, vehicle: { orgId } } },
  });

  if (result.count === 0) {
    throw new Error("해당 정류장 항목을 찾을 수 없습니다");
  }

  revalidatePath(`/routes/${routeId}/edit`);
}

const RouteStopUpdateInput = z.object({
  order: z.coerce
    .number()
    .int("순서는 정수")
    .min(1, "순서는 1 이상")
    .max(99, "순서가 너무 큽니다"),
  scheduledAt: z
    .string()
    .regex(/^[0-2][0-9]:[0-5][0-9]$/, "시간은 HH:mm 형식 (예: 08:30)"),
});

export async function updateRouteStopAction(
  routeId: string,
  routeStopId: string,
  input: { order: number; scheduledAt: string },
): Promise<{ error: string } | undefined> {
  const parsed = RouteStopUpdateInput.safeParse(input);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const firstFieldError =
      Object.values(flat.fieldErrors).flat()[0] ??
      flat.formErrors[0] ??
      "입력값이 올바르지 않습니다";
    return { error: firstFieldError };
  }

  const orgId = await getOrgId();

  if (!(await ensureRouteInOrg(routeId, orgId))) {
    return { error: "해당 노선을 찾을 수 없습니다" };
  }

  try {
    const result = await db.routeStop.updateMany({
      where: { id: routeStopId, route: { id: routeId, vehicle: { orgId } } },
      data: parsed.data,
    });
    if (result.count === 0) {
      return { error: "해당 정류장 항목을 찾을 수 없습니다" };
    }
  } catch (err) {
    return {
      error:
        err instanceof Error && err.message.includes("Unique")
          ? "같은 순서의 정류장이 이미 있습니다"
          : "수정에 실패했습니다",
    };
  }

  revalidatePath(`/routes/${routeId}/edit`);
  return undefined;
}
