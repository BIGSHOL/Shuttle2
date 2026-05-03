"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";

// 안전교육 이수 기록. 도교법상 운영자·기사·동승자는 2년마다 이수 의무.
// expiresOn은 입력값 그대로 (사용자가 "만료일 = 다음 의무 이수일"을 직접 지정).

const Input = z.object({
  staffId: z.string().min(1, "직원을 선택해 주세요"),
  category: z.enum(["OPERATOR", "DRIVER", "HELPER"]),
  completedOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "이수일이 올바르지 않습니다"),
  expiresOn: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "만료일이 올바르지 않습니다"),
  certificateUrl: z.string().url("URL 형식이 아닙니다").optional().or(z.literal("")),
});

export type TrainingFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createTrainingRecordAction(
  _prev: TrainingFormState,
  formData: FormData,
): Promise<TrainingFormState> {
  await requireOwner();
  const orgId = await getOrgId();

  const parsed = Input.safeParse({
    staffId: formData.get("staffId"),
    category: formData.get("category"),
    completedOn: formData.get("completedOn"),
    expiresOn: formData.get("expiresOn"),
    certificateUrl: formData.get("certificateUrl") || undefined,
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { staffId, category, completedOn, expiresOn, certificateUrl } = parsed.data;

  // staffId가 본 기관 소속인지 검증
  const staff = await db.staff.findFirst({
    where: { id: staffId, orgId },
    select: { id: true },
  });
  if (!staff) return { error: "다른 학원 직원입니다." };

  await db.trainingRecord.create({
    data: {
      staffId,
      category,
      completedOn: new Date(`${completedOn}T00:00:00.000Z`),
      expiresOn: new Date(`${expiresOn}T00:00:00.000Z`),
      certificateUrl: certificateUrl ? certificateUrl : null,
    },
  });

  revalidatePath("/training");
  revalidatePath("/dashboard");
  redirect("/training");
}

export async function deleteTrainingRecordAction(
  recordId: string,
): Promise<void> {
  await requireOwner();
  const orgId = await getOrgId();

  const result = await db.trainingRecord.deleteMany({
    where: { id: recordId, staff: { orgId } },
  });
  if (result.count === 0) {
    throw new Error("삭제할 수 없는 기록입니다");
  }

  revalidatePath("/training");
  revalidatePath("/dashboard");
}
