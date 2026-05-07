"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

// 멀티테넌시 가드: 모든 액션이 getOrgId()로 시작 → 다른 기관 데이터 절대 접근 불가.

const VehicleInput = z
  .object({
    plate: z
      .string()
      .trim()
      .min(1, "차량번호를 입력해 주세요")
      .max(20, "차량번호가 너무 깁니다"),
    mode: z.enum(["KIDS", "GENERAL"]),
    reportNo: z
      .string()
      .trim()
      .max(50)
      .optional()
      .transform((v) => (v ? v : undefined)),
    insuranceUntil: z
      .string()
      .optional()
      .transform((v) => (v ? v : undefined))
      .refine(
        (v) => {
          if (!v) return true;
          // YYYY-MM-DD 4자리 연도 + 2024~2099 범위. 브라우저 date input의
          // 큰 연도(예: 262026) 입력을 서버에서 차단.
          if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
          const year = Number(v.slice(0, 4));
          return year >= 2024 && year <= 2099;
        },
        "보험 만료일은 2024-01-01 ~ 2099-12-31 형식이어야 합니다",
      ),
  })
  .refine(
    (data) => {
      // KIDS 모드면 신고증명서 번호 + 보험 만료일 필수 (도로교통법 §52 의무)
      if (data.mode === "KIDS") {
        return !!data.reportNo && !!data.insuranceUntil;
      }
      return true;
    },
    {
      message:
        "어린이용 모드 차량은 어린이통학버스 신고증명서 번호와 보험 만료일이 필수입니다",
      path: ["mode"],
    },
  );

export type VehicleFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseFormData(formData: FormData) {
  return VehicleInput.safeParse({
    plate: formData.get("plate"),
    mode: formData.get("mode"),
    reportNo: formData.get("reportNo"),
    insuranceUntil: formData.get("insuranceUntil"),
  });
}

export async function createVehicleAction(
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();
  const data = parsed.data;

  await db.vehicle.create({
    data: {
      orgId,
      plate: data.plate,
      mode: data.mode,
      reportNo: data.reportNo,
      insuranceUntil: data.insuranceUntil
        ? new Date(data.insuranceUntil)
        : null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/vehicles");
  redirect("/vehicles");
}

export async function updateVehicleAction(
  id: string,
  _prev: VehicleFormState,
  formData: FormData,
): Promise<VehicleFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();
  const data = parsed.data;

  // updateMany + where {id, orgId} → 다른 기관 차량은 0 row 영향
  const result = await db.vehicle.updateMany({
    where: { id, orgId },
    data: {
      plate: data.plate,
      mode: data.mode,
      reportNo: data.reportNo ?? null,
      insuranceUntil: data.insuranceUntil
        ? new Date(data.insuranceUntil)
        : null,
    },
  });

  if (result.count === 0) {
    return { error: "해당 차량을 찾을 수 없습니다" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/vehicles");
  revalidatePath(`/vehicles/${id}/edit`);
  redirect("/vehicles");
}

export type DeleteVehicleResult =
  | { ok: true }
  | { ok: false; error: string };

export async function deleteVehicleAction(
  id: string,
): Promise<DeleteVehicleResult> {
  const orgId = await getOrgId();

  // 차량에 노선·운행이 묶여 있으면 schema relation 때문에 삭제 실패함.
  // 사용자에게 raw Prisma 메시지가 노출되지 않게 사전 체크로 한국어 메시지.
  const vehicle = await db.vehicle.findFirst({
    where: { id, orgId },
    select: { _count: { select: { routes: true, trips: true } } },
  });

  if (!vehicle) {
    return { ok: false, error: "해당 차량을 찾을 수 없습니다" };
  }

  const routeCount = vehicle._count.routes;
  const tripCount = vehicle._count.trips;

  if (routeCount > 0 || tripCount > 0) {
    const parts: string[] = [];
    if (routeCount > 0) parts.push(`노선 ${routeCount}개`);
    if (tripCount > 0) parts.push(`운행 기록 ${tripCount}건`);
    return {
      ok: false,
      error: `이 차량에 ${parts.join("·")}이(가) 묶여 있어 삭제할 수 없습니다. 먼저 해당 노선·운행 기록을 정리해 주세요.`,
    };
  }

  // race condition fallback — 사전 체크 후 다른 트랜잭션이 노선·운행 추가 시 P2003.
  try {
    await db.vehicle.delete({ where: { id } });
  } catch (err) {
    if (
      err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code: string }).code === "P2003"
    ) {
      return {
        ok: false,
        error: "이 차량에 묶인 노선·운행 기록이 있어 삭제할 수 없습니다.",
      };
    }
    throw err;
  }

  revalidatePath("/dashboard");
  revalidatePath("/vehicles");
  return { ok: true };
}
