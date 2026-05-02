"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const SignupSchema = z.object({
  orgName: z.string().trim().min(1, "기관명을 입력해 주세요").max(100),
  orgType: z.enum(["ACADEMY", "DAYCARE", "KINDERGARTEN"]),
  email: z.string().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(8, "비밀번호는 8자 이상").max(72),
});

export type SignupState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function signupAction(
  _prev: SignupState,
  formData: FormData,
): Promise<SignupState> {
  const parsed = SignupSchema.safeParse({
    orgName: formData.get("orgName"),
    orgType: formData.get("orgType"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { orgName, orgType, email, password } = parsed.data;

  // 1) Supabase Auth 사용자 생성 — admin createUser로 email_confirm: true 강제.
  //    이렇게 하면 Supabase 프로젝트의 "Confirm email" 설정이 켜져 있어도
  //    바로 로그인 가능한 상태가 됨 (1차 MVP 정책: 이메일 인증 생략).
  const admin = createSupabaseAdmin();
  const { data: createdData, error: createError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError || !createdData.user) {
    return {
      error: createError?.message ?? "가입 처리 중 오류가 발생했습니다",
    };
  }

  const userId = createdData.user.id;

  // 2) 세션 쿠키 수립 — 일반 client로 signInWithPassword 호출.
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // 로그인 실패는 곧 좀비 Auth 사용자 → cleanup
    await admin.auth.admin.deleteUser(userId).catch((cleanupErr) => {
      console.error("Failed to cleanup orphaned auth user:", cleanupErr);
    });
    return { error: "가입 직후 세션 수립에 실패했습니다. 다시 시도해 주세요" };
  }

  // 3) Organization + Staff(OWNER) 트랜잭션. 실패 시 Auth 사용자 cleanup.
  try {
    await db.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: orgName,
          type: orgType,
          plan: "TRIAL",
        },
      });

      await tx.staff.create({
        data: {
          orgId: org.id,
          userId,
          name: `${orgName} 학원장`, // 가입자가 나중에 프로필에서 수정 가능
          phone: "",
          role: "OWNER",
        },
      });
    });
  } catch (err) {
    console.error("Signup transaction failed:", err);
    // 좀비 Auth 사용자 방지 — admin으로 삭제 시도
    await admin.auth.admin.deleteUser(userId).catch((cleanupErr) => {
      console.error("Failed to cleanup orphaned auth user:", cleanupErr);
    });
    return {
      error: "기관 등록에 실패했습니다. 다시 시도해 주세요",
    };
  }

  // 세션 쿠키는 2)에서 이미 설정됨 → 곧장 dashboard로
  redirect("/dashboard");
}
