import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

// Supabase PKCE 흐름 콜백.
// resetPasswordForEmail / signInWithOtp 등 server action에서 발급된 PKCE
// verifier는 httpOnly 쿠키로 저장되어 브라우저에서 읽을 수 없다 (@supabase/ssr 제약).
// 따라서 code → session 교환을 반드시 서버에서 수행한 뒤 next 경로로 리다이렉트.
//
// 사용 예: redirectTo = `${origin}/auth/callback?next=/reset-password`
//   → 메일 링크 클릭 → Supabase verify → /auth/callback?code=xxx&next=/reset-password
//   → 여기서 exchangeCodeForSession 후 /reset-password로 이동 (이미 인증된 상태)
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = url.searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error("auth/callback exchangeCodeForSession failed:", error);
      // 실패 시 reset-password 페이지의 expired 상태로 보냄
      return NextResponse.redirect(new URL("/reset-password", request.url));
    }
  }

  // next는 항상 내부 경로만 허용 (open redirect 방지)
  const safeNext = next.startsWith("/") ? next : "/";
  return NextResponse.redirect(new URL(safeNext, request.url));
}
