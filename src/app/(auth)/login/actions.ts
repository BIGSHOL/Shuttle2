"use server";

import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { homePathForRole } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

const LoginSchema = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(1, "비밀번호를 입력해 주세요"),
});

export type LoginState = { error?: string };

export async function loginAction(
  _prev: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "입력값을 확인해 주세요",
    };
  }

  const supabase = await createClient();
  const { data: signInData, error } = await supabase.auth.signInWithPassword(
    parsed.data,
  );

  if (error) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다" };
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
