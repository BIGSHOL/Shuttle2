// Supabase JS SDK — RN용 셋업.
// AsyncStorage로 세션 토큰 영구 저장 → 앱 재시작 시 자동 로그인.
// detectSessionInUrl: false — RN은 URL hash session detect 불필요 (브라우저용 OAuth flow).
//
// 주의: 모듈 로드 시점에 throw하면 JS 번들 첫 require에서 unhandled exception →
// React 트리 마운트 전에 시스템 splash가 그대로 멈춰 흰 화면이 된다.
// 따라서 ENV 미설정도 throw 대신 isSupabaseConfigured 플래그를 export해
// App.tsx가 사용자에게 명확한 에러 화면을 보여주도록 한다 (defense-in-depth).
// EAS 빌드 시 eas.json의 env 블록이 EXPO_PUBLIC_*를 metro 번들에 인라인.

import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import Constants from "expo-constants";

type Extras = {
  EXPO_PUBLIC_SUPABASE_URL?: string;
  EXPO_PUBLIC_SUPABASE_ANON_KEY?: string;
};

const extras = (Constants.expoConfig?.extra ?? {}) as Extras;

const SUPABASE_URL =
  extras.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "";
const SUPABASE_ANON_KEY =
  extras.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
  "";

export const isSupabaseConfigured =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

if (!isSupabaseConfigured) {
  // throw 금지. 콘솔에만 기록.
  console.error(
    "[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY 미설정. " +
      "EAS 빌드의 eas.json `env` 블록 또는 EAS Secret으로 주입 필요.",
  );
}

// 미설정 시 placeholder URL/key로 createClient 호출 — 모듈 로드는 성공하고,
// 실제 auth 호출에서만 fetch 실패. App.tsx가 isSupabaseConfigured로 사전 차단.
export const supabase = createClient(
  SUPABASE_URL || "https://invalid.supabase.co",
  SUPABASE_ANON_KEY || "invalid-anon-key",
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
);
