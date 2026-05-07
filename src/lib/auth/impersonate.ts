import "server-only";

import { createHmac, timingSafeEqual } from "crypto";

import { cookies } from "next/headers";

import { env } from "@/lib/env";

// W24: 매니저 impersonation cookie. HMAC-signed payload `{orgId, adminEmail, ts}`.
// Cookie 노출 시 secret 모르면 위변조 불가.

const COOKIE_NAME = "shuttlee_impersonate_org";
const MAX_AGE_SECONDS = 60 * 60 * 4; // 4시간 (장시간 세션 자동 만료)

type ImpersonatePayload = {
  orgId: string;
  adminEmail: string;
  ts: number;
};

function sign(value: string): string {
  const secret = env.IMPERSONATE_COOKIE_SECRET;
  if (!secret) throw new Error("IMPERSONATE_COOKIE_SECRET not set");
  return createHmac("sha256", secret).update(value).digest("hex");
}

function verify(value: string, sig: string): boolean {
  try {
    const expected = sign(value);
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(sig, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function setImpersonateCookie(
  orgId: string,
  adminEmail: string,
): Promise<void> {
  const payload: ImpersonatePayload = { orgId, adminEmail, ts: Date.now() };
  const value = Buffer.from(JSON.stringify(payload), "utf8").toString(
    "base64url",
  );
  const sig = sign(value);
  const cookie = `${value}.${sig}`;
  const store = await cookies();
  store.set(COOKIE_NAME, cookie, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SECONDS,
    path: "/",
  });
}

export async function readImpersonateCookie(): Promise<ImpersonatePayload | null> {
  const store = await cookies();
  const raw = store.get(COOKIE_NAME)?.value;
  if (!raw) return null;
  const [value, sig] = raw.split(".");
  if (!value || !sig) return null;
  if (!verify(value, sig)) return null;
  try {
    const json = Buffer.from(value, "base64url").toString("utf8");
    const parsed = JSON.parse(json) as ImpersonatePayload;
    if (
      typeof parsed.orgId !== "string" ||
      typeof parsed.adminEmail !== "string" ||
      typeof parsed.ts !== "number"
    ) {
      return null;
    }
    // 만료 체크 (cookie maxAge로 브라우저가 처리하지만 server에서도 한 번 더)
    if (Date.now() - parsed.ts > MAX_AGE_SECONDS * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function clearImpersonateCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
