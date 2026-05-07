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

  // role 기반 redirect — Staff/Guardian 둘 다 lookup 병렬 (1 roundtrip).
  // (getCurrentUser는 react cache로 stale일 수 있어 직접 조회)
  const userId = signInData.user?.id;
  if (userId) {
    const [staff, guardian] = await Promise.all([
      db.staff.findFirst({
        where: { userId },
        include: { org: { select: { status: true, name: true } } },
      }),
      db.guardian.findFirst({
        where: { userId },
        include: {
          links: {
            include: {
              student: {
                select: {
                  org: { select: { status: true, name: true } },
                },
              },
            },
          },
        },
      }),
    ]);

    // W24: Staff는 본인 학원이 ACTIVE 아니면 차단 (사인아웃 + 한국어 안내).
    if (staff && staff.org.status !== "ACTIVE") {
      await supabase.auth.signOut();
      const reason =
        staff.org.status === "SUSPENDED"
          ? "현재 일시정지된 학원입니다. 셔틀이 운영팀에 문의해 주세요."
          : "체험판 기간이 종료되었습니다. 운영팀에 문의해 주세요.";
      return { error: reason };
    }
    // W24: 학부모는 자녀의 모든 학원이 비-ACTIVE이면 차단. 1곳이라도 활성이면 통과.
    if (guardian) {
      const orgStatuses = guardian.links.map((l) => l.student.org.status);
      const anyActive = orgStatuses.some((s) => s === "ACTIVE");
      if (orgStatuses.length > 0 && !anyActive) {
        await supabase.auth.signOut();
        return {
          error:
            "자녀의 학원이 모두 운영 정지 상태입니다. 학원·기관에 문의해 주세요.",
        };
      }
    }

    if (staff) redirect(homePathForRole(staff.role));
    if (guardian) redirect("/home");
  }
  redirect("/dashboard");
}

export async function logoutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
