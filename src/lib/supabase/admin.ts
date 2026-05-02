import "server-only";

import { createClient as createAdminClient } from "@supabase/supabase-js";

import { env } from "@/lib/env";

// Service Role Key로 만드는 관리자 권한 클라이언트.
// 절대 클라이언트 번들에 포함되면 안 됨 — "server-only" import로 바리어.
// 가입 트랜잭션에서 Auth 사용자 cleanup 같은 admin 동작에만 사용.
export function createSupabaseAdmin() {
  return createAdminClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
