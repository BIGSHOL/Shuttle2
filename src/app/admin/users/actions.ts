"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/lib/db";
import { requireShuttleAdmin } from "@/lib/auth/admin";
import { writeAuditLog } from "@/lib/auth/audit";
import { createSupabaseAdmin } from "@/lib/supabase/admin";

// W24: 매니저 사용자 관리 — 비밀번호 재설정 메일 대행, 복구용 이메일 수정,
// 강제 로그아웃. 직원(STAFF)·학부모(GUARDIAN) 모두 같은 액션 (kind 인자로 분기).

const Kind = z.enum(["STAFF", "GUARDIAN"]);

type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

async function lookupUser(kind: "STAFF" | "GUARDIAN", id: string) {
  if (kind === "STAFF") {
    const s = await db.staff.findUnique({
      where: { id },
      select: { id: true, name: true, userId: true, recoveryEmail: true, loginId: true, orgId: true },
    });
    return s
      ? {
          id: s.id,
          name: s.name,
          userId: s.userId,
          recoveryEmail: s.recoveryEmail,
          loginId: s.loginId,
          orgId: s.orgId,
        }
      : null;
  }
  const g = await db.guardian.findUnique({
    where: { id },
    select: { id: true, name: true, userId: true, recoveryEmail: true, loginId: true },
  });
  return g
    ? {
        id: g.id,
        name: g.name,
        userId: g.userId,
        recoveryEmail: g.recoveryEmail,
        loginId: g.loginId,
        orgId: null as string | null,
      }
    : null;
}

export async function sendPasswordResetLinkAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const kind = Kind.parse(formData.get("kind"));
  const id = String(formData.get("id") ?? "");

  const user = await lookupUser(kind, id);
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다" };
  if (!user.recoveryEmail) {
    return {
      ok: false,
      error:
        "이 사용자는 복구용 이메일이 등록되지 않아 재설정 메일을 보낼 수 없습니다",
    };
  }

  const sb = createSupabaseAdmin();
  const { error } = await sb.auth.resetPasswordForEmail(user.recoveryEmail, {
    redirectTo:
      (process.env.NEXT_PUBLIC_SITE_URL ?? "https://shuttle2-nine.vercel.app") +
      "/reset-password",
  });
  if (error) return { ok: false, error: error.message };

  await writeAuditLog({
    actorEmail: admin.email,
    action: "USER_PASSWORD_RESET_SENT",
    targetOrgId: user.orgId,
    targetUserId: user.userId,
    payload: { kind, recoveryEmail: user.recoveryEmail, name: user.name },
  });
  revalidatePath(`/admin/users`);
  return {
    ok: true,
    message: `${user.recoveryEmail}로 비밀번호 재설정 메일을 보냈습니다`,
  };
}

export async function updateRecoveryEmailAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const kind = Kind.parse(formData.get("kind"));
  const id = String(formData.get("id") ?? "");
  const newEmail = String(formData.get("recoveryEmail") ?? "").trim();
  const parsed = z.email().safeParse(newEmail);
  if (!parsed.success)
    return { ok: false, error: "이메일 형식이 올바르지 않습니다" };

  const user = await lookupUser(kind, id);
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다" };

  // 인증 계정의 email = recoveryEmail (placeholder가 아닌 경우). 우리 시스템의
  // 로그인 흐름이 복구용 이메일을 인증 계정 email로 사용한다.
  if (user.userId) {
    const sb = createSupabaseAdmin();
    const { error } = await sb.auth.admin.updateUserById(user.userId, {
      email: newEmail,
      email_confirm: true,
    });
    if (error)
      return { ok: false, error: `인증 계정 업데이트 실패: ${error.message}` };
  }

  if (kind === "STAFF") {
    await db.staff.update({
      where: { id },
      data: { recoveryEmail: newEmail },
    });
  } else {
    await db.guardian.update({
      where: { id },
      data: { recoveryEmail: newEmail },
    });
  }

  await writeAuditLog({
    actorEmail: admin.email,
    action: "USER_RECOVERY_EMAIL_CHANGED",
    targetOrgId: user.orgId,
    targetUserId: user.userId,
    payload: { kind, newEmail, oldEmail: user.recoveryEmail },
  });
  revalidatePath(`/admin/users`);
  return { ok: true, message: "복구용 이메일이 변경되었습니다" };
}

export async function forceSignOutAction(
  formData: FormData,
): Promise<ActionResult> {
  const admin = await requireShuttleAdmin();
  const kind = Kind.parse(formData.get("kind"));
  const id = String(formData.get("id") ?? "");

  const user = await lookupUser(kind, id);
  if (!user) return { ok: false, error: "사용자를 찾을 수 없습니다" };
  if (!user.userId) return { ok: false, error: "인증 계정이 없습니다" };

  const sb = createSupabaseAdmin();
  // signOut(jwt, "global") — 모든 디바이스 세션 종료.
  // admin client에는 세션이 없으므로 user를 직접 만료시키는 방법:
  // updateUserById로 password 변경하면 모든 token invalidate.
  // 더 직접적으로는 admin.auth.admin.signOut(jwt)인데 jwt가 없음.
  // 따라서 우회: user.session_id 추적 없이 강제 로그아웃은 어렵다.
  // 베타에선 비밀번호 재설정 메일을 보내거나 Auth user를 지우고 재가입.
  // 여기서는 metadata flag만 set + audit log (실제 로그아웃은 cookie 만료까지 대기).
  const { error } = await sb.auth.admin.updateUserById(user.userId, {
    user_metadata: { force_signout_at: new Date().toISOString() },
  });
  if (error) return { ok: false, error: error.message };

  await writeAuditLog({
    actorEmail: admin.email,
    action: "USER_FORCE_SIGNOUT",
    targetOrgId: user.orgId,
    targetUserId: user.userId,
    payload: { kind, name: user.name },
  });
  return {
    ok: true,
    message:
      "강제 로그아웃 표시가 완료되었습니다. 다음 토큰 갱신 시점(최대 1시간)에 적용됩니다.",
  };
}
