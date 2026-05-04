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
      .transform((v) => (v ? v : undefined)),
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
        "KIDS 모드 차량은 어린이통학버스 신고증명서 번호와 보험 만료일이 필수입니다",
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

export async function deleteVehicleAction(id: string): Promise<void> {
  const orgId = await getOrgId();

  // 차량에 노선·운행이 묶여 있으면 schema relation 때문에 실패함.
  // W2-3에서 cascade 정책 다시 검토.
  const result = await db.vehicle.deleteMany({
    where: { id, orgId },
  });

  if (result.count === 0) {
    throw new Error("해당 차량을 찾을 수 없습니다");
  }

  revalidatePath("/dashboard");
  revalidatePath("/vehicles");
}
