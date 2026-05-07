// 영문 Supabase·fetch 에러 메시지 → 한글 변환.
//
// 사용자에게 노출되는 모든 catch에서 사용. CLAUDE.md "사용자 노출 영어 광범위
// 한글화" 규약 대응. 이미 한글이면 그대로, 알려진 영문 패턴이면 자연스러운
// 한글로, 그 외엔 generic 한글 fallback (영문 노출 안 됨).
//
// 베타 운영 중 매핑 안 된 영문이 발견되면 KOREAN_BY_MESSAGE에 추가 → 다음
// RN 빌드.

const KOREAN_BY_MESSAGE: Record<string, string> = {
  // Supabase Auth (signInWithPassword / signUp / resetPasswordForEmail / updateUser)
  "Invalid login credentials": "아이디 또는 비밀번호가 올바르지 않습니다",
  "Email not confirmed": "이메일 인증이 필요합니다",
  "User already registered": "이미 등록된 계정입니다",
  "User not found": "계정을 찾을 수 없습니다",
  "Email rate limit exceeded":
    "요청이 너무 많습니다. 잠시 후 다시 시도해 주세요",
  "Token has expired or is invalid":
    "인증 링크가 만료되었거나 유효하지 않습니다",
  "Password should be at least 6 characters":
    "비밀번호는 6자 이상이어야 합니다",
  "Auth session missing!":
    "로그인 세션이 만료되었습니다. 다시 로그인해 주세요",
  "Invalid email": "이메일 형식이 올바르지 않습니다",
  "New password should be different from the old password.":
    "새 비밀번호는 이전 비밀번호와 달라야 합니다",
  "Signup is disabled": "지금은 가입할 수 없습니다",
  "Anonymous sign-ins are disabled": "익명 로그인은 지원하지 않습니다",

  // Network / fetch
  "Network request failed": "네트워크 연결을 확인해 주세요",
  "Failed to fetch": "서버에 연결할 수 없습니다",
  "Network Error": "네트워크 연결을 확인해 주세요",
};

const HANGUL_REGEX = /[가-힯]/;
const GENERIC_FALLBACK = "처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요";

// 영문/한글/unknown 어떤 입력이든 안전하게 한글 메시지로 변환.
// - 이미 한글 포함이면 trim 후 그대로 (서버에서 내려준 한글 에러 보존)
// - 매핑 표에 exact match 또는 substring 포함이면 매핑된 한글
// - 그 외 영문이면 GENERIC_FALLBACK
export function translateError(input: unknown): string {
  if (typeof input === "string") return translateMessage(input);
  if (input instanceof Error) return translateMessage(input.message);
  if (
    input &&
    typeof input === "object" &&
    "message" in input &&
    typeof (input as { message: unknown }).message === "string"
  ) {
    return translateMessage((input as { message: string }).message);
  }
  return GENERIC_FALLBACK;
}

function translateMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return GENERIC_FALLBACK;

  // 한글 포함이면 서버에서 이미 한글로 보낸 메시지 — 그대로 사용.
  if (HANGUL_REGEX.test(trimmed)) return trimmed;

  // exact match
  const exact = KOREAN_BY_MESSAGE[trimmed];
  if (exact) return exact;

  // substring match — Supabase가 메시지 형식을 가끔 바꾸거나 prefix·suffix가
  // 추가될 때 대비.
  for (const [pattern, korean] of Object.entries(KOREAN_BY_MESSAGE)) {
    if (trimmed.includes(pattern)) return korean;
  }

  // 영문 fallback — 사용자에게는 generic 한글, 개발자는 console.error로 확인.
  return GENERIC_FALLBACK;
}
