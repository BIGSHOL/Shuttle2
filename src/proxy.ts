import { type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

// Next.js 16: middleware.ts → proxy.ts 마이그레이션 (export function proxy).
// 기존 lib/supabase/middleware.ts는 Supabase SSR 헬퍼 파일이라 이름 유지.
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // _next/* 와 정적 자원은 proxy 건너뜀.
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
