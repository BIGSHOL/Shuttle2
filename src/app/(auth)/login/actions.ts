"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  authEmailForLogin,
  isLikelyEmail,
  isValidLoginId,
} from "@/lib/auth/login-id";
import { homePathForRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// 이메일 또는 로그인 아이디(loginId) 어느 쪽이든 받음.
const LoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "이메일 또는 로그인 아이디를 입력해 주세요"),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    identifier: formData.get("identifier"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요",
    };
  }

  // identifier가 이메일이면 그대로, 로그인 아이디면 DB lookup으로 실제 Auth email 매핑.
  // (가입 시 recoveryEmail 입력자는 user.email = recoveryEmail, 미입력자는 placeholder)
  const { identifier, password } = parsed.data;
  let email: string;
  if (isLikelyEmail(identifier)) {
    const emailParse = z.email().safeParse(identifier);
    if (!emailParse.success) {
      return { error: "이메일 형식이 올바르지 않습니다" };
    }
    email = emailParse.data;
  } else {
    const normalized = identifier.toLowerCase();
    if (!isValidLoginId(normalized)) {
      return {
        error: "로그인 아이디는 영문 소문자·숫자·언더스코어 4~20자입니다",
      };
    }
    // Staff·Guardian 양쪽 다 lookup. 한쪽이 hit하면 그쪽의 recoveryEmail로 매핑.
    const [staff, guardian] = await Promise.all([
      db.staff.findUnique({
        where: { loginId: normalized },
        select: { recoveryEmail: true },
      }),
      db.guardian.findUnique({
        where: { loginId: normalized },
        select: { recoveryEmail: true },
      }),
    ]);
    const recoveryEmail = staff?.recoveryEmail ?? guardian?.recoveryEmail ?? null;
    email = authEmailForLogin(normalized, recoveryEmail);
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: "아이디 또는 비밀번호가 올바르지 않습니다" };
  }

  // redirectTo가 명시되어 있으면 그대로, 아니면 role 기반 home으로.
  const redirectTo = formData.get("redirectTo");
  if (typeof redirectTo === "string" && redirectTo.startsWith("/")) {
    redirect(redirectTo);
  }

  // role 기반 redirect — Staff 직접 조회 (getCurrentUser는 react cache로 stale일 수 있음).
  const userId = signInData.user?.id;
  if (userId) {
    const staff = await db.staff.findFirst({
      where: { userId },
      select: { role: true },
    });
    if (staff) redirect(homePathForRole(staff.role));

    // Staff가 없으면 Guardian (학부모) 시도
    const guardian = await db.guardian.findFirst({
      where: { userId },
      select: { id: true },
    });
    if (guardian) redirect("/home");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
