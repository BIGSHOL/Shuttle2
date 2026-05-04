import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/env";

// 모든 요청 진입 시 호출되는 세션 갱신 미들웨어.
// (1) Supabase 세션 토큰을 갱신하고 (2) (owner) 라우트는 미인증이면 /login으로 보냄.
//
// W18-L (B안): getUser 결과를 request header에 inject하여 서버 컴포넌트의
// `getCurrentUser()` / `getCurrentGuardian()`이 supabase.auth.getUser()를 다시
// 호출하지 않도록 함. 매 nav 50~200ms 단축. middleware 외부에서 들어온
// `x-auth-*` 헤더는 strip하여 위조 차단.
export async function updateSession(request: NextRequest) {
  // 1) 클라이언트 위조 방지 — 진입 시점에 x-auth-* 헤더 strip.
  //    이후 middleware가 검증한 값으로만 다시 set.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete("x-auth-user-id");
  requestHeaders.delete("x-auth-user-email");
  requestHeaders.delete("x-auth-checked");

  const supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });

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
          // setAll은 cookie만 갱신 — 응답 객체는 재생성하지 않음. 그래야 아래에서
          // requestHeaders 업데이트한 결과가 finalResponse에 반영됨.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // 2) 세션 강제 갱신 — 만료된 토큰 invisible refresh + 사용자 식별
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 3) B안: 검증된 사용자 정보를 request header에 inject. 서버 컴포넌트가 재사용.
  //    `x-auth-checked`는 middleware가 이 요청을 처리했음을 표시 (sentinel).
  //    이게 없으면 세션 헬퍼는 fallback으로 직접 getUser 호출.
  requestHeaders.set("x-auth-checked", "1");
  if (user) {
    requestHeaders.set("x-auth-user-id", user.id);
    if (user.email) requestHeaders.set("x-auth-user-email", user.email);
  }

  // 보호 경로 화이트리스트 방식: public path만 명시하고 나머지 전부 보호.
  // 새 owner 라우트(/vehicles, /stops, /routes, ...)가 추가되어도 자동 가드.
  const path = request.nextUrl.pathname;
  const PUBLIC_PATHS = new Set([
    "/",
    "/login",
    "/signup",
    "/forgot-password", // W15-D 비밀번호 재설정 요청
    "/reset-password", // W15-D 비밀번호 재설정 (이메일 link 도착)
    "/auth/callback", // PKCE code exchange (resetPasswordForEmail 등)
    "/pricing", // W13 마케팅 페이지
    "/terms", // W15-C 이용약관
    "/privacy", // W15-C 개인정보처리방침
    "/manifest.json", // PWA manifest (W4-3)
    "/sw.js", // service worker (W4-3)
    "/favicon.ico",
  ]);
  const isPublic =
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/_next/") ||
    path.startsWith("/invite/") || // 직원 초대 토큰 가입 (W3-2)
    path.startsWith("/parent-invite/") || // 학부모 초대 토큰 가입 (W4-1)
    /\.(png|svg|ico|webmanifest|txt|woff2|woff|ttf|otf|eot)$/.test(path); // 정적 자원·폰트

  if (!isPublic && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // 4) 최종 응답 — supabaseResponse는 cookie 변경 사항 누적된 상태.
  //    그러나 위에서 requestHeaders를 수정한 직후라 forwarded request에 반영되도록
  //    응답 재생성 + 쿠키 복사.
  const finalResponse = NextResponse.next({
    request: { headers: requestHeaders },
  });
  supabaseResponse.cookies.getAll().forEach((c) => {
    finalResponse.cookies.set(c);
  });

  return finalResponse;
}
