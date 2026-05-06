// Route Handler용 인증·권한 헬퍼.
//
// 사용 예:
//   const guard = await requireApiRole(["DRIVER"]);
//   if (!guard.ok) return guard.response;
//   const { user } = guard;
//
// middleware(`src/lib/supabase/middleware.ts`)가 cookie/Bearer 양쪽을 검증해
// `x-auth-*` 헤더에 inject하므로 Route Handler는 `getCurrentUser()` 호출만으로
// cookie와 Bearer를 구분 없이 동일하게 받음.

import "server-only";

import { NextResponse } from "next/server";

import type { StaffRole } from "@/generated/prisma/enums";
import { getCurrentUser, type CurrentUser } from "@/lib/auth/session";

type GuardOk = { ok: true; user: CurrentUser };
type GuardFail = { ok: false; response: NextResponse };
type GuardResult = GuardOk | GuardFail;

export async function requireApiRole(
  roles: ReadonlyArray<StaffRole>,
): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "UNAUTHENTICATED" },
        { status: 401 },
      ),
    };
  }
  if (!roles.includes(user.staff.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: "FORBIDDEN" }, { status: 403 }),
    };
  }
  return { ok: true, user };
}

// 비즈니스 함수가 throw한 에러를 400 JSON으로 변환.
// publishTripUpdate 등 fire-and-forget 실패는 함수 내부에서 swallow되므로
// 여기까지 오는 throw는 검증 실패·DB 충돌 등 사용자 실수 케이스가 대부분.
export function apiError(e: unknown, status = 400): NextResponse {
  const message = e instanceof Error ? e.message : "UNKNOWN_ERROR";
  return NextResponse.json({ error: message }, { status });
}
