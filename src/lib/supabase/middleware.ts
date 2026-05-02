import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

// 모든 요청 진입 시 호출되는 세션 갱신 미들웨어.
// (1) Supabase 세션 토큰을 갱신하고 (2) (owner) 라우트는 미인증이면 /login으로 보냄.
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 세션 강제 갱신 — 만료된 토큰을 invisible refresh
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 경로 화이트리스트 방식: public path만 명시하고 나머지 전부 보호.
  // 새 owner 라우트(/vehicles, /stops, /routes, ...)가 추가되어도 자동 가드.
  const path = request.nextUrl.pathname;
  const PUBLIC_PATHS = new Set(["/", "/login", "/signup"]);
  const isPublic =
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/_next/") ||
    path.startsWith("/invite/") || // 직원 초대 토큰 가입 (W3-2)
    path === "/favicon.ico";

  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
