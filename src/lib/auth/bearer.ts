// Route Handler가 직접 Bearer 토큰을 검증할 때 사용하는 헬퍼.
//
// 일반적으로는 middleware(`src/lib/supabase/middleware.ts`)가 이미 Bearer
// 토큰을 검증해 `x-auth-*` 헤더에 inject하므로 Route Handler는 그냥
// `getCurrentUser()`(src/lib/auth/session.ts)를 호출하면 됨. 이 파일은
// middleware 우회 케이스(예: 일부 internal API, 디버깅 스크립트)에서
// 직접 토큰을 검증해야 할 때 사용.
//
// 반환:
// - 유효한 Bearer 토큰이면 { userId, email }
// - 헤더 없거나 형식 불일치 또는 검증 실패면 null

import "server-only";

import { createServerClient } from "@supabase/ssr";

import { env } from "@/lib/env";

export type BearerAuth = {
  userId: string;
  email: string;
};

export async function verifyBearerToken(
  request: Request,
): Promise<BearerAuth | null> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.toLowerCase().startsWith("bearer ")) {
    return null;
  }

  const token = authHeader.slice(7).trim();
  if (!token) return null;

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll: () => [],
        setAll: () => {},
      },
    },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;

  return {
    userId: data.user.id,
    email: data.user.email ?? "",
  };
}
