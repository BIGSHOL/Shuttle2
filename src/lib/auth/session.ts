import { headers } from "next/headers";
import { cache } from "react";

import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { OrgType, StaffRole } from "@/generated/prisma/enums";

export type CurrentUser = {
  authUserId: string;
  email: string;
  staff: {
    id: string;
    name: string;
    role: StaffRole;
  };
  org: {
    id: string;
    name: string;
    type: OrgType;
  };
};

// W18-L (B안): middleware가 supabase.auth.getUser()를 이미 호출하고 결과를
// `x-auth-*` request header에 inject. 이 헬퍼는 그 header를 우선 read.
// `x-auth-checked` sentinel이 없는 경우(미들웨어 미통과 or build/static gen)는
// fallback으로 직접 getUser 호출.
async function resolveAuthUser(): Promise<{
  userId: string | null;
  email: string;
}> {
  let userId: string | null = null;
  let email = "";
  let middlewareChecked = false;

  try {
    const h = await headers();
    if (h.get("x-auth-checked") === "1") {
      middlewareChecked = true;
      userId = h.get("x-auth-user-id") || null;
      email = h.get("x-auth-user-email") || "";
    }
  } catch {
    // headers() throws when not in request scope (e.g., during static page build).
  }

  if (!middlewareChecked) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      email = user.email ?? "";
    }
  }

  return { userId, email };
}

// React cache로 같은 요청 내 다중 호출을 1회 DB 쿼리로 합침.
// Server Component·Server Action·Route Handler 어디서 호출해도 동일 사용자 반환.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const { userId, email } = await resolveAuthUser();
  if (!userId) return null;

  // Staff + Organization을 한 쿼리로
  const staff = await db.staff.findFirst({
    where: { userId },
    include: { org: true },
  });

  if (!staff) return null;

  return {
    authUserId: userId,
    email,
    staff: {
      id: staff.id,
      name: staff.name,
      role: staff.role,
    },
    org: {
      id: staff.org.id,
      name: staff.org.name,
      type: staff.org.type,
    },
  };
});

// (owner) 라우트 진입 시 호출. role !== OWNER이면 throw → Next.js 에러 페이지.
export async function requireOwner(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  if (user.staff.role !== "OWNER") {
    throw new Error("FORBIDDEN: OWNER role required");
  }
  return user;
}

// (driver) 라우트 진입 시 호출.
export async function requireDriver(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.staff.role !== "DRIVER") {
    throw new Error("FORBIDDEN: DRIVER role required");
  }
  return user;
}

// (helper) 라우트 진입 시 호출.
export async function requireHelper(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.staff.role !== "HELPER") {
    throw new Error("FORBIDDEN: HELPER role required");
  }
  return user;
}

// driver 또는 helper 진입 시 (공용 운행 화면).
export async function requireDriverOrHelper(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHENTICATED");
  if (user.staff.role !== "DRIVER" && user.staff.role !== "HELPER") {
    throw new Error("FORBIDDEN: DRIVER or HELPER required");
  }
  return user;
}

// 로그인·가입 직후 어디로 보낼지 결정 — 역할별 1차 화면.
export function homePathForRole(role: StaffRole): string {
  if (role === "DRIVER") return "/run";
  if (role === "HELPER") return "/helper-run";
  return "/dashboard";
}

// 멀티테넌시 가드: 모든 도메인 쿼리 시 orgId 필터에 사용. 세션 없으면 throw.
export async function getOrgId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user.org.id;
}

// ────────────────────────────────────────────────────────────────────
// Guardian (학부모) — Staff와 별개 모델이라 별도 헬퍼.
// Guardian은 orgId 없음 → 한 학부모가 여러 학원에 자녀 있을 수 있음.
// ────────────────────────────────────────────────────────────────────

export type CurrentGuardian = {
  authUserId: string;
  email: string;
  guardian: { id: string; name: string; phone: string };
  students: { id: string; name: string; orgId: string }[];
};

export const getCurrentGuardian = cache(
  async (): Promise<CurrentGuardian | null> => {
    const { userId, email } = await resolveAuthUser();
    if (!userId) return null;

    const guardian = await db.guardian.findFirst({
      where: { userId },
      include: {
        links: {
          include: {
            student: { select: { id: true, name: true, orgId: true } },
          },
        },
      },
    });
    if (!guardian) return null;

    return {
      authUserId: userId,
      email,
      guardian: {
        id: guardian.id,
        name: guardian.name,
        phone: guardian.phone,
      },
      students: guardian.links.map((l) => l.student),
    };
  },
);

export async function requireGuardian(): Promise<CurrentGuardian> {
  const g = await getCurrentGuardian();
  if (!g) throw new Error("UNAUTHENTICATED: GUARDIAN required");
  return g;
}

export const HOME_PATH_GUARDIAN = "/home";
