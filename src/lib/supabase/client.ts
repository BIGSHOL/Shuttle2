"use client";

import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";

// Client Component에서 쓰는 Supabase 클라이언트.
// 쿠키는 브라우저가 알아서 처리.
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}
