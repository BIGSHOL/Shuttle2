import "server-only";

import { env } from "@/lib/env";

import { getCurrentUser, type CurrentUser } from "./session";

// W24: 셔틀이 플랫폼 매니저 — ENV 화이트리스트(`SHUTTLEE_ADMIN_EMAILS`).
// 베타 1~3명 운영자만 / 베타 후 DB role 마이그레이션. requireOwner와 같은
// 패턴 — throw → layout이 redirect 처리.

let cached: Set<string> | null = null;

function parseAdminEmails(): Set<string> {
  if (cached) return cached;
  const raw = env.SHUTTLEE_ADMIN_EMAILS ?? "";
  const set = new Set(
    raw
      .split(",")
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 0 && s.includes("@")),
  );
  cached = set;
  return set;
}

export function isShuttleAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  return parseAdminEmails().has(email.trim().toLowerCase());
}

// /admin/* 진입 시 호출. layout이 redirect로 처리.
// 매니저는 staff.role을 가지지 않을 수도 있어 user 자체가 null인 케이스도 OK.
// 단, 셔틀이 매니저는 어딘가의 staff 계정으로 로그인되어야 email을 식별 가능.
// 베타에선 매니저 본인이 데모 학원 OWNER 계정 보유 — getCurrentUser가 통과.
export async function requireShuttleAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error("UNAUTHENTICATED");
  }
  if (!isShuttleAdmin(user.email)) {
    throw new Error("FORBIDDEN: SHUTTLEE_ADMIN required");
  }
  return user;
}
