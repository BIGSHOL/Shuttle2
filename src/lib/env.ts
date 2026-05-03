import { z } from "zod";

// SUPABASE_SERVICE_ROLE_KEY는 서버 코드에서만 import할 것 (클라이언트 번들 노출 금지).
// W6+ server-only 분리 리팩터 예정.
const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().url(),
  DIRECT_URL: z.string().url(),
  NEXT_PUBLIC_KAKAO_MAP_KEY: z.string().min(1),
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
