"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createClient } from "@/lib/supabase/server";

const ForgotSchema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다"),
});

export type ForgotState = {
  error?: string;
  ok?: boolean;
};

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = ForgotSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요" };
  }

  const supabase = await createClient();

  // 현재 요청 host 기반으로 redirect URL 구성 (production·preview 모두 대응)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "shuttle2-nine.vercel.app";
  const redirectTo = `${proto}://${host}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    { redirectTo },
  );

  // 보안: 가입 여부와 무관하게 항상 성공 응답 (계정 enumeration 방지)
  if (error) {
    console.error("password reset email failed:", error);
    // error.message에 rate limit 등이 있을 수 있지만 사용자에는 동일 메시지
  }

  return { ok: true };
}
