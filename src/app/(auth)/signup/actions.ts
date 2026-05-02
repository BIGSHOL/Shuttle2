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

  // 1) Supabase Auth 사용자 생성
  const supabase = await createClient();
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError || !authData.user) {
    return { error: authError?.message ?? "가입 처리 중 오류가 발생했습니다" };
  }

  const userId = authData.user.id;

  // 2) Organization + Staff(OWNER) 트랜잭션. 실패 시 Auth 사용자 cleanup.
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
    const admin = createSupabaseAdmin();
    await admin.auth.admin.deleteUser(userId).catch((cleanupErr) => {
      console.error("Failed to cleanup orphaned auth user:", cleanupErr);
    });
    return {
      error: "기관 등록에 실패했습니다. 다시 시도해 주세요",
    };
  }

  // signUp이 세션 쿠키를 설정해줬으니 곧장 dashboard로
  redirect("/dashboard");
}
