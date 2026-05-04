"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/lib/db";
import { isLikelyEmail, isValidLoginId } from "@/lib/auth/login-id";
import { createClient } from "@/lib/supabase/server";

// 이메일 또는 로그인 아이디 어느 쪽이든 받음.
const ForgotSchema = z.object({
  identifier: z.string().trim().min(1, "이메일 또는 로그인 아이디를 입력해 주세요"),
});

export type ForgotState = {
  error?: string;
  ok?: boolean;
  /** 로그인 아이디로 조회됐으나 복구용 이메일이 등록 안 된 케이스 — 학원장 안내용 */
  needsAdminReset?: boolean;
};

export async function requestPasswordResetAction(
  _prev: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const parsed = ForgotSchema.safeParse({
    identifier: formData.get("identifier"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요" };
  }

  // 입력이 이메일이면 그대로, 로그인 아이디면 DB에서 recoveryEmail lookup.
  const identifier = parsed.data.identifier.toLowerCase();
  let email: string;
  if (isLikelyEmail(identifier)) {
    const emailParse = z.email().safeParse(identifier);
    if (!emailParse.success) {
      return { error: "이메일 형식이 올바르지 않습니다" };
    }
    email = emailParse.data;
  } else {
    if (!isValidLoginId(identifier)) {
      return {
        error: "이메일 또는 로그인 아이디를 정확히 입력해 주세요",
      };
    }
    const [staff, guardian] = await Promise.all([
      db.staff.findUnique({
        where: { loginId: identifier },
        select: { recoveryEmail: true },
      }),
      db.guardian.findUnique({
        where: { loginId: identifier },
        select: { recoveryEmail: true },
      }),
    ]);
    const recoveryEmail =
      staff?.recoveryEmail ?? guardian?.recoveryEmail ?? null;
    if (!staff && !guardian) {
      return { error: "가입된 로그인 아이디가 아닙니다" };
    }
    if (!recoveryEmail) {
      // 복구용 이메일 없음 → 학원장 admin 초기화 안내
      return { needsAdminReset: true };
    }
    email = recoveryEmail;
  }

  // 가입 여부 사전 확인 (사용자 요청: UX 우선).
  // 트레이드오프: 계정 enumeration 가능 — 베타 B2B 환경에서 수용.
  // auth.users는 Prisma 스키마 밖이라 raw query로 조회 (DIRECT_URL/service role bypass).
  const rows = await db.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS(SELECT 1 FROM auth.users WHERE lower(email) = ${email}) AS exists
  `;
  if (!rows[0]?.exists) {
    return {
      error:
        "가입되지 않은 이메일입니다. 가입하신 이메일을 다시 확인해 주세요.",
    };
  }

  const supabase = await createClient();

  // 현재 요청 host 기반으로 redirect URL 구성 (production·preview 모두 대응).
  // PKCE 흐름이라 /auth/callback에서 서버 측 code exchange 후 /reset-password로 이동.
  // (server action이 발급한 PKCE verifier는 httpOnly 쿠키라 브라우저가 못 읽음)
  const h = await headers();
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("host") ?? "shuttle2-nine.vercel.app";
  const redirectTo = `${proto}://${host}/auth/callback?next=/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    console.error("password reset email failed:", error);
    return {
      error:
        "메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요. (자주 시도하면 일시 차단될 수 있어요.)",
    };
  }

  return { ok: true };
}
