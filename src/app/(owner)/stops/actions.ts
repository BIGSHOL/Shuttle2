"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId } from "@/lib/auth/session";

const StopInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "정류장 이름을 입력해 주세요")
    .max(100, "이름이 너무 깁니다"),
  lat: z.coerce
    .number()
    .min(-90, "위도가 올바르지 않습니다")
    .max(90, "위도가 올바르지 않습니다"),
  lng: z.coerce
    .number()
    .min(-180, "경도가 올바르지 않습니다")
    .max(180, "경도가 올바르지 않습니다"),
  radiusM: z.coerce
    .number()
    .int("반경은 정수로 입력해 주세요")
    .min(10, "반경은 10m 이상")
    .max(500, "반경은 500m 이하")
    .default(50),
  // 카카오 reverse geocoding 결과를 client에서 hidden input으로 함께 전달.
  // 빈 문자열은 null로 정규화 (API 응답이 좌표 외 지역인 경우).
  address: z
    .string()
    .max(200)
    .optional()
    .transform((v) => (v && v.length > 0 ? v : null)),
});

export type StopFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function parseFormData(formData: FormData) {
  return StopInput.safeParse({
    name: formData.get("name"),
    lat: formData.get("lat"),
    lng: formData.get("lng"),
    radiusM: formData.get("radiusM"),
    address: formData.get("address"),
  });
}

export async function createStopAction(
  _prev: StopFormState,
  formData: FormData,
): Promise<StopFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();

  await db.stop.create({
    data: { orgId, ...parsed.data },
  });

  revalidatePath("/dashboard");
  revalidatePath("/stops");
  redirect("/stops");
}

export async function updateStopAction(
  id: string,
  _prev: StopFormState,
  formData: FormData,
): Promise<StopFormState> {
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const orgId = await getOrgId();

  const result = await db.stop.updateMany({
    where: { id, orgId },
    data: parsed.data,
  });

  if (result.count === 0) {
    return { error: "해당 정류장을 찾을 수 없습니다" };
  }

  revalidatePath("/dashboard");
  revalidatePath("/stops");
  revalidatePath(`/stops/${id}/edit`);
  redirect("/stops");
}

// W26-E: 정류장 사용/미사용 빠른 토글. RouteStop·RouteStudent 매핑은 유지.
export async function toggleStopActiveAction(
  id: string,
  nextActive: boolean,
): Promise<void> {
  const orgId = await getOrgId();

  const result = await db.stop.updateMany({
    where: { id, orgId },
    data: { isActive: nextActive },
  });

  if (result.count === 0) {
    throw new Error("해당 정류장을 찾을 수 없습니다");
  }

  revalidatePath("/dashboard");
  revalidatePath("/stops");
  revalidatePath(`/stops/${id}`);
  revalidatePath(`/stops/${id}/edit`);
}

export async function deleteStopAction(id: string): Promise<void> {
  const orgId = await getOrgId();

  // 노선/학생 배정에 묶인 정류장은 FK로 막힘. W2-3에서 cascade 정책 다시.
  const result = await db.stop.deleteMany({
    where: { id, orgId },
  });

  if (result.count === 0) {
    throw new Error("해당 정류장을 찾을 수 없습니다");
  }

  revalidatePath("/dashboard");
  revalidatePath("/stops");
}
