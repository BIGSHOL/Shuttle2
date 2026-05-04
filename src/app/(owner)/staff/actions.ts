"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import {
  authEmailForLogin,
  generateTempPassword,
  isValidLoginId,
  LOGIN_ID_REGEX,
} from "@/lib/auth/login-id";
import { getOrgId, homePathForRole, requireOwner } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// ────────────────────────────────────────────────────────────────────
// 초대 발급·회수
// ────────────────────────────────────────────────────────────────────

const InviteInput = z.object({
  name: z
    .string()
    .trim()
    .min(1, "이름을 입력해 주세요")
    .max(50, "이름이 너무 깁니다"),
  phone: z
    .string()
    .trim()
    .min(1, "전화번호를 입력해 주세요")
    .max(20, "전화번호가 너무 깁니다"),
  loginId: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      LOGIN_ID_REGEX,
      "로그인 아이디는 영문 소문자·숫자·_ 4~20자입니다",
    ),
  role: z.enum(["DRIVER", "HELPER"]), // OWNER 발급 거절
});

export type InviteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  // 발급된 초대 정보 — 발급 직후 한 번 표시
  newInvite?: {
    id: string;
    token: string;
  };
};

const INVITE_TTL_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export async function createInviteAction(
  _prev: InviteFormState,
  formData: FormData,
): Promise<InviteFormState> {
  const parsed = InviteInput.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    loginId: formData.get("loginId"),
    role: formData.get("role"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await requireOwner();
  const orgId = await getOrgId();

  // loginId 충돌 검사 — 같은 org든 다른 org든 unique 보장.
  const collision = await db.staff.findUnique({
    where: { loginId: parsed.data.loginId },
    select: { id: true },
  });
  if (collision) {
    return {
      error: "이미 사용 중인 로그인 아이디입니다",
      fieldErrors: { loginId: ["이미 사용 중인 로그인 아이디입니다"] },
    };
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);
  const token = generateToken();

  const created = await db.staffInvite.create({
    data: { orgId, ...parsed.data, token, expiresAt },
  });

  revalidatePath("/staff");
  return {
    newInvite: { id: created.id, token: created.token },
  };
}

export async function revokeInviteAction(id: string): Promise<void> {
  await requireOwner();
  const orgId = await getOrgId();

  // 미사용 초대만 삭제 — 이미 acceptedAt이면 거절 (이력 보존).
  const result = await db.staffInvite.deleteMany({
    where: { id, orgId, acceptedAt: null },
  });

  if (result.count === 0) {
    throw new Error("취소할 수 없는 초대입니다 (이미 사용되었거나 없음)");
  }

  revalidatePath("/staff");
}

// ────────────────────────────────────────────────────────────────────
// Staff 자체 편집·삭제 (owner 전용)
// ────────────────────────────────────────────────────────────────────

const StaffUpdateInput = z.object({
  name: z.string().trim().min(1).max(50),
  phone: z.string().trim().min(1).max(20),
});

export type StaffUpdateState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function updateStaffAction(
  id: string,
  _prev: StaffUpdateState,
  formData: FormData,
): Promise<StaffUpdateState> {
  const parsed = StaffUpdateInput.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const me = await requireOwner();
  const orgId = await getOrgId();

  // OWNER는 자기 자신만 수정 가능. 다른 OWNER 수정·승격·강등 차단.
  const target = await db.staff.findFirst({
    where: { id, orgId },
    select: { id: true, role: true },
  });
  if (!target) return { error: "해당 직원을 찾을 수 없습니다" };
  if (target.role === "OWNER" && id !== me.staff.id) {
    return { error: "다른 OWNER는 수정할 수 없습니다" };
  }

  await db.staff.update({
    where: { id },
    data: parsed.data,
  });

  revalidatePath("/staff");
  return {};
}

export async function deleteStaffAction(id: string): Promise<void> {
  const me = await requireOwner();
  const orgId = await getOrgId();

  // 자기 자신 삭제 차단
  if (id === me.staff.id) {
    throw new Error("본인 계정은 삭제할 수 없습니다");
  }

  // OWNER 삭제 차단 (W6+ 다중 OWNER 도입 후 별도 정책)
  const target = await db.staff.findFirst({
    where: { id, orgId },
    select: { role: true, userId: true },
  });
  if (!target) throw new Error("해당 직원을 찾을 수 없습니다");
  if (target.role === "OWNER") throw new Error("OWNER는 삭제할 수 없습니다");

  // FK: TrainingRecord, Trip(driver/helper). 묶여 있으면 throw.
  await db.staff.delete({ where: { id } });

  // Auth user도 같이 정리하면 깔끔하지만, 운행 기록이 userId 참조할 수 있어
  // 일단 staff 레코드만 끊고 auth user는 남김 (W6+ 정책 결정).

  revalidatePath("/staff");
}

// ────────────────────────────────────────────────────────────────────
// 초대 수락 (public, 토큰으로 진입)
// ────────────────────────────────────────────────────────────────────

// 초대 수락은 invite의 loginId를 그대로 사용. 가입자는 비밀번호 + (선택) 복구용 이메일.
// (이전 형식 — invite.loginId == null — 은 학원장에게 새 초대 요청 안내)
const AcceptInput = z.object({
  password: z.string().min(8, "비밀번호는 8자 이상").max(72),
  recoveryEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .transform((v) => (v && v.length > 0 ? v : undefined))
    .refine(
      (v) => v === undefined || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),
      "이메일 형식이 올바르지 않습니다",
    ),
});

export type AcceptInviteState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  success?: boolean;
  redirectTo?: string;
};

// invite 정보 조회 — public 페이지에서 미리 표시할 용도.
export async function getInviteByToken(token: string) {
  if (!token) return null;
  const invite = await db.staffInvite.findUnique({
    where: { token },
    include: {
      org: { select: { name: true, type: true } },
    },
  });
  if (!invite) return null;
  return invite;
}

export async function acceptInviteAction(
  token: string,
  _prev: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const parsed = AcceptInput.safeParse({
    password: formData.get("password"),
    recoveryEmail: formData.get("recoveryEmail"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 토큰 검증
  const invite = await db.staffInvite.findUnique({
    where: { token },
  });
  if (!invite) return { error: "유효하지 않은 초대 링크입니다" };
  if (invite.acceptedAt) return { error: "이미 사용된 초대입니다" };
  if (invite.expiresAt < new Date()) return { error: "만료된 초대입니다" };
  if (!invite.loginId || !isValidLoginId(invite.loginId)) {
    return {
      error:
        "이 초대 링크는 더 이상 사용할 수 없어요. 학원장님께 새 초대를 요청해 주세요.",
    };
  }

  // loginId 충돌 재검사 (발급 후 만료 사이에 다른 사용자가 같은 loginId로 가입했을 수 있음)
  const collision = await db.staff.findUnique({
    where: { loginId: invite.loginId },
    select: { id: true },
  });
  if (collision) {
    return {
      error:
        "이 로그인 아이디는 다른 사용자가 사용 중입니다. 학원장님께 새 초대를 요청해 주세요.",
    };
  }

  const recoveryEmail = parsed.data.recoveryEmail ?? null;
  const authEmail = authEmailForLogin(invite.loginId, recoveryEmail);
  const admin = createSupabaseAdmin();

  // 1) Auth 사용자 생성. recoveryEmail 입력 시 그 이메일이 Auth user.email
  //    → 본인이 /forgot-password에서 reset 메일 수신 가능.
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: authEmail,
      password: parsed.data.password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    if (createError?.message?.toLowerCase().includes("already")) {
      return {
        error:
          "이 이메일로는 이미 다른 계정이 있어요. 다른 비밀번호 찾기용 이메일을 입력해 주세요.",
        fieldErrors: { recoveryEmail: ["이미 사용 중인 이메일"] },
      };
    }
    return { error: createError?.message ?? "가입 처리 실패" };
  }
  const userId = created.user.id;

  // 2) 트랜잭션: Staff 생성 + Invite 표시
  try {
    await db.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          orgId: invite.orgId,
          userId,
          loginId: invite.loginId,
          recoveryEmail: recoveryEmail,
          name: invite.name,
          phone: invite.phone,
          role: invite.role,
        },
      });

      await tx.staffInvite.update({
        where: { id: invite.id },
        data: {
          acceptedAt: new Date(),
          acceptedByStaffId: staff.id,
        },
      });
    });
  } catch (err) {
    console.error("Accept invite failed:", err);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: "가입 처리 중 오류가 발생했습니다" };
  }

  // 3) 세션 수립 (가입자 본인의 cookies-aware client)
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: authEmail,
    password: parsed.data.password,
  });

  // role 기반 server-side redirect (NEXT_REDIRECT throw → 클라이언트가 자동 navigate).
  redirect(homePathForRole(invite.role));
}

// ────────────────────────────────────────────────────────────────────
// 학원장이 직원의 비밀번호 초기화 — admin API로 새 임시 비번 발급.
// 1회 표시 후 학원장이 카톡 등으로 직원에게 전달. DB 저장 X.
// ────────────────────────────────────────────────────────────────────

export type ResetStaffPasswordResult =
  | { ok: true; tempPassword: string; loginId: string }
  | { error: string };

export async function resetStaffPasswordAction(
  staffId: string,
): Promise<ResetStaffPasswordResult> {
  const me = await requireOwner();
  const orgId = await getOrgId();

  if (staffId === me.staff.id) {
    return { error: "본인 비밀번호는 /forgot-password에서 직접 재설정해 주세요" };
  }

  const target = await db.staff.findFirst({
    where: { id: staffId, orgId },
    select: { id: true, userId: true, loginId: true, role: true },
  });
  if (!target) return { error: "해당 직원을 찾을 수 없습니다" };
  if (target.role === "OWNER") {
    return { error: "다른 OWNER 비밀번호는 초기화할 수 없습니다" };
  }
  if (!target.userId) {
    return { error: "아직 가입을 완료하지 않은 직원입니다" };
  }
  if (!target.loginId) {
    return { error: "이전 형식 계정이라 초기화 불가. 신규 초대로 재발급해 주세요" };
  }

  const tempPassword = generateTempPassword(8);
  const admin = createSupabaseAdmin();
  const { error } = await admin.auth.admin.updateUserById(target.userId, {
    password: tempPassword,
  });
  if (error) {
    console.error("[staff] reset password failed:", error);
    return { error: "비밀번호 초기화에 실패했습니다" };
  }

  return { ok: true, tempPassword, loginId: target.loginId };
}
