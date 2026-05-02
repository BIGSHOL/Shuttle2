"use server";

import { randomBytes } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/lib/db";
import { getOrgId, requireOwner } from "@/lib/auth/session";
import { createSupabaseAdmin } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const INVITE_TTL_DAYS = 7;

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

// ────────────────────────────────────────────────────────────────────
// 발급·회수
// ────────────────────────────────────────────────────────────────────

const InviteInput = z.object({
  name: z.string().trim().min(1, "이름을 입력해 주세요").max(50),
  phone: z.string().trim().min(1, "전화번호를 입력해 주세요").max(20),
  relation: z
    .string()
    .trim()
    .min(1, "관계를 입력해 주세요 (예: 모·부·조부)")
    .max(20),
  isPrimary: z.boolean().default(false),
  studentIds: z
    .array(z.string().min(1))
    .min(1, "자녀를 1명 이상 선택해 주세요"),
});

export type GuardianInviteFormState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
  newInvite?: { id: string; token: string };
};

export async function createGuardianInviteAction(
  _prev: GuardianInviteFormState,
  formData: FormData,
): Promise<GuardianInviteFormState> {
  const parsed = InviteInput.safeParse({
    name: formData.get("name"),
    phone: formData.get("phone"),
    relation: formData.get("relation"),
    isPrimary: formData.get("isPrimary") === "on",
    studentIds: formData.getAll("studentIds").filter(
      (v): v is string => typeof v === "string",
    ),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  await requireOwner();
  const orgId = await getOrgId();
  const data = parsed.data;

  // 학생들이 모두 본 기관 소속인지
  const validStudents = await db.student.findMany({
    where: { id: { in: data.studentIds }, orgId },
    select: { id: true },
  });
  if (validStudents.length !== data.studentIds.length) {
    return { error: "선택한 자녀 중 본 기관 소속이 아닌 학생이 있습니다" };
  }

  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 24 * 3600 * 1000);
  const token = generateToken();

  const invite = await db.guardianInvite.create({
    data: {
      orgId,
      name: data.name,
      phone: data.phone,
      relation: data.relation,
      isPrimary: data.isPrimary,
      token,
      expiresAt,
      students: {
        create: data.studentIds.map((sid) => ({ studentId: sid })),
      },
    },
  });

  revalidatePath("/guardians");
  return { newInvite: { id: invite.id, token: invite.token } };
}

export async function revokeGuardianInviteAction(id: string): Promise<void> {
  await requireOwner();
  const orgId = await getOrgId();

  const result = await db.guardianInvite.deleteMany({
    where: { id, orgId, acceptedAt: null },
  });

  if (result.count === 0) {
    throw new Error("취소할 수 없는 초대입니다 (이미 사용되었거나 없음)");
  }

  revalidatePath("/guardians");
}

// ────────────────────────────────────────────────────────────────────
// GuardianLink 해제 — 보호자-자녀 연결 끊기
// 학부모 계정(Guardian) 자체는 삭제하지 않고 link만 끊는다 (다른 학원 자녀가
// 있을 수 있으므로). orgId 검증을 위해 student.orgId로 필터.
// ────────────────────────────────────────────────────────────────────
export async function unlinkGuardianLinkAction(linkId: string): Promise<void> {
  await requireOwner();
  const orgId = await getOrgId();

  const result = await db.guardianLink.deleteMany({
    where: { id: linkId, student: { orgId } },
  });
  if (result.count === 0) {
    throw new Error("해제할 수 없는 연결입니다 (다른 학원이거나 없음)");
  }

  revalidatePath("/guardians");
}

// ────────────────────────────────────────────────────────────────────
// public — 토큰 미리보기 + 가입
// ────────────────────────────────────────────────────────────────────

export async function getGuardianInviteByToken(token: string) {
  if (!token) return null;
  return db.guardianInvite.findUnique({
    where: { token },
    include: {
      org: { select: { name: true, type: true } },
      students: {
        include: { student: { select: { id: true, name: true } } },
      },
    },
  });
}

const AcceptInput = z.object({
  email: z.string().email("이메일 형식이 올바르지 않습니다"),
  password: z.string().min(8, "비밀번호는 8자 이상").max(72),
  consentMinor: z
    .string()
    .refine((v) => v === "on", "자녀 정보 처리 동의가 필요합니다"),
});

export type AcceptGuardianInviteState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function acceptGuardianInviteAction(
  token: string,
  _prev: AcceptGuardianInviteState,
  formData: FormData,
): Promise<AcceptGuardianInviteState> {
  const parsed = AcceptInput.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    consentMinor: formData.get("consentMinor"),
  });
  if (!parsed.success) {
    return {
      error: "입력값을 확인해 주세요",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  // 토큰 검증
  const invite = await db.guardianInvite.findUnique({
    where: { token },
    include: { students: true },
  });
  if (!invite) return { error: "유효하지 않은 초대 링크입니다" };
  if (invite.acceptedAt) return { error: "이미 사용된 초대입니다" };
  if (invite.expiresAt < new Date()) return { error: "만료된 초대입니다" };

  const admin = createSupabaseAdmin();

  // 기존 Guardian (phone unique) 조회 — 이미 가입된 학부모면 거절
  const existingByPhone = await db.guardian.findUnique({
    where: { phone: invite.phone },
    select: { id: true, userId: true },
  });
  if (existingByPhone?.userId) {
    return {
      error: "이미 가입된 전화번호입니다. 기존 계정으로 로그인하세요.",
    };
  }

  // 1) Auth 사용자 생성
  const { data: created, error: createError } =
    await admin.auth.admin.createUser({
      email: parsed.data.email,
      password: parsed.data.password,
      email_confirm: true,
    });
  if (createError || !created.user) {
    return { error: createError?.message ?? "가입 처리 실패" };
  }
  const userId = created.user.id;

  // 2) Guardian upsert + GuardianLink N건 + invite 표시 (트랜잭션)
  try {
    await db.$transaction(async (tx) => {
      const guardian = existingByPhone
        ? await tx.guardian.update({
            where: { id: existingByPhone.id },
            data: { userId, name: invite.name },
          })
        : await tx.guardian.create({
            data: {
              userId,
              name: invite.name,
              phone: invite.phone,
            },
          });

      // GuardianLink upsert (이미 같은 student-guardian 쌍이 있으면 skip)
      for (const s of invite.students) {
        const existing = await tx.guardianLink.findUnique({
          where: {
            studentId_guardianId: {
              studentId: s.studentId,
              guardianId: guardian.id,
            },
          },
        });
        if (!existing) {
          await tx.guardianLink.create({
            data: {
              studentId: s.studentId,
              guardianId: guardian.id,
              relation: invite.relation,
              isPrimary: invite.isPrimary,
            },
          });
        }
      }

      await tx.guardianInvite.update({
        where: { id: invite.id },
        data: { acceptedAt: new Date(), acceptedByGuardianId: guardian.id },
      });
    });
  } catch (err) {
    console.error("Accept guardian invite failed:", err);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return { error: "가입 처리 중 오류가 발생했습니다" };
  }

  // 3) 세션 수립
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  redirect("/home");
}
