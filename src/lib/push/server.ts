import "server-only";

import webpush, { type PushSubscription } from "web-push";

import { db } from "@/lib/db";
import { env } from "@/lib/env";

// VAPID 키가 설정돼 있을 때만 web-push 발송. 없으면 silent no-op (개발 환경).
let configured = false;
function configure() {
  if (configured) return true;
  if (!env.VAPID_PRIVATE_KEY || !env.NEXT_PUBLIC_VAPID_PUBLIC_KEY) {
    return false;
  }
  webpush.setVapidDetails(
    env.VAPID_SUBJECT ?? "mailto:noreply@example.com",
    env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
    env.VAPID_PRIVATE_KEY,
  );
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string; // 알림 클릭 시 이동할 경로 (default /home)
};

type StoredSub = { id: string; endpoint: string; p256dh: string; auth: string };

async function sendOne(sub: StoredSub, payload: PushPayload): Promise<{
  ok: boolean;
  gone: boolean;
}> {
  const sdkSub: PushSubscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  };
  try {
    await webpush.sendNotification(sdkSub, JSON.stringify(payload));
    return { ok: true, gone: false };
  } catch (err: unknown) {
    // 404/410: subscription 만료 → DB에서 제거 시그널
    const status =
      typeof err === "object" && err !== null && "statusCode" in err
        ? Number((err as { statusCode: unknown }).statusCode)
        : 0;
    if (status === 404 || status === 410) {
      return { ok: false, gone: true };
    }
    console.warn("push send failed:", status, err);
    return { ok: false, gone: false };
  }
}

// 학부모(Guardian) 한 명에게 — 그가 등록한 모든 device subscription에 fan-out.
export async function sendToGuardian(
  guardianId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!configure()) return { sent: 0, pruned: 0 };

  const subs = await db.pushSubscription.findMany({
    where: { guardianId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  const goneIds = subs.filter((_, i) => results[i].gone).map((s) => s.id);
  if (goneIds.length > 0) {
    await db.pushSubscription
      .deleteMany({ where: { id: { in: goneIds } } })
      .catch(() => {});
  }

  return {
    sent: results.filter((r) => r.ok).length,
    pruned: goneIds.length,
  };
}

// 한 OWNER(Staff) 한 명에게.
export async function sendToStaff(
  staffId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!configure()) return { sent: 0, pruned: 0 };

  const subs = await db.staffPushSubscription.findMany({
    where: { staffId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
  if (subs.length === 0) return { sent: 0, pruned: 0 };

  const results = await Promise.all(subs.map((s) => sendOne(s, payload)));
  const goneIds = subs.filter((_, i) => results[i].gone).map((s) => s.id);
  if (goneIds.length > 0) {
    await db.staffPushSubscription
      .deleteMany({ where: { id: { in: goneIds } } })
      .catch(() => {});
  }

  return {
    sent: results.filter((r) => r.ok).length,
    pruned: goneIds.length,
  };
}

// org의 모든 OWNER에게 fan-out (결석 신청 알림 등). orgId 멀티테넌시 안전.
export async function sendToOwnersOfOrg(
  orgId: string,
  payload: PushPayload,
): Promise<{ sent: number; pruned: number }> {
  if (!configure()) return { sent: 0, pruned: 0 };

  const owners = await db.staff.findMany({
    where: { orgId, role: "OWNER" },
    select: { id: true },
  });

  let sent = 0;
  let pruned = 0;
  for (const o of owners) {
    const r = await sendToStaff(o.id, payload);
    sent += r.sent;
    pruned += r.pruned;
  }
  return { sent, pruned };
}
