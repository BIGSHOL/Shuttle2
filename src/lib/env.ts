import "server-only";

import { z } from "zod";

// 이 파일은 server-only. client에서 import 시도하면 Next.js가 빌드 시점에
// 차단함 (server-only 패키지의 React Server Components 가드).
//
// CLIENT 컴포넌트("use client")에서 NEXT_PUBLIC_* 변수가 필요하면:
//   const key = process.env.NEXT_PUBLIC_FOO ?? "";
//
// process.env.NEXT_PUBLIC_*은 Next.js가 빌드 타임에 client 번들로 inline.
// envSchema에는 SUPABASE_SERVICE_ROLE_KEY 같은 server-only 변수가 섞여 있어
// client에서 env Proxy 호출 시 zod parse 실패 → "Invalid environment variables".
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_KAKAO_MAP_KEY: z.string().min(1),
  KAKAO_REST_API_KEY: z.string().optional(), // 길찾기 ETA용 (W6-2)
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
});

type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

// Lazy 검증: 빌드 타임에 import만 해도 안 깨지게.
// 첫 호출 시 process.env 파싱 → 잘못됐으면 throw (런타임/콜 시점).
function loadEnv(): Env {
  if (cached) return cached;

  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    console.error(
      "❌ Invalid environment variables:",
      parsed.error.flatten().fieldErrors,
    );
    throw new Error(
      "Invalid environment variables — .env.local 채워졌는지 확인",
    );
  }

  cached = parsed.data;
  return cached;
}

// Proxy로 env.X 형태 접근 모두 lazy load 거치게.
export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    return loadEnv()[prop as keyof Env];
  },
});

// 부팅 시점에 빠르게 검증하고 싶으면 명시적으로 호출 (e.g. 진입 layout/route).
export function assertEnv(): Env {
  return loadEnv();
}
