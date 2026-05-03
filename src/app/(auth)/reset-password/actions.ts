"use server";

import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const ResetSchema = z.object({
  password: z.string().min(8, "비밀번호는 8자 이상이어야 합니다"),
});

export type ResetState = {
  error?: string;
  ok?: boolean;
};

// Supabase 비밀번호 재설정: 이메일 link로 들어온 사용자 세션이 이미
// 클라이언트 측에서 setSession으로 수립된 후에 이 액션이 호출됨.
// updateUser는 현재 세션의 비밀번호를 갱신.
export async function resetPasswordAction(
  _prev: ResetState,
  formData: FormData,
): Promise<ResetState> {
  const parsed = ResetSchema.safeParse({
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "재설정 세션이 유효하지 않아요. 비밀번호 찾기를 다시 시도해 주세요.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: error.message ?? "비밀번호 변경에 실패했어요" };
  }

  return { ok: true };
}
