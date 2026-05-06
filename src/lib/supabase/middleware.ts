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
//
// W23: 기사용 RN 앱(사이드로드 APK)을 위해 Authorization Bearer 토큰 분기 추가.
// Bearer 토큰이 있으면 cookie 흐름을 우회해 토큰만으로 검증. 같은
// `x-auth-*` 헤더 inject 흐름을 그대로 재사용하므로 Route Handler·Server
// Component·Server Action은 cookie와 Bearer를 구분하지 않고 사용 가능.
// 그리고 `/api/*`는 PUBLIC_PATHS에 추가 — 미인증 시 /login redirect 대신
// Route Handler가 직접 401 JSON 응답을 줄 수 있도록.
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

  let userId: string | null = null;
  let email = "";

  // 2) W23: Authorization Bearer 토큰 우선 검사 (RN 앱·외부 클라이언트).
  //    토큰만으로 인증되면 cookie 흐름을 건너뜀. 검증 실패 시 cookie 폴백.
  const authHeader = request.headers.get("authorization");
  const bearerToken =
    authHeader && authHeader.toLowerCase().startsWith("bearer ")
      ? authHeader.slice(7).trim()
      : null;

  if (bearerToken) {
    const noCookieClient = createServerClient(
      env.NEXT_PUBLIC_SUPABASE_URL,
      env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      {
        cookies: {
          getAll: () => [],
          setAll: () => {},
        },
      },
    );
    const { data, error } = await noCookieClient.auth.getUser(bearerToken);
    if (!error && data.user) {
      userId = data.user.id;
      email = data.user.email ?? "";
    }
  }

  // 3) Bearer 없거나 검증 실패 시 cookie 흐름 (기존 W18-L 흐름 그대로)
  if (!userId) {
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

    // 세션 강제 갱신 — 만료된 토큰 invisible refresh + 사용자 식별
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      userId = user.id;
      email = user.email ?? "";
    }
  }

  // 4) B안: 검증된 사용자 정보를 request header에 inject. 서버 컴포넌트가 재사용.
  //    `x-auth-checked`는 middleware가 이 요청을 처리했음을 표시 (sentinel).
  //    이게 없으면 세션 헬퍼는 fallback으로 직접 getUser 호출.
  requestHeaders.set("x-auth-checked", "1");
  if (userId) {
    requestHeaders.set("x-auth-user-id", userId);
    if (email) requestHeaders.set("x-auth-user-email", email);
  }

  // 5) 보호 경로 화이트리스트 방식: public path만 명시하고 나머지 전부 보호.
  //    새 owner 라우트(/vehicles, /stops, /routes, ...)가 추가되어도 자동 가드.
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
    "/help", // W23+ 사용자 메뉴얼 (학원장·기사·학부모)
  ]);
  const isPublic =
    PUBLIC_PATHS.has(path) ||
    path.startsWith("/_next/") ||
    path.startsWith("/api/") || // W23: API Route Handler가 직접 인증 검증 — middleware redirect 우회
    path.startsWith("/help/") || // W23: /help/driver-app 등 sub-path도 public
    path.startsWith("/invite/") || // 직원 초대 토큰 가입 (W3-2)
    path.startsWith("/parent-invite/") || // 학부모 초대 토큰 가입 (W4-1)
    path.startsWith("/manual/") || // 메뉴얼 스크린샷 (public/manual)
    /\.(png|svg|ico|webmanifest|txt|woff2|woff|ttf|otf|eot)$/.test(path); // 정적 자원·폰트

  if (!isPublic && !userId) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", path);
    return NextResponse.redirect(url);
  }

  // 6) 최종 응답 — supabaseResponse는 cookie 변경 사항 누적된 상태.
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
