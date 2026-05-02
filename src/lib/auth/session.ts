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

// React cache로 같은 요청 내 다중 호출을 1회 DB 쿼리로 합침.
// Server Component·Server Action·Route Handler 어디서 호출해도 동일 사용자 반환.
export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Staff + Organization을 한 쿼리로
  const staff = await db.staff.findFirst({
    where: { userId: user.id },
    include: { org: true },
  });

  if (!staff) return null;

  return {
    authUserId: user.id,
    email: user.email ?? "",
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

// 멀티테넌시 가드: 모든 도메인 쿼리 시 orgId 필터에 사용. 세션 없으면 throw.
export async function getOrgId(): Promise<string> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  return user.org.id;
}
