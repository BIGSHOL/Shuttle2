"use server";

import { z } from "zod";

import { db } from "@/lib/db";

// 베타 사전등록 — 익명 사용자가 폼으로 제출. server action에서 Prisma로
// 직접 INSERT (service_role bypass). 이메일 unique로 1회만.
//
// 운영자가 후속 컨택할 수 있게 OWNER /pre-registrations에서 list 조회.

const Input = z.object({
  orgName: z.string().trim().min(1, "기관명을 입력해 주세요").max(100),
  orgType: z.enum(["ACADEMY", "DAYCARE", "KINDERGARTEN"]),
  contact: z.string().trim().min(1, "담당자 이름을 입력해 주세요").max(50),
  email: z.string().trim().email("이메일 형식이 올바르지 않습니다").max(120),
  phone: z.string().trim().min(1, "연락처를 입력해 주세요").max(30),
  region: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(500).optional(),
});

export type PreRegisterState = {
  ok?: true;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function preRegisterAction(
  _prev: PreRegisterState,
  formData: FormData,
): Promise<PreRegisterState> {
  const parsed = Input.safeParse({
    orgName: formData.get("orgName"),
    orgType: formData.get("orgType"),
    contact: formData.get("contact"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    region: formData.get("region") || undefined,
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) {
    return {
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  // 이메일 unique — 이미 신청된 경우 친절한 메시지
  const existing = await db.preRegistration.findUnique({
    where: { email: data.email },
    select: { id: true },
  });
  if (existing) {
    return { error: "이미 사전등록된 이메일입니다. 곧 연락드리겠습니다." };
  }

  await db.preRegistration.create({
    data: {
      orgName: data.orgName,
      orgType: data.orgType,
      contact: data.contact,
      email: data.email,
      phone: data.phone,
      region: data.region ?? null,
      notes: data.notes ?? null,
    },
  });

  return { ok: true };
}
