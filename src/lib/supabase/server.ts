import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { env } from "@/lib/env";

// Server Component·Route Handler·Server Action에서 쓰는 Supabase 클라이언트.
// 매 호출마다 cookies() 새로 받아오기 — 같은 요청 안에서는 동일 세션을 유지하지만
// 모듈 싱글톤으로 공유하면 요청 간에 세션이 섞일 수 있음.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Component에서 호출되면 set이 실패할 수 있음. middleware가 갱신해줌.
          }
        },
      },
    },
  );
}
