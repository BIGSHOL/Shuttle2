"use client";

import { createBrowserClient } from "@supabase/ssr";

// Client Component에서 쓰는 Supabase 클라이언트.
// 쿠키는 브라우저가 알아서 처리.
//
// 주의: lib/env.ts의 z 검증 proxy는 server-only 변수까지 모두 체크하므로
// browser에서 호출 시 throw됨. NEXT_PUBLIC_* 변수는 Next.js가 client 번들에
// 직접 inline하므로 process.env를 그대로 읽는 것이 안전.
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY가 빌드되지 않았습니다",
    );
  }
  return createBrowserClient(url, anon);
}
