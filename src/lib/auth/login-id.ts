// 로그인 식별자 유틸 — 이메일 vs 로그인 아이디(loginId).
//
// Supabase Auth는 username을 직접 지원하지 않아 loginId를 placeholder 이메일로
// 매핑(`${loginId}@shuttlee.local`). RFC 6762에 따라 .local TLD는 mDNS 예약이라
// 실제 SMTP 라우팅이 일어날 수 없어 외부 발송 위험 0.
//
// 입력 정책:
// - 영문 소문자·숫자·언더스코어만, 4~20자
// - 학원장 발급 시 자동 추천 가능 (이름 영문화 + 4자리 랜덤)
// - 사용자 본인이 직접 선택할 수도 있음 (충돌 검증은 DB unique)

export const LOGIN_ID_REGEX = /^[a-z0-9_]{4,20}$/;
export const LOGIN_ID_PLACEHOLDER_DOMAIN = "@shuttlee.local";

export function isValidLoginId(input: string): boolean {
  return LOGIN_ID_REGEX.test(input);
}

// loginId → Supabase Auth에 저장될 placeholder 이메일.
// 항상 소문자로 정규화해 대소문자 충돌 방지.
export function loginIdToEmail(loginId: string): string {
  return `${loginId.toLowerCase()}${LOGIN_ID_PLACEHOLDER_DOMAIN}`;
}

// 로그인 폼은 입력 1개로 통합. `@` 포함 → 이메일, 아니면 loginId.
export function isLikelyEmail(input: string): boolean {
  return input.includes("@");
}

// 임시 비밀번호 6자리 (학원장이 직원·학부모 비번 초기화 시 1회 발급).
// 영문 대소문자·숫자, 헷갈리는 0/O/1/l/I 제외.
const TEMP_PASSWORD_ALPHABET =
  "23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ";
export function generateTempPassword(length = 8): string {
  let out = "";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < length; i++) {
    out += TEMP_PASSWORD_ALPHABET[bytes[i] % TEMP_PASSWORD_ALPHABET.length];
  }
  return out;
}

// 학원장이 발급할 loginId 자동 추천 — 이름 영문화 + 4자리 랜덤 suffix.
// 한국어 이름은 그대로 영문화 못하니 staff/guardian 본인이 적절히 선택해야 함.
// 일단 4자리 랜덤만 제안 (충돌 시 사용자가 직접 수정).
export function suggestLoginId(seed?: string): string {
  const base = (seed ?? "user")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12);
  const ascii = base.length >= 3 ? base : "user";
  const suffix = Math.floor(1000 + Math.random() * 9000).toString();
  return `${ascii}${suffix}`;
}
